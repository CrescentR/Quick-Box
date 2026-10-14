use crate::errors::CommandError;
use serde::Serialize;
use std::{collections::HashMap, fs, io::Read, path::Path, sync::{Arc, Mutex, atomic::{AtomicBool, AtomicUsize, Ordering}}};
use super::files::FileSearchResult;

#[derive(Default)]
pub struct SearchJobs(Mutex<HashMap<String, Arc<Progress>>>);
#[derive(Default)]
struct Progress { cancelled: AtomicBool, scanned: AtomicUsize, skipped: AtomicUsize }
#[derive(Serialize)]
pub struct SearchProgress { scanned: usize, skipped: usize }
#[derive(Serialize)]
pub struct SearchReport { results: Vec<FileSearchResult>, scanned: usize, skipped: usize, cancelled: bool, truncated: bool }

#[tauri::command]
pub fn cancel_file_search(jobs: tauri::State<SearchJobs>, job_id: String) {
    if let Ok(jobs) = jobs.0.lock() {
        if let Some(job) = jobs.get(&job_id) { job.cancelled.store(true, Ordering::Relaxed); }
    }
}
#[tauri::command]
pub fn file_search_progress(jobs: tauri::State<SearchJobs>, job_id: String) -> Option<SearchProgress> {
    let jobs = jobs.0.lock().ok()?;
    let job = jobs.get(&job_id)?;
    Some(SearchProgress { scanned: job.scanned.load(Ordering::Relaxed), skipped: job.skipped.load(Ordering::Relaxed) })
}

fn search(root: &Path, query: &str, patterns: &[String], excluded: &[String], limit: usize, progress: &Progress) -> Result<SearchReport, CommandError> {
    if !root.is_dir() { return Err(CommandError::new("DIRECTORY_NOT_FOUND", "目录不存在")); }
    let mut pending = vec![(root.to_path_buf(), 0)];
    let mut results = Vec::new();
    let mut truncated = false;
    let mut entries_seen = 0usize;
    'scan: while let Some((directory, depth)) = pending.pop() {
        if progress.cancelled.load(Ordering::Relaxed) { break; }
        let entries = match fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(error) if directory == root => return Err(error.into()),
            Err(_) => { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; }
        };
        for entry in entries {
            if progress.cancelled.load(Ordering::Relaxed) { break 'scan; }
            entries_seen += 1;
            if entries_seen > 100_000 || progress.scanned.load(Ordering::Relaxed) >= 20_000 { truncated = true; break 'scan; }
            let Ok(entry) = entry else { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; };
            let Ok(kind) = entry.file_type() else { continue; };
            let name = entry.file_name().to_string_lossy().to_string();
            if kind.is_symlink() { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; }
            if kind.is_dir() {
                if excluded.iter().any(|item| item.eq_ignore_ascii_case(&name)) { continue; }
                if depth < 64 { pending.push((entry.path(), depth + 1)); } else { truncated = true; }
                continue;
            }
            if !kind.is_file() || (!patterns.is_empty() && !patterns.iter().any(|pattern| super::files::wildcard_matches(pattern, &name))) { continue; }
            progress.scanned.fetch_add(1, Ordering::Relaxed);
            let Ok(metadata) = entry.metadata() else { continue; };
            if metadata.len() > 2_000_000 { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; }
            let mut bytes = Vec::new();
            let read = fs::File::open(entry.path()).and_then(|file| file.take(2_000_001).read_to_end(&mut bytes));
            if read.is_err() || bytes.len() > 2_000_000 || bytes.contains(&0) { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; }
            let Ok(content) = String::from_utf8(bytes) else { progress.skipped.fetch_add(1, Ordering::Relaxed); continue; };
            for (index, line) in content.lines().enumerate() {
                if progress.cancelled.load(Ordering::Relaxed) { break 'scan; }
                if line.contains(query) {
                    results.push(FileSearchResult { path: entry.path().to_string_lossy().to_string(), line_number: index + 1, line_text: line.trim().chars().take(2000).collect() });
                    if results.len() >= limit { truncated = true; break 'scan; }
                }
            }
        }
    }
    Ok(SearchReport { results, scanned: progress.scanned.load(Ordering::Relaxed), skipped: progress.skipped.load(Ordering::Relaxed), cancelled: progress.cancelled.load(Ordering::Relaxed), truncated })
}

#[tauri::command]
pub async fn search_file_contents(jobs: tauri::State<'_, SearchJobs>, job_id: String, root_path: String, query: String, patterns: Vec<String>, excluded: Vec<String>, max_results: usize) -> Result<SearchReport, CommandError> {
    if job_id.len() > 100 || query.trim().is_empty() || query.len() > 10_000 || patterns.len() > 100 || excluded.len() > 100 {
        return Err(CommandError::new("INVALID_SEARCH", "搜索参数无效"));
    }
    let progress = Arc::new(Progress::default());
    {
        let mut map = jobs.0.lock().map_err(|_| CommandError::new("SEARCH_BUSY", "搜索状态不可用"))?;
        if map.len() >= 4 || map.contains_key(&job_id) { return Err(CommandError::new("SEARCH_BUSY", "已有搜索任务，请等待或取消")); }
        map.insert(job_id.clone(), progress.clone());
    }
    let result = tauri::async_runtime::spawn_blocking(move || search(Path::new(&root_path), &query, &patterns, &excluded, max_results.clamp(1, 1000), &progress)).await;
    if let Ok(mut map) = jobs.0.lock() { map.remove(&job_id); }
    result.map_err(|_| CommandError::new("FILE_SEARCH_FAILED", "搜索任务异常结束"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn excludes_directories_limits_results_and_obeys_cancellation() {
        let directory = std::env::temp_dir().join(format!("quickbox-search-test-{}", std::process::id()));
        fs::create_dir_all(directory.join("node_modules")).unwrap();
        fs::write(directory.join("source.ts"), "TODO first\nTODO second").unwrap();
        fs::write(directory.join("node_modules/hidden.ts"), "TODO hidden").unwrap();
        let report = search(&directory, "TODO", &["*.ts".into()], &["node_modules".into()], 10, &Progress::default()).unwrap();
        assert_eq!(report.results.len(), 2);
        let limited = search(&directory, "TODO", &[], &["node_modules".into()], 1, &Progress::default()).unwrap();
        assert!(limited.truncated);
        let progress = Progress::default(); progress.cancelled.store(true, Ordering::Relaxed);
        assert!(search(&directory, "TODO", &[], &[], 10, &progress).unwrap().cancelled);
        assert_eq!(directory.parent().unwrap().canonicalize().unwrap(), std::env::temp_dir().canonicalize().unwrap());
        assert!(directory.file_name().unwrap().to_string_lossy().starts_with("quickbox-search-test-"));
        fs::remove_dir_all(&directory).unwrap();
    }
}
