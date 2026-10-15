use crate::errors::CommandError;
use rusqlite::Connection;
use std::{
    ops::{Deref, DerefMut},
    path::PathBuf,
    sync::{RwLock, RwLockReadGuard},
};

pub mod clipboard_history_store;
pub mod command_usage_store;
pub mod config_store;
pub mod location;
pub mod migrations;
pub mod plugin_store;
pub mod port_usage_store;

// 每个数据库连接在整个生命周期持有读锁，迁移独占写锁，防止写入旧目录。
pub static STORAGE_LOCK: RwLock<()> = RwLock::new(());
pub struct Database {
    connection: Connection,
    pub directory: PathBuf,
    _guard: RwLockReadGuard<'static, ()>,
}
impl Deref for Database {
    type Target = Connection;
    fn deref(&self) -> &Connection {
        &self.connection
    }
}
impl DerefMut for Database {
    fn deref_mut(&mut self) -> &mut Connection {
        &mut self.connection
    }
}

#[cfg(test)]
pub fn test_database(directory: PathBuf) -> Database {
    std::fs::create_dir_all(&directory).unwrap();
    let mut connection = Connection::open(directory.join("quickbox.sqlite3")).unwrap();
    migrations::apply_migrations(&mut connection).unwrap();
    Database {
        connection,
        directory,
        _guard: STORAGE_LOCK.read().unwrap(),
    }
}

pub fn open_connection(_app: &tauri::AppHandle) -> Result<Database, CommandError> {
    let guard = STORAGE_LOCK
        .read()
        .map_err(|_| CommandError::new("STORAGE_LOCK", "存储暂不可用，请重启应用"))?;
    let app_data_dir = location::resolve_directory(&location::installation_directory()?)?;
    std::fs::create_dir_all(&app_data_dir)?;
    let db_path = app_data_dir.join("quickbox.sqlite3");
    location::validate_storage_path(&db_path)?;

    let connection = Connection::open(db_path)?;
    connection.busy_timeout(std::time::Duration::from_secs(5))?;
    connection.execute_batch("PRAGMA temp_store = MEMORY")?;
    Ok(Database {
        connection,
        directory: app_data_dir,
        _guard: guard,
    })
}
