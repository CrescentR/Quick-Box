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
    !value.is_empty() && value != "." && value != ".."
        && !value.chars().any(|c| c.is_control() || "/\\:<>\"|?*".contains(c))
        && !value.ends_with('.') && !value.ends_with(' ')
        && path.file_name().and_then(|name| name.to_str()) == Some(value)
}

pub(super) fn wildcard_matches(pattern: &str, value: &str) -> bool {
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
        preflight_rename(&directory, &operations)?;
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

            match rename_without_overwrite(&source, &target) {
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


/// 同目录移动；Unix 用排他创建硬链接避免 rename 覆盖竞态。
fn rename_without_overwrite(source: &Path, target: &Path) -> std::io::Result<()> {
    if source == target { return Ok(()); }
    #[cfg(windows)]
    { fs::rename(source, target) }
    #[cfg(not(windows))]
    {
        fs::hard_link(source, target)?;
        if let Err(error) = fs::remove_file(source) {
            let _ = fs::remove_file(target);
            return Err(error);
        }
        Ok(())
    }
}

fn preflight_rename(directory: &Path, operations: &[RenameOperation]) -> Result<(), CommandError> {
    if operations.len() > 1000 { return Err(CommandError::new("RENAME_TOO_LARGE", "每批最多 1000 个文件")); }
    let mut sources = std::collections::HashSet::new();
    let mut targets = std::collections::HashSet::new();
    let key = |name: &str| if cfg!(windows) { name.to_lowercase() } else { name.to_string() };
    for operation in operations {
        if !file_name_only(&operation.old_name) || !file_name_only(&operation.new_name)
            || !sources.insert(key(&operation.old_name)) || !targets.insert(key(&operation.new_name)) {
            return Err(CommandError::new("RENAME_CONFLICT", "预检失败：文件名无效或批次中有重复源/目标，未执行任何修改"));
        }
        let source = directory.join(&operation.old_name);
        let target = directory.join(&operation.new_name);
        let regular = fs::symlink_metadata(&source).map(|m| m.file_type().is_file()).unwrap_or(false);
        if !regular || (target.exists() && source != target) {
            return Err(CommandError::new("RENAME_CONFLICT", "预检失败：源文件变化或目标已存在，请重新扫描；未执行任何修改"));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn refuses_path_traversal_and_duplicate_targets() {
        assert!(!file_name_only("../escape")); assert!(!file_name_only(".."));
        assert!(!file_name_only("a/b")); assert!(!file_name_only("C:\\x"));
        assert!(file_name_only("有效文件.txt"));
        assert!(wildcard_matches("*.ts", "file.ts"));
        let directory = std::env::temp_dir().join(format!("quickbox-rename-test-{}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join("a.txt"), "keep").unwrap();
        fs::write(directory.join("b.txt"), "keep too").unwrap();
        let operations = vec![RenameOperation { old_name: "a.txt".into(), new_name: "same.txt".into() }, RenameOperation { old_name: "b.txt".into(), new_name: "same.txt".into() }];
        assert!(preflight_rename(&directory, &operations).is_err());
        assert!(directory.join("a.txt").exists()); assert!(directory.join("b.txt").exists());
        assert_eq!(directory.parent().unwrap().canonicalize().unwrap(), std::env::temp_dir().canonicalize().unwrap());
        assert!(directory.file_name().unwrap().to_string_lossy().starts_with("quickbox-rename-test-"));
        fs::remove_dir_all(&directory).unwrap();
    }
}
