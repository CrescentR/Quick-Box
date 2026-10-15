use crate::{
    errors::CommandError,
    storage::{self, Database},
};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{fs, sync::Mutex};

const KEY: &str = "quickbox.library.v1";
const MAX_FILE_SIZE: usize = 20 * 1024 * 1024;
static LIBRARY_LOCK: Mutex<()> = Mutex::new(());

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryItem {
    id: String,
    kind: String,
    title: String,
    content: String,
    tags: String,
    file_name: Option<String>,
    size: Option<usize>,
    updated_at: String,
}

fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 80 && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
}
fn validate(item: &LibraryItem) -> Result<(), CommandError> {
    if !valid_id(&item.id)
        || !["command", "file"].contains(&item.kind.as_str())
        || item.title.trim().is_empty()
        || item.title.len() > 800
        || item.content.len() > 400_000
        || item.tags.len() > 2000
        || item.updated_at.len() > 100
    {
        return Err(CommandError::new(
            "INVALID_ITEM",
            "标题、内容或标签格式无效或超过长度限制",
        ));
    }
    if item.kind == "command" && item.content.trim().is_empty() {
        return Err(CommandError::new("EMPTY_COMMAND", "请输入需要保存的命令"));
    }
    if item.kind == "file"
        && (item.file_name.as_ref().map_or(true, |name| {
            name.is_empty() || name.len() > 1000 || name.contains(['/', '\\'])
        }) || item.size.map_or(true, |size| size > MAX_FILE_SIZE))
    {
        return Err(CommandError::new(
            "INVALID_FILE",
            "文件名或文件大小无效（单个文件最大 20 MB）",
        ));
    }
    Ok(())
}
fn load(db: &Database) -> Result<Vec<LibraryItem>, CommandError> {
    let raw: Option<String> = db
        .query_row(
            "SELECT value FROM app_config WHERE key = ?1",
            [KEY],
            |row| row.get(0),
        )
        .optional()?;
    let items: Vec<LibraryItem> = match raw {
        Some(raw) => serde_json::from_str(&raw)
            .map_err(|_| CommandError::new("LIBRARY_CORRUPT", "资料数据损坏，原数据已保留"))?,
        None => vec![],
    };
    for item in &items {
        validate(item)?;
    }
    Ok(items)
}
fn save(db: &Database, items: &[LibraryItem]) -> Result<(), CommandError> {
    let raw = serde_json::to_string(items)
        .map_err(|_| CommandError::new("INVALID_LIBRARY", "无法保存资料"))?;
    if items.len() > 1000 || raw.len() > 8_000_000 {
        return Err(CommandError::new(
            "LIBRARY_FULL",
            "最多保存 1000 条资料，命令文本总量不超过 8 MB",
        ));
    }
    // 复用已有配置表保存版本化命令和附件索引；文件实体独立存放，不使用物理外键。
    db.execute("INSERT INTO app_config (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP", params![KEY, raw])?;
    Ok(())
}

#[tauri::command]
pub fn load_library(app: tauri::AppHandle) -> Result<Vec<LibraryItem>, CommandError> {
    load(&storage::open_connection(&app)?)
}

#[tauri::command]
pub fn save_library_item(
    app: tauri::AppHandle,
    item: LibraryItem,
    bytes: Option<Vec<u8>>,
) -> Result<Vec<LibraryItem>, CommandError> {
    let _guard = LIBRARY_LOCK
        .lock()
        .map_err(|_| CommandError::new("LIBRARY_BUSY", "资料库暂不可用，请重启"))?;
    let db = storage::open_connection(&app)?;
    save_item(&db, item, bytes)
}

fn save_item(
    db: &Database,
    mut item: LibraryItem,
    bytes: Option<Vec<u8>>,
) -> Result<Vec<LibraryItem>, CommandError> {
    validate(&item)?;
    let mut items = load(db)?;
    item.updated_at = db.query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", [], |row| {
        row.get(0)
    })?;
    let previous = items.iter().find(|old| old.id == item.id);
    if let Some(old) = previous {
        if old.kind != item.kind
            || old.file_name != item.file_name
            || old.size != item.size
            || bytes.is_some()
        {
            return Err(CommandError::new(
                "INVALID_UPDATE",
                "不能覆盖已保存的文件，请新增文件",
            ));
        }
    }
    let mut created = None;
    if item.kind == "file" && previous.is_none() {
        let bytes = bytes.ok_or_else(|| CommandError::new("MISSING_FILE", "请选择文件"))?;
        if bytes.len() > MAX_FILE_SIZE || Some(bytes.len()) != item.size {
            return Err(CommandError::new(
                "INVALID_FILE_SIZE",
                "文件大小不匹配或超过 20 MB",
            ));
        }
        let directory = db.directory.join("saved-files");
        storage::location::validate_storage_path(&directory)?;
        fs::create_dir_all(&directory)?;
        let path = directory.join(&item.id);
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)?;
        if let Err(error) = file.write_all(&bytes).and_then(|_| file.sync_all()) {
            drop(file);
            let _ = fs::remove_file(&path);
            return Err(error.into());
        }
        created = Some(path);
    } else if item.kind == "command" {
        item.file_name = None;
        item.size = None;
    }
    items.retain(|old| old.id != item.id);
    items.insert(0, item);
    if let Err(error) = save(db, &items) {
        if let Some(path) = created {
            let _ = fs::remove_file(path);
        }
        return Err(error);
    }
    Ok(items)
}

#[tauri::command]
pub fn read_library_file(app: tauri::AppHandle, id: String) -> Result<Vec<u8>, CommandError> {
    let db = storage::open_connection(&app)?;
    read_file(&db, &id)
}

fn read_file(db: &Database, id: &str) -> Result<Vec<u8>, CommandError> {
    if !load(db)?
        .iter()
        .any(|item| item.id == id && item.kind == "file")
    {
        return Err(CommandError::new("FILE_NOT_FOUND", "文件记录不存在"));
    }
    // 附件路径只由已验证索引中的 ID 构造，调用方不能指定任意磁盘路径。
    let path = db.directory.join("saved-files").join(id);
    if fs::metadata(&path)?.len() > MAX_FILE_SIZE as u64 {
        return Err(CommandError::new("FILE_TOO_LARGE", "文件超过 20 MB"));
    }
    Ok(fs::read(path)?)
}

#[tauri::command]
pub fn delete_library_item(
    app: tauri::AppHandle,
    id: String,
) -> Result<Vec<LibraryItem>, CommandError> {
    let _guard = LIBRARY_LOCK
        .lock()
        .map_err(|_| CommandError::new("LIBRARY_BUSY", "资料库暂不可用，请重启"))?;
    let db = storage::open_connection(&app)?;
    delete_item(&db, &id)
}

fn delete_item(db: &Database, id: &str) -> Result<Vec<LibraryItem>, CommandError> {
    let mut items = load(db)?;
    let item = items
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| CommandError::new("ITEM_NOT_FOUND", "资料不存在"))?;
    let path = db.directory.join("saved-files").join(&id);
    let trash = path.with_extension("deleted");
    let moved = item.kind == "file" && path.exists();
    if moved {
        fs::rename(&path, &trash)?;
    }
    items.retain(|item| item.id != id);
    if let Err(error) = save(db, &items) {
        if moved {
            let _ = fs::rename(&trash, &path);
        }
        return Err(error);
    }
    if moved {
        let _ = fs::remove_file(trash);
    }
    Ok(items)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn saves_binary_copies_and_rolls_back_failed_writes() {
        let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join(format!(
                "quickbox-library-{}",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
        let db = storage::test_database(root.clone());
        let item = LibraryItem {
            id: "test-file".into(),
            kind: "file".into(),
            title: "配置".into(),
            content: String::new(),
            tags: "备份".into(),
            file_name: Some("config.bin".into()),
            size: Some(3),
            updated_at: String::new(),
        };
        save_item(&db, item.clone(), Some(vec![0, 1, 255])).unwrap();
        assert_eq!(read_file(&db, &item.id).unwrap(), [0, 1, 255]);
        assert!(read_file(&db, "../quickbox.sqlite3").is_err());
        let mut edited = item.clone();
        edited.content = "部署配置".into();
        save_item(&db, edited, None).unwrap();
        assert_eq!(load(&db).unwrap()[0].content, "部署配置");
        assert!(save_item(&db, item.clone(), Some(vec![1, 2, 3])).is_err());
        db.execute_batch("PRAGMA query_only = ON").unwrap();
        assert!(delete_item(&db, &item.id).is_err());
        assert_eq!(read_file(&db, &item.id).unwrap(), [0, 1, 255]);
        let mut failed = item.clone();
        failed.id = "failed-file".into();
        assert!(save_item(&db, failed, Some(vec![0, 1, 255])).is_err());
        assert!(!root.join("saved-files/failed-file").exists());
        db.execute_batch("PRAGMA query_only = OFF").unwrap();
        assert!(delete_item(&db, &item.id).unwrap().is_empty());
        assert!(!root.join("saved-files/test-file").exists());
        drop(db);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn rejects_paths_and_empty_commands() {
        let mut item = LibraryItem {
            id: "abc-123".into(),
            kind: "command".into(),
            title: "Git status".into(),
            content: "git status".into(),
            tags: "git".into(),
            file_name: None,
            size: None,
            updated_at: String::new(),
        };
        assert!(validate(&item).is_ok());
        item.id = "../escape".into();
        assert!(validate(&item).is_err());
        item.id = "valid".into();
        item.content = "  ".into();
        assert!(validate(&item).is_err());
        item.kind = "file".into();
        item.file_name = Some("../../escape".into());
        item.size = Some(0);
        assert!(validate(&item).is_err());
        item.file_name = Some("script.ps1".into());
        assert!(validate(&item).is_ok());
        item.size = Some(MAX_FILE_SIZE + 1);
        assert!(validate(&item).is_err());
    }
}
