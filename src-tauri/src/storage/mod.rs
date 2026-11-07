use crate::errors::CommandError;
use rusqlite::Connection;
use std::{
    ops::{Deref, DerefMut},
    path::PathBuf,
    sync::{Mutex, RwLock, RwLockReadGuard},
    time::Duration,
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

/// 空闲连接池：命令结束后把连接放回这里复用，避免每次调用都重新解析目录、打开文件。
/// 池中连接都指向同一个数据目录；迁移存储位置前会在写锁内清空连接池，所以不会写到旧目录。
static IDLE_CONNECTIONS: Mutex<Vec<(PathBuf, Connection)>> = Mutex::new(Vec::new());
const MAX_IDLE_CONNECTIONS: usize = 4;

pub struct Database {
    // 只会在 Drop 时取出，其余时间一定是 Some。
    connection: Option<Connection>,
    pub directory: PathBuf,
    pooled: bool,
    _guard: RwLockReadGuard<'static, ()>,
}
impl Deref for Database {
    type Target = Connection;
    fn deref(&self) -> &Connection {
        self.connection.as_ref().expect("connection is present until drop")
    }
}
impl DerefMut for Database {
    fn deref_mut(&mut self) -> &mut Connection {
        self.connection.as_mut().expect("connection is present until drop")
    }
}
impl Drop for Database {
    fn drop(&mut self) {
        // 此时读锁仍被持有（字段在 drop 之后才释放），迁移无法在这之间开始。
        let Some(connection) = self.connection.take() else { return };
        // 还处在事务中的连接状态不确定，直接关闭，不放回连接池。
        if !self.pooled || !connection.is_autocommit() {
            return;
        }
        let mut idle = IDLE_CONNECTIONS.lock().unwrap_or_else(|poison| poison.into_inner());
        if idle.len() < MAX_IDLE_CONNECTIONS {
            idle.push((std::mem::take(&mut self.directory), connection));
        }
    }
}

/// 关闭所有空闲连接。调用方必须持有 `STORAGE_LOCK` 写锁，Windows 上被打开的数据库文件无法迁移。
pub fn close_idle_connections() {
    IDLE_CONNECTIONS
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .clear();
}

fn configure_connection(connection: &Connection) -> Result<(), CommandError> {
    connection.busy_timeout(Duration::from_secs(5))?;
    // WAL：读写互不阻塞；NORMAL 在 WAL 下仍能保证崩溃后数据库一致，只是断电可能丢最后一次提交。
    connection.pragma_update(None, "journal_mode", "WAL")?;
    connection.pragma_update(None, "synchronous", "NORMAL")?;
    connection.execute_batch("PRAGMA temp_store = MEMORY")?;
    Ok(())
}

#[cfg(test)]
pub fn test_database(directory: PathBuf) -> Database {
    std::fs::create_dir_all(&directory).unwrap();
    let mut connection = Connection::open(directory.join("quickbox.sqlite3")).unwrap();
    migrations::apply_migrations(&mut connection).unwrap();
    Database {
        connection: Some(connection),
        directory,
        pooled: false,
        _guard: STORAGE_LOCK.read().unwrap(),
    }
}

pub fn open_connection(_app: &tauri::AppHandle) -> Result<Database, CommandError> {
    let guard = STORAGE_LOCK
        .read()
        .map_err(|_| CommandError::new("STORAGE_LOCK", "存储暂不可用，请重启应用"))?;
    let idle = IDLE_CONNECTIONS
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .pop();
    if let Some((directory, connection)) = idle {
        return Ok(Database {
            connection: Some(connection),
            directory,
            pooled: true,
            _guard: guard,
        });
    }

    let app_data_dir = location::resolve_directory(&location::installation_directory()?)?;
    std::fs::create_dir_all(&app_data_dir)?;
    let db_path = app_data_dir.join("quickbox.sqlite3");
    location::validate_storage_path(&db_path)?;

    let connection = Connection::open(db_path)?;
    configure_connection(&connection)?;
    Ok(Database {
        connection: Some(connection),
        directory: app_data_dir,
        pooled: true,
        _guard: guard,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configures_wal_and_busy_timeout() {
        let directory = std::env::temp_dir().join(format!(
            "quickbox-storage-test-{}-{}",
            std::process::id(),
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        {
            let connection = Connection::open(directory.join("quickbox.sqlite3")).unwrap();
            configure_connection(&connection).unwrap();
            let mode: String = connection
                .pragma_query_value(None, "journal_mode", |row| row.get(0))
                .unwrap();
            assert_eq!(mode, "wal");
            let synchronous: i64 = connection
                .pragma_query_value(None, "synchronous", |row| row.get(0))
                .unwrap();
            assert_eq!(synchronous, 1);
        }
        let _ = std::fs::remove_dir_all(directory);
    }
}
