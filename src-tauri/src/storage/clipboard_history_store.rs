use crate::errors::CommandError;
use rusqlite::params;
use serde::Serialize;

const MAX_CLIPBOARD_HISTORY_ITEMS: i64 = 100;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardHistoryItem {
    pub id: i64,
    pub text: String,
    pub created_at: String,
}

pub fn load_clipboard_history(
    app: &tauri::AppHandle,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let mut statement = connection.prepare(
        "SELECT id, text, created_at FROM clipboard_history ORDER BY created_at DESC, id DESC LIMIT ?1",
    )?;
    let rows = statement.query_map(params![MAX_CLIPBOARD_HISTORY_ITEMS], |row| {
        Ok(ClipboardHistoryItem {
            id: row.get(0)?,
            text: row.get(1)?,
            created_at: row.get(2)?,
        })
    })?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }

    Ok(items)
}

pub fn record_clipboard_text(
    app: &tauri::AppHandle,
    text: &str,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let normalized = text.trim();
    if normalized.is_empty() {
        return load_clipboard_history(app);
    }

    connection.execute(
        r#"
        INSERT INTO clipboard_history (text, created_at)
        VALUES (?1, CURRENT_TIMESTAMP)
        ON CONFLICT(text) DO UPDATE SET created_at = CURRENT_TIMESTAMP
        "#,
        params![text],
    )?;

    connection.execute(
        r#"
        DELETE FROM clipboard_history
        WHERE id NOT IN (
            SELECT id FROM clipboard_history ORDER BY created_at DESC, id DESC LIMIT ?1
        )
        "#,
        params![MAX_CLIPBOARD_HISTORY_ITEMS],
    )?;

    load_clipboard_history(app)
}

pub fn delete_clipboard_history_item(
    app: &tauri::AppHandle,
    id: i64,
) -> Result<Vec<ClipboardHistoryItem>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute("DELETE FROM clipboard_history WHERE id = ?1", params![id])?;
    load_clipboard_history(app)
}

pub fn clear_clipboard_history(app: &tauri::AppHandle) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute("DELETE FROM clipboard_history", [])?;
    Ok(())
}
