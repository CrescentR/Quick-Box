use crate::command_usage::CommandUsage;
use crate::errors::CommandError;
use crate::storage::command_usage_store;

#[tauri::command]
pub fn load_command_usage(app: tauri::AppHandle) -> Result<Vec<CommandUsage>, CommandError> {
    command_usage_store::load_command_usage(&app)
}

#[tauri::command]
pub fn record_command_usage(
    app: tauri::AppHandle,
    command_id: String,
) -> Result<CommandUsage, CommandError> {
    command_usage_store::record_command_usage(&app, &command_id)
}
