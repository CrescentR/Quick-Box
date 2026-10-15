use crate::errors::CommandError;
use rusqlite::{Connection, OpenFlags};
use serde::Serialize;
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use tauri::Manager;

const POINTER: &str = "storage-location.json";
const DATABASE: &str = "quickbox.sqlite3";
const FILE_DIRECTORIES: [&str; 2] = ["saved-files", "backups"];

pub fn installation_directory() -> Result<PathBuf, CommandError> {
    #[cfg(target_os = "linux")]
    if let Some(executable) = std::env::var_os("APPIMAGE") {
        if let Some(parent) = Path::new(&executable).parent() {
            return Ok(parent.to_path_buf());
        }
    }
    let executable = std::env::current_exe()?;
    executable
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| CommandError::new("INSTALL_PATH", "无法确定安装目录"))
}

pub fn display_path(path: &Path) -> String {
    let value = path.to_string_lossy();
    if let Some(rest) = value.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{}", rest)
    } else {
        value.strip_prefix(r"\\?\").unwrap_or(&value).to_string()
    }
}

fn is_c_drive(path: &Path) -> bool {
    let value = display_path(path).replace('/', "\\");
    value
        .get(..2)
        .is_some_and(|drive| drive.eq_ignore_ascii_case("c:"))
}

/// 所有写入目录必须是绝对路径；同时检查已存在祖先，防止 D 盘联接实际指向 C 盘。
pub fn validate_storage_path(path: &Path) -> Result<(), CommandError> {
    if is_c_drive(path) {
        return Err(CommandError::new(
            "C_DRIVE_FORBIDDEN",
            "不允许将数据保存到 C 盘，请选择其他磁盘的目录",
        ));
    }
    if !path.is_absolute() {
        return Err(CommandError::new(
            "INVALID_PATH",
            "请选择完整的绝对目录路径",
        ));
    }
    if let Some(existing) = path.ancestors().find(|ancestor| ancestor.exists()) {
        if is_c_drive(&fs::canonicalize(existing)?) {
            return Err(CommandError::new(
                "C_DRIVE_FORBIDDEN",
                "该目录实际指向 C 盘，请选择其他磁盘的目录",
            ));
        }
    }
    Ok(())
}

pub fn resolve_directory(install: &Path) -> Result<PathBuf, CommandError> {
    validate_storage_path(install)?;
    let pointer = install.join(POINTER);
    let path = if pointer.exists() {
        serde_json::from_slice::<PathBuf>(&fs::read(pointer)?).map_err(|_| {
            CommandError::new(
                "STORAGE_LOCATION_INVALID",
                "安装目录中的 storage-location.json 损坏，请恢复该文件",
            )
        })?
    } else {
        install.join("data")
    };
    validate_storage_path(&path)?;
    // 已配置的目录丢失时禁止创建空数据库，以免误以为原数据被清空。
    if install.join(POINTER).exists() && !path.join(DATABASE).is_file() {
        return Err(CommandError::new(
            "STORAGE_UNAVAILABLE",
            "原数据目录不可用，请检查磁盘连接或恢复原目录",
        ));
    }
    Ok(path)
}

fn copy_directory(source: &Path, target: &Path) -> Result<(), CommandError> {
    fs::create_dir(target)?;
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        let destination = target.join(entry.file_name());
        if kind.is_dir() {
            copy_directory(&entry.path(), &destination)?;
        } else if kind.is_file() {
            let mut input = fs::File::open(entry.path())?;
            let mut output = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(destination)?;
            std::io::copy(&mut input, &mut output)?;
            output.sync_all()?;
        } else {
            return Err(CommandError::new(
                "UNSUPPORTED_FILE",
                "数据目录包含链接或非普通文件，请先整理后迁移",
            ));
        }
    }
    Ok(())
}

fn copy_data(source: &Path, target: &Path) -> Result<(), CommandError> {
    // 旧目录只读打开；VACUUM INTO 将一致性快照直接写入新盘，不写旧 C 盘数据库。
    let connection =
        Connection::open_with_flags(source.join(DATABASE), OpenFlags::SQLITE_OPEN_READ_ONLY)?;
    connection.execute_batch("PRAGMA temp_store = MEMORY")?;
    connection.execute(
        "VACUUM INTO ?1",
        [target.join(DATABASE).to_string_lossy().as_ref()],
    )?;
    for name in FILE_DIRECTORIES {
        if source.join(name).exists() {
            copy_directory(&source.join(name), &target.join(name))?;
        }
    }
    Ok(())
}

fn cleanup_copy(target: &Path) {
    let _ = fs::remove_file(target.join(DATABASE));
    // 仅清理本次在空目录下创建的已知数据子目录。
    for name in FILE_DIRECTORIES {
        let path = target.join(name);
        if path.parent() == Some(target) {
            let _ = fs::remove_dir_all(path);
        }
    }
}

fn write_pointer(install: &Path, target: &Path) -> Result<(), CommandError> {
    let temporary = install.join("storage-location.json.tmp");
    validate_storage_path(&temporary)?;
    let bytes = serde_json::to_vec(&PathBuf::from(display_path(target)))
        .map_err(|_| CommandError::new("INVALID_PATH", "无法保存数据位置"))?;
    {
        let mut file = fs::File::create(&temporary)?;
        file.write_all(&bytes)?;
        file.sync_all()?;
    }
    fs::rename(temporary, install.join(POINTER))?;
    Ok(())
}

/// 首次升级只读检查旧 AppData 数据，完整复制到安装目录后再使用新库。
pub fn initialize(app: &tauri::AppHandle) -> Result<PathBuf, CommandError> {
    let install = installation_directory()?;
    let target = resolve_directory(&install)?;
    fs::create_dir_all(&target)?;
    if !target.join(DATABASE).exists() {
        let legacy = app.path().app_data_dir()?;
        let has_legacy_pointer = legacy.join(POINTER).is_file();
        let source = if has_legacy_pointer {
            serde_json::from_slice::<PathBuf>(&fs::read(legacy.join(POINTER))?).map_err(|_| {
                CommandError::new(
                    "LEGACY_LOCATION_INVALID",
                    "旧位置配置损坏，请先恢复旧 storage-location.json",
                )
            })?
        } else {
            legacy
        };
        if has_legacy_pointer && (!source.is_absolute() || !source.join(DATABASE).is_file()) {
            return Err(CommandError::new(
                "STORAGE_UNAVAILABLE",
                "旧数据位置不可用，请连接原磁盘后重试，原数据不会被空库替换",
            ));
        }
        if source.join(DATABASE).is_file()
            && fs::canonicalize(&source)? != fs::canonicalize(&target)?
        {
            if fs::read_dir(&target)?.next().is_some() {
                return Err(CommandError::new(
                    "INITIAL_DIRECTORY_NOT_EMPTY",
                    "安装目录的 data 文件夹已有文件，请先整理后迁移旧数据",
                ));
            }
            if let Err(error) = copy_data(&source, &target) {
                cleanup_copy(&target);
                return Err(error);
            }
        }
    }
    Ok(target)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageLocation {
    pub path: String,
    pub default_path: String,
}

#[tauri::command]
pub fn get_storage_location(app: tauri::AppHandle) -> Result<StorageLocation, CommandError> {
    let db = super::open_connection(&app)?;
    Ok(StorageLocation {
        path: display_path(&db.directory),
        default_path: display_path(&installation_directory()?.join("data")),
    })
}

#[tauri::command]
pub async fn pick_storage_directory(app: tauri::AppHandle) -> Result<Option<String>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut dialog = rfd::FileDialog::new()
            .set_title("选择数据目录（非 C 盘的空文件夹）")
            .set_directory(installation_directory()?);
        if let Some(window) = app.get_webview_window("main") {
            dialog = dialog.set_parent(&window);
        }
        let selected = dialog.pick_folder();
        selected
            .map(|path| {
                validate_storage_path(&path)?;
                Ok(display_path(&path))
            })
            .transpose()
    })
    .await
    .map_err(|error| CommandError::new("DIALOG_FAILED", error.to_string()))?
}

fn migrate(install: &Path, target: &Path) -> Result<PathBuf, CommandError> {
    validate_storage_path(target)?;
    let source = fs::canonicalize(resolve_directory(install)?)?;
    fs::create_dir_all(target)?;
    let target = fs::canonicalize(target)?;
    validate_storage_path(&target)?;
    if target == source {
        return Ok(target);
    }
    if target.starts_with(&source) || source.starts_with(&target) {
        return Err(CommandError::new(
            "NESTED_PATH",
            "新目录不能与当前数据目录相互包含",
        ));
    }
    if fs::read_dir(&target)?.next().is_some() {
        return Err(CommandError::new(
            "DIRECTORY_NOT_EMPTY",
            "请选择空目录，避免覆盖已有文件",
        ));
    }
    let result = copy_data(&source, &target)
        .and_then(|_| write_pointer(install, &target))
        .map(|_| target.clone());
    if result.is_err() {
        cleanup_copy(&target);
    }
    result
}

#[tauri::command]
pub async fn set_storage_location(
    _app: tauri::AppHandle,
    path: String,
) -> Result<StorageLocation, CommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = super::STORAGE_LOCK
            .write()
            .map_err(|_| CommandError::new("STORAGE_LOCK", "存储暂不可用，请重启应用"))?;
        let install = installation_directory()?;
        let target = migrate(&install, Path::new(path.trim()))?;
        Ok(StorageLocation {
            path: display_path(&target),
            default_path: display_path(&install.join("data")),
        })
    })
    .await
    .map_err(|error| CommandError::new("MIGRATION_FAILED", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_c_drive_and_formats_windows_paths() {
        for path in [r"C:\QuickBox", r"c:\data", r"\\?\C:\data", "C:/data"] {
            assert!(validate_storage_path(Path::new(path)).is_err());
        }
        assert_eq!(
            display_path(Path::new(r"\\?\D:\QuickBox\data")),
            r"D:\QuickBox\data"
        );
        assert_eq!(
            display_path(Path::new(r"\\?\UNC\server\share")),
            r"\\server\share"
        );
        assert!(validate_storage_path(Path::new("relative")).is_err());
    }
    #[test]
    fn defaults_to_install_directory_and_migrates_database_files_and_backups() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!(
                "location-test-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
        let install = root.join("install");
        let source = install.join("data");
        let target = root.join("new");
        fs::create_dir_all(source.join("saved-files")).unwrap();
        fs::create_dir_all(source.join("backups/backup-1")).unwrap();
        assert_eq!(resolve_directory(&install).unwrap(), source);
        let db = Connection::open(source.join(DATABASE)).unwrap();
        db.execute_batch("PRAGMA user_version = 17").unwrap();
        drop(db);
        fs::write(source.join("saved-files/attachment"), [0, 1, 255]).unwrap();
        fs::write(source.join("backups/backup-1/archive.zip"), [255, 0, 20]).unwrap();
        fs::create_dir(install.join("storage-location.json.tmp")).unwrap();
        assert!(migrate(&install, &target).is_err());
        assert!(!install.join(POINTER).exists());
        assert!(fs::read_dir(&target).unwrap().next().is_none());
        fs::remove_dir(install.join("storage-location.json.tmp")).unwrap();
        migrate(&install, &target).unwrap();
        assert_eq!(
            fs::canonicalize(resolve_directory(&install).unwrap()).unwrap(),
            fs::canonicalize(&target).unwrap()
        );
        assert_eq!(
            fs::read(target.join("saved-files/attachment")).unwrap(),
            [0, 1, 255]
        );
        assert_eq!(
            fs::read(target.join("backups/backup-1/archive.zip")).unwrap(),
            [255, 0, 20]
        );
        assert!(source.join(DATABASE).exists());
        let db = Connection::open(target.join(DATABASE)).unwrap();
        assert_eq!(
            db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            17
        );
        drop(db);
        assert!(migrate(&install, &source).is_err());
        assert!(migrate(&install, &target.join("nested")).is_err());
        let next = root.join("next");
        migrate(&install, &next).unwrap();
        assert_eq!(
            fs::canonicalize(resolve_directory(&install).unwrap()).unwrap(),
            fs::canonicalize(next).unwrap()
        );
        assert!(root.starts_with(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("target")));
        fs::remove_dir_all(root).unwrap();
    }
}
