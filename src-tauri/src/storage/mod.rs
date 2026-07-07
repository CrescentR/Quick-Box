use crate::errors::CommandError;
use rusqlite::Connection;
use tauri::Manager;

pub mod clipboard_history_store;
pub mod command_usage_store;
pub mod config_store;
pub mod migrations;
pub mod plugin_store;
pub mod port_usage_store;

pub fn open_connection(app: &tauri::AppHandle) -> Result<Connection, CommandError> {
    let app_data_dir = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data_dir)?;
    let db_path = app_data_dir.join("quickbox.sqlite3");

    Ok(Connection::open(db_path)?)
}
