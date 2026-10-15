use crate::{errors::CommandError, storage};
use serde::Serialize;
use std::{
    fs::{self, File, OpenOptions},
    io,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

static BACKUP_LOCK: Mutex<()> = Mutex::new(());
static NEXT_ID: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupFile {
    pub id: String,
    pub name: String,
    pub size: u64,
    /// 文件系统的创建时间，使用 Unix 毫秒供前端格式化显示。
    pub created_at: u64,
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 100
        && id
            .bytes()
            .all(|value| value.is_ascii_hexdigit() || value == b'-')
}

fn unique_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!(
        "{timestamp:x}-{:x}-{:x}",
        std::process::id(),
        NEXT_ID.fetch_add(1, Ordering::Relaxed)
    )
}

fn backup_root(directory: &Path, create: bool) -> Result<PathBuf, CommandError> {
    let directory = fs::canonicalize(directory)?;
    let root = directory.join("backups");
    if !root.try_exists()? {
        if create {
            fs::create_dir(&root)?;
        } else {
            return Ok(root);
        }
    }
    let metadata = fs::symlink_metadata(&root)?;
    if !metadata.is_dir() || metadata.file_type().is_symlink() {
        return Err(CommandError::new(
            "BACKUP_DIRECTORY_INVALID",
            "备份目录必须是数据目录下的普通文件夹",
        ));
    }
    let resolved = fs::canonicalize(&root)?;
    if resolved.parent() != Some(directory.as_path()) {
        return Err(CommandError::new(
            "BACKUP_DIRECTORY_INVALID",
            "备份目录不能链接到数据目录外",
        ));
    }
    Ok(resolved)
}

fn read_entry(root: &Path, id: &str) -> Result<Option<(BackupFile, PathBuf)>, CommandError> {
    if !valid_id(id) {
        return Err(CommandError::new("INVALID_BACKUP_ID", "备份编号无效"));
    }
    let directory = root.join(id);
    let metadata = fs::symlink_metadata(&directory)?;
    if !metadata.is_dir()
        || metadata.file_type().is_symlink()
        || fs::canonicalize(&directory)?.parent() != Some(root)
    {
        return Err(CommandError::new(
            "BACKUP_RECORD_INVALID",
            "备份目录异常，原文件已保留",
        ));
    }
    let mut entries = fs::read_dir(&directory)?;
    let Some(entry) = entries.next() else {
        return Ok(None);
    };
    let entry = entry?;
    let metadata = fs::symlink_metadata(entry.path())?;
    if entries.next().is_some() || !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err(CommandError::new(
            "BACKUP_RECORD_INVALID",
            "备份目录内容异常，原文件已保留，请打开备份目录检查",
        ));
    }
    let created_at = metadata
        .created()
        .or_else(|_| metadata.modified())
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    Ok(Some((
        BackupFile {
            id: id.to_owned(),
            name: entry.file_name().to_string_lossy().into_owned(),
            size: metadata.len(),
            created_at: created_at.min(u64::MAX as u128) as u64,
        },
        entry.path(),
    )))
}

fn read_backups(directory: &Path) -> Result<Vec<BackupFile>, CommandError> {
    let root = backup_root(directory, false)?;
    if !root.try_exists()? {
        return Ok(Vec::new());
    }
    let mut files = Vec::new();
    for entry in fs::read_dir(&root)? {
        let entry = entry?;
        let name = entry.file_name();
        let Some(id) = name.to_str().filter(|id| valid_id(id)) else {
            continue;
        };
        // 忽略未完成复制及用户自行放入的其他文件，不重写索引、不删除未知内容。
        if let Some((file, _)) = read_entry(&root, id)? {
            files.push(file);
        }
    }
    files.sort_by(|left, right| {
        right
            .created_at
            .cmp(&left.created_at)
            .then_with(|| right.id.cmp(&left.id))
    });
    Ok(files)
}

// 全程流式复制；排他创建目标，任何失败只清理本次创建的副本。
fn copy_new_file(source: &Path, destination: &Path) -> Result<u64, CommandError> {
    let mut input = File::open(source)?;
    if !input.metadata()?.is_file() {
        return Err(CommandError::new(
            "BACKUP_SOURCE_INVALID",
            "请选择普通文件进行备份",
        ));
    }
    let mut output = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(destination)?;
    let result = io::copy(&mut input, &mut output).and_then(|size| {
        output.sync_all()?;
        Ok(size)
    });
    drop(output);
    match result {
        Ok(size) => Ok(size),
        Err(error) => {
            let _ = fs::remove_file(destination);
            Err(error.into())
        }
    }
}

fn add_file(root: &Path, source: &Path) -> Result<String, CommandError> {
    let name = source
        .file_name()
        .ok_or_else(|| CommandError::new("BACKUP_SOURCE_INVALID", "文件名无效"))?;
    let id = unique_id();
    let pending = root.join(format!(".pending-{id}"));
    fs::create_dir(&pending)?;
    let copied = pending.join(name);
    let result = (|| {
        copy_new_file(source, &copied)?;
        // 一个备份一个目录，同名文件分别保留；复制完成后才出现在备份列表中。
        fs::rename(&pending, root.join(&id))?;
        Ok(id)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&copied);
        let _ = fs::remove_dir(&pending);
    }
    result
}

fn remove_entry(root: &Path, id: &str) -> Result<(), CommandError> {
    let (_, source) = read_entry(root, id)?
        .ok_or_else(|| CommandError::new("BACKUP_NOT_FOUND", "备份文件不存在"))?;
    fs::remove_file(source)?;
    // 文件删除成功后，空目录清理失败不会影响其他备份或原文件。
    let _ = fs::remove_dir(root.join(id));
    Ok(())
}

fn add_files(directory: &Path, sources: &[PathBuf]) -> Result<Vec<BackupFile>, CommandError> {
    read_backups(directory)?;
    if sources.is_empty() {
        return read_backups(directory);
    }
    let root = backup_root(directory, true)?;
    let mut created = Vec::new();
    for source in sources {
        match add_file(&root, source) {
            Ok(id) => created.push(id),
            Err(error) => {
                // 一个批次失败时撤销已创建的副本，已有备份及用户原文件始终保留。
                for id in created {
                    let _ = remove_entry(&root, &id);
                }
                return Err(error);
            }
        }
    }
    match read_backups(directory) {
        Ok(files) => Ok(files),
        Err(error) => {
            for id in created {
                let _ = remove_entry(&root, &id);
            }
            Err(error)
        }
    }
}

#[tauri::command]
pub async fn load_backups(app: tauri::AppHandle) -> Result<Vec<BackupFile>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = BACKUP_LOCK
            .lock()
            .map_err(|_| CommandError::new("BACKUP_BUSY", "备份管理暂不可用，请重启应用"))?;
        let db = storage::open_connection(&app)?;
        read_backups(&db.directory)
    })
    .await
    .map_err(|error| CommandError::new("BACKUP_TASK_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn add_backup_files(app: tauri::AppHandle) -> Result<Vec<BackupFile>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new().set_title("选择需要保存的备份文件（支持所有格式）");
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let files = dialog.pick_files();
        let _guard = BACKUP_LOCK
            .lock()
            .map_err(|_| CommandError::new("BACKUP_BUSY", "备份管理暂不可用，请重启应用"))?;
        // Database 读锁保留到全部复制结束，数据迁移不能在中途切换目录。
        let db = storage::open_connection(&app)?;
        add_files(&db.directory, &files.unwrap_or_default())
    })
    .await
    .map_err(|error| CommandError::new("BACKUP_TASK_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn export_backup_file(
    app: tauri::AppHandle,
    id: String,
) -> Result<Option<String>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = BACKUP_LOCK
            .lock()
            .map_err(|_| CommandError::new("BACKUP_BUSY", "备份管理暂不可用，请重启应用"))?;
        let db = storage::open_connection(&app)?;
        let root = backup_root(&db.directory, false)?;
        let (file, source) = read_entry(&root, &id)?
            .ok_or_else(|| CommandError::new("BACKUP_NOT_FOUND", "备份文件不存在"))?;
        let mut dialog = rfd::FileDialog::new()
            .set_title("导出备份（请选择未存在的文件名）")
            .set_directory(db.directory.parent().unwrap_or(&db.directory))
            .set_file_name(&file.name);
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let Some(target) = dialog.save_file() else {
            return Ok(None);
        };
        storage::location::validate_storage_path(&target)?;
        let parent = target
            .parent()
            .ok_or_else(|| CommandError::new("INVALID_PATH", "请选择有效的导出位置"))?;
        if fs::canonicalize(parent)?.starts_with(fs::canonicalize(&db.directory)?) {
            return Err(CommandError::new(
                "BACKUP_EXPORT_INTERNAL",
                "请选择数据目录以外的位置导出备份",
            ));
        }
        if target.try_exists()? {
            return Err(CommandError::new(
                "BACKUP_EXPORT_EXISTS",
                "目标文件已存在，请选择其他文件名以保留已有文件",
            ));
        }
        copy_new_file(&source, &target)?;
        Ok(Some(storage::location::display_path(&target)))
    })
    .await
    .map_err(|error| CommandError::new("BACKUP_TASK_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn delete_backup_file(
    app: tauri::AppHandle,
    id: String,
) -> Result<Vec<BackupFile>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = BACKUP_LOCK
            .lock()
            .map_err(|_| CommandError::new("BACKUP_BUSY", "备份管理暂不可用，请重启应用"))?;
        let db = storage::open_connection(&app)?;
        read_backups(&db.directory)?;
        let root = backup_root(&db.directory, false)?;
        remove_entry(&root, &id)?;
        read_backups(&db.directory)
    })
    .await
    .map_err(|error| CommandError::new("BACKUP_TASK_FAILED", error.to_string()))?
}

#[tauri::command]
pub async fn open_backup_directory(app: tauri::AppHandle) -> Result<(), CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = BACKUP_LOCK
            .lock()
            .map_err(|_| CommandError::new("BACKUP_BUSY", "备份管理暂不可用，请重启应用"))?;
        let db = storage::open_connection(&app)?;
        let directory = backup_root(&db.directory, true)?;
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            std::process::Command::new("explorer.exe")
                .arg(storage::location::display_path(&directory))
                .creation_flags(0x08000000)
                .spawn()?;
        }
        #[cfg(target_os = "macos")]
        std::process::Command::new("open").arg(&directory).spawn()?;
        #[cfg(all(unix, not(target_os = "macos")))]
        std::process::Command::new("xdg-open")
            .arg(&directory)
            .spawn()?;
        Ok(())
    })
    .await
    .map_err(|error| CommandError::new("BACKUP_TASK_FAILED", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TestDirectory(PathBuf);
    impl TestDirectory {
        fn new() -> Self {
            let target = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target");
            fs::create_dir_all(&target).unwrap();
            let root = target.join(format!("quickbox-backups-{}", unique_id()));
            fs::create_dir(&root).unwrap();
            Self(root)
        }
        fn data(&self) -> PathBuf {
            let directory = self.0.join("data");
            fs::create_dir_all(&directory).unwrap();
            directory
        }
    }
    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let root = self.0.canonicalize().unwrap();
            assert_eq!(
                root.parent().unwrap(),
                PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                    .join("target")
                    .canonicalize()
                    .unwrap()
            );
            assert!(root
                .file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("quickbox-backups-"));
            fs::remove_dir_all(root).unwrap();
        }
    }

    #[test]
    fn arbitrary_binary_over_twenty_megabytes_round_trips_without_parsing() {
        let test = TestDirectory::new();
        let directory = test.data();
        let source = test.0.join("任意备份.private-format");
        let mut bytes = vec![0u8; 20 * 1024 * 1024 + 257];
        for (index, byte) in bytes.iter_mut().enumerate() {
            *byte = (index % 256) as u8;
        }
        fs::write(&source, &bytes).unwrap();
        let items = add_files(&directory, &[source.clone()]).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].size, bytes.len() as u64);
        assert_eq!(items[0].name, "任意备份.private-format");
        let root = backup_root(&directory, false).unwrap();
        let (_, saved) = read_entry(&root, &items[0].id).unwrap().unwrap();
        let destination = test.0.join("导出.private-format");
        copy_new_file(&saved, &destination).unwrap();
        assert_eq!(fs::read(&destination).unwrap(), bytes);
        remove_entry(&root, &items[0].id).unwrap();
        assert!(read_backups(&directory).unwrap().is_empty());
        assert_eq!(fs::read(&source).unwrap(), bytes);
    }

    #[test]
    fn same_names_keep_independent_original_copies() {
        let test = TestDirectory::new();
        let directory = test.data();
        let first = test.0.join("first");
        let second = test.0.join("second");
        fs::create_dir(&first).unwrap();
        fs::create_dir(&second).unwrap();
        fs::write(first.join("backup.zip"), [0, 1, 255]).unwrap();
        fs::write(second.join("backup.zip"), [7, 8]).unwrap();
        let files = add_files(
            &directory,
            &[first.join("backup.zip"), second.join("backup.zip")],
        )
        .unwrap();
        assert_eq!(files.len(), 2);
        assert_ne!(files[0].id, files[1].id);
        assert!(files.iter().all(|file| file.name == "backup.zip"));
        let mut sizes: Vec<_> = files.iter().map(|file| file.size).collect();
        sizes.sort();
        assert_eq!(sizes, [2, 3]);
    }

    #[test]
    fn path_traversal_is_rejected_and_listing_does_not_create_directories() {
        let test = TestDirectory::new();
        let directory = test.data();
        assert!(read_backups(&directory).unwrap().is_empty());
        assert!(!directory.join("backups").exists());
        for id in [
            "",
            ".",
            "..",
            "../escape",
            "a/b",
            "a\\b",
            "C:\\backup",
            "/backup",
            "a:stream",
            "a.",
        ] {
            assert!(read_entry(&directory, id).is_err(), "accepted {id}");
        }
    }

    #[test]
    fn failed_batch_and_export_preserve_original_files_and_existing_backups() {
        let test = TestDirectory::new();
        let directory = test.data();
        let source = test.0.join("original.bin");
        fs::write(&source, [0, 255, 17]).unwrap();
        let previous = add_files(&directory, &[source.clone()]).unwrap();
        assert!(add_files(&directory, &[source.clone(), test.0.join("missing")]).is_err());
        let files = read_backups(&directory).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].id, previous[0].id);
        assert_eq!(fs::read(&source).unwrap(), [0, 255, 17]);
        let target = test.0.join("existing.bin");
        fs::write(&target, [99]).unwrap();
        assert!(copy_new_file(&source, &target).is_err());
        assert_eq!(fs::read(&target).unwrap(), [99]);
    }

    #[test]
    fn unexpected_record_contents_are_preserved() {
        let test = TestDirectory::new();
        let directory = test.data();
        let source = test.0.join("backup.tar");
        fs::write(&source, [1, 2, 3]).unwrap();
        let files = add_files(&directory, &[source]).unwrap();
        let root = backup_root(&directory, false).unwrap();
        let extra = root.join(&files[0].id).join("unexpected.bin");
        fs::write(&extra, [7, 8, 9]).unwrap();
        assert!(read_backups(&directory).is_err());
        assert!(remove_entry(&root, &files[0].id).is_err());
        assert_eq!(fs::read(extra).unwrap(), [7, 8, 9]);
        assert_eq!(
            fs::read(root.join(&files[0].id).join("backup.tar")).unwrap(),
            [1, 2, 3]
        );
    }
}
