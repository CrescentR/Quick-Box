use crate::errors::CommandError;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[tauri::command]
pub fn read_clipboard_text(app: tauri::AppHandle) -> Result<String, CommandError> {
    app.clipboard()
        .read_text()
        .map_err(|error| CommandError::with_details("CLIPBOARD_READ_FAILED", "Failed to read clipboard text", error.to_string()))
}

#[tauri::command]
pub fn write_clipboard_text(app: tauri::AppHandle, text: String) -> Result<(), CommandError> {
    app.clipboard()
        .write_text(text)
        .map_err(|error| CommandError::with_details("CLIPBOARD_WRITE_FAILED", "Failed to write clipboard text", error.to_string()))
}
