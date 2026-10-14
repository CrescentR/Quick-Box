use crate::errors::CommandError;
use rusqlite::{params, OptionalExtension};
use serde_json::Value;

const KEY: &str = "quickbox.workspace.v1";

fn validate(data: &Value) -> Result<(), CommandError> {
    let invalid = || CommandError::new("INVALID_WORKSPACE", "工作台数据格式或大小无效");
    if data.to_string().len() > 8_000_000 || data["version"] != 1 || !data["clipboardSuggestions"].is_boolean() {
        return Err(invalid());
    }
    let ids = data["quickCommandIds"].as_array().ok_or_else(invalid)?;
    let mut seen = std::collections::HashSet::new();
    if ids.len() > 8 || ids.iter().any(|id| id.as_str().map_or(true, |id| id.len() > 800 || !seen.insert(id))) { return Err(invalid()); }
    let presets = data["presets"].as_object().ok_or_else(invalid)?;
    if presets.len() > 200 || presets.iter().any(|(key, value)| key.len() > 800 || !(value.is_string() || value.is_number() || value.is_boolean()) || value.to_string().len() > 4002) { return Err(invalid()); }
    let snippets = data["snippets"].as_array().ok_or_else(invalid)?;
    if snippets.len() > 500 { return Err(invalid()); }
    let mut snippet_ids = std::collections::HashSet::new();
    for snippet in snippets {
        for (key, limit) in [("id", 400), ("title", 800), ("content", 400_000), ("language", 200), ("tags", 2000), ("updatedAt", 100)] {
            if snippet[key].as_str().map_or(true, |value| value.len() > limit) { return Err(invalid()); }
        }
        let id = snippet["id"].as_str().unwrap();
        if id.is_empty() || !snippet_ids.insert(id) || snippet["title"].as_str().unwrap().trim().is_empty() { return Err(invalid()); }
    }
    Ok(())
}

#[tauri::command]
pub fn load_workspace(app: tauri::AppHandle) -> Result<Option<Value>, CommandError> {
    let connection = crate::storage::open_connection(&app)?;
    let value: Option<String> = connection.query_row(
        "SELECT value FROM app_config WHERE key = ?1", params![KEY], |row| row.get(0),
    ).optional()?;
    value.map(|raw| {
        let data: Value = serde_json::from_str(&raw).map_err(|_| CommandError::new("WORKSPACE_PARSE_FAILED", "工作台数据损坏，原数据已保留"))?;
        validate(&data)?;
        Ok(data)
    }).transpose()
}

#[tauri::command]
pub fn save_workspace(app: tauri::AppHandle, data: Value) -> Result<(), CommandError> {
    validate(&data)?;
    let connection = crate::storage::open_connection(&app)?;
    // 单条 UPSERT 原子替换版本化工作台；数据保存在已有配置表。
    connection.execute(
        "INSERT INTO app_config (key, value, updated_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        params![KEY, data.to_string()],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_and_duplicate_workspace_ids() {
        let mut value = serde_json::json!({"version": 1, "clipboardSuggestions": false, "quickCommandIds": [], "presets": {}, "snippets": []});
        assert!(validate(&value).is_ok());
        value["quickCommandIds"] = serde_json::json!(["a", "a"]);
        assert!(validate(&value).is_err());
        value["quickCommandIds"] = serde_json::json!([]);
        value["presets"] = serde_json::json!({"invalid": []});
        assert!(validate(&value).is_err());
    }
}
