use crate::config::QuickBoxConfig;
use crate::errors::CommandError;
use rusqlite::{params, OptionalExtension};

const CONFIG_KEY: &str = "quickbox.config";

pub fn load_config(app: &tauri::AppHandle) -> Result<QuickBoxConfig, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let stored_config = connection
        .query_row(
            "SELECT value FROM app_config WHERE key = ?1",
            params![CONFIG_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()?;

    match stored_config {
        Some(value) => serde_json::from_str(&value).map_err(|error| {
            CommandError::with_details(
                "CONFIG_PARSE_FAILED",
                "Failed to parse saved QuickBox config",
                error.to_string(),
            )
        }),
        None => Ok(QuickBoxConfig::default()),
    }
}

pub fn save_config(app: &tauri::AppHandle, config: &QuickBoxConfig) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let value = serde_json::to_string(config).map_err(|error| {
        CommandError::with_details(
            "CONFIG_SERIALIZE_FAILED",
            "Failed to serialize QuickBox config",
            error.to_string(),
        )
    })?;

    connection.execute(
        r#"
        INSERT INTO app_config (key, value, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
        "#,
        params![CONFIG_KEY, value],
    )?;

    Ok(())
}
