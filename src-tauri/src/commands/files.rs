use crate::errors::CommandError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
pub struct DirectoryFileItem {
    pub name: String,
    pub path: String,
    pub extension: Option<String>,
    pub size: u64,
}

#[derive(Debug, Deserialize)]
pub struct RenameOperation {
    pub old_name: String,
    pub new_name: String,
}

#[derive(Debug, Serialize)]
pub struct RenameResultItem {
    pub old_name: String,
    pub new_name: String,
    pub ok: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct FileSearchResult {
    pub path: String,
    pub line_number: usize,
    pub line_text: String,
}

fn normalize_directory(path: &str) -> Result<PathBuf, CommandError> {
    let directory = PathBuf::from(path);
    if !directory.is_dir() {
        return Err(CommandError::new(
            "DIRECTORY_NOT_FOUND",
            "目录不存在或不是有效目录",
        ));
    }
    Ok(directory)
}

fn file_name_only(value: &str) -> bool {
    let path = Path::new(value);
    path.file_name().and_then(|name| name.to_str()) == Some(value)
}

fn wildcard_matches(pattern: &str, value: &str) -> bool {
    let pattern = pattern.as_bytes();
    let value = value.as_bytes();
    let mut pattern_index = 0;
    let mut value_index = 0;
    let mut star_index: Option<usize> = None;
    let mut match_index = 0;

    while value_index < value.len() {
        if pattern_index < pattern.len()
            && (pattern[pattern_index] == b'?' || pattern[pattern_index] == value[value_index])
        {
            pattern_index += 1;
            value_index += 1;
        } else if pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
            star_index = Some(pattern_index);
            match_index = value_index;
            pattern_index += 1;
        } else if let Some(star) = star_index {
            pattern_index = star + 1;
            match_index += 1;
            value_index = match_index;
        } else {
            return false;
        }
    }

    while pattern_index < pattern.len() && pattern[pattern_index] == b'*' {
        pattern_index += 1;
    }

    pattern_index == pattern.len()
}

fn collect_files(
    root: &Path,
    patterns: &[String],
    results: &mut Vec<PathBuf>,
    max_files: usize,
) -> Result<(), CommandError> {
    if results.len() >= max_files {
        return Ok(());
    }

    for entry in fs::read_dir(root)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            collect_files(&path, patterns, results, max_files)?;
        } else if file_type.is_file() {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if patterns.is_empty() || patterns.iter().any(|pattern| wildcard_matches(pattern, &file_name)) {
                results.push(path);
                if results.len() >= max_files {
                    return Ok(());
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn list_directory_files(directory_path: String) -> Result<Vec<DirectoryFileItem>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = normalize_directory(&directory_path)?;
        let mut files = Vec::new();

        for entry in fs::read_dir(&directory)? {
            let entry = entry?;
            let file_type = entry.file_type()?;
            if !file_type.is_file() {
                continue;
            }

            let path = entry.path();
            let metadata = entry.metadata()?;
            let name = entry.file_name().to_string_lossy().to_string();
            let extension = path.extension().and_then(|value| value.to_str()).map(str::to_string);
            files.push(DirectoryFileItem {
                name,
                path: path.to_string_lossy().to_string(),
                extension,
                size: metadata.len(),
            });
        }

        files.sort_by(|left, right| left.name.cmp(&right.name));
        Ok(files)
    })
    .await
    .map_err(|_| CommandError::new("LIST_DIRECTORY_CANCELLED", "读取目录任务已取消"))?
}

#[tauri::command]
pub async fn apply_batch_rename(
    directory_path: String,
    operations: Vec<RenameOperation>,
) -> Result<Vec<RenameResultItem>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = normalize_directory(&directory_path)?;
        let mut results = Vec::new();

        for operation in operations {
            if !file_name_only(&operation.old_name) || !file_name_only(&operation.new_name) {
                results.push(RenameResultItem {
                    old_name: operation.old_name,
                    new_name: operation.new_name,
                    ok: false,
                    message: "文件名不能包含路径分隔符".to_string(),
                });
                continue;
            }

            let source = directory.join(&operation.old_name);
            let target = directory.join(&operation.new_name);

            if !source.is_file() {
                results.push(RenameResultItem {
                    old_name: operation.old_name,
                    new_name: operation.new_name,
                    ok: false,
                    message: "源文件不存在".to_string(),
                });
                continue;
            }

            if target.exists() && source != target {
                results.push(RenameResultItem {
                    old_name: operation.old_name,
                    new_name: operation.new_name,
                    ok: false,
                    message: "目标文件已存在".to_string(),
                });
                continue;
            }

            match fs::rename(&source, &target) {
                Ok(()) => results.push(RenameResultItem {
                    old_name: operation.old_name,
                    new_name: operation.new_name,
                    ok: true,
                    message: "已重命名".to_string(),
                }),
                Err(error) => results.push(RenameResultItem {
                    old_name: operation.old_name,
                    new_name: operation.new_name,
                    ok: false,
                    message: error.to_string(),
                }),
            }
        }

        Ok(results)
    })
    .await
    .map_err(|_| CommandError::new("BATCH_RENAME_CANCELLED", "批量重命名任务已取消"))?
}

#[tauri::command]
pub async fn search_file_contents(
    root_path: String,
    query: String,
    patterns: Vec<String>,
    max_results: usize,
) -> Result<Vec<FileSearchResult>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = normalize_directory(&root_path)?;
        let query = query.trim().to_string();
        if query.is_empty() {
            return Ok(Vec::new());
        }

        let patterns = patterns
            .into_iter()
            .map(|pattern| pattern.trim().to_string())
            .filter(|pattern| !pattern.is_empty())
            .collect::<Vec<_>>();
        let mut files = Vec::new();
        collect_files(&root, &patterns, &mut files, 20_000)?;

        let max_results = max_results.clamp(1, 1_000);
        let mut results = Vec::new();

        for file in files {
            let Ok(content) = fs::read_to_string(&file) else {
                continue;
            };

            for (index, line) in content.lines().enumerate() {
                if line.contains(&query) {
                    results.push(FileSearchResult {
                        path: file.to_string_lossy().to_string(),
                        line_number: index + 1,
                        line_text: line.trim().to_string(),
                    });

                    if results.len() >= max_results {
                        return Ok(results);
                    }
                }
            }
        }

        Ok(results)
    })
    .await
    .map_err(|_| CommandError::new("FILE_SEARCH_CANCELLED", "文件内容搜索任务已取消"))?
}
