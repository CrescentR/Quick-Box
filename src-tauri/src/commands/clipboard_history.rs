use crate::errors::CommandError;
use crate::storage::clipboard_history_store;
use crate::storage::clipboard_history_store::ClipboardHistoryItem;

#[tauri::command]
pub fn load_clipboard_history(
    app: tauri::AppHandle,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    clipboard_history_store::load_clipboard_history(&app)
}

#[tauri::command]
pub fn record_clipboard_text(
    app: tauri::AppHandle,
    text: String,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    clipboard_history_store::record_clipboard_text(&app, &text)
}

#[tauri::command]
pub fn delete_clipboard_history_item(
    app: tauri::AppHandle,
    id: i64,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    clipboard_history_store::delete_clipboard_history_item(&app, id)
}

#[tauri::command]
pub fn clear_clipboard_history(app: tauri::AppHandle) -> Result<(), CommandError> {
    clipboard_history_store::clear_clipboard_history(&app)
}
