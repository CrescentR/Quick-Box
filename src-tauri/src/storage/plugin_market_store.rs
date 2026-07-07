use crate::errors::CommandError;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::Manager;

/// 已安装插件记录（对应 installed_plugins 表）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub path: String,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: String,
    /// plugin.json 完整内容（JSON Value）
    pub manifest: serde_json::Value,
}

const MARKET_SOURCE_URL_KEY: &str = "quickbox.marketSourceUrl";
const DEFAULT_MARKET_SOURCE_URL: &str =
    "https://raw.githubusercontent.com/quickbox/quickbox-plugins/main/release/plugins.json";

// ---------------------------------------------------------------------------
// installed_plugins CRUD
// ---------------------------------------------------------------------------

pub fn load_installed_plugins(app: &tauri::AppHandle) -> Result<Vec<InstalledPlugin>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let mut statement = connection.prepare(
        "SELECT id, name, version, path, enabled, manifest, installed_at, updated_at \
         FROM installed_plugins ORDER BY id ASC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(InstalledPlugin {
            id: row.get(0)?,
            name: row.get(1)?,
            version: row.get(2)?,
            path: row.get(3)?,
            enabled: row.get::<_, i64>(4)? != 0,
            manifest: row.get(5)?,
            installed_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;

    let mut plugins = Vec::new();
    for row in rows {
        plugins.push(row?);
    }
    Ok(plugins)
}

pub fn get_installed_plugin(
    app: &tauri::AppHandle,
    plugin_id: &str,
) -> Result<Option<InstalledPlugin>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let result = connection
        .query_row(
            "SELECT id, name, version, path, enabled, manifest, installed_at, updated_at \
             FROM installed_plugins WHERE id = ?1",
            params![plugin_id],
            |row| {
                Ok(InstalledPlugin {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    version: row.get(2)?,
                    path: row.get(3)?,
                    enabled: row.get::<_, i64>(4)? != 0,
                    manifest: row.get(5)?,
                    installed_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .optional()?;
    Ok(result)
}

pub fn upsert_installed_plugin(
    app: &tauri::AppHandle,
    plugin: &InstalledPlugin,
) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let manifest_json = serde_json::to_string(&plugin.manifest).map_err(|e| {
        CommandError::with_details(
            "SERIALIZE_FAILED",
            "Failed to serialize plugin manifest",
            e.to_string(),
        )
    })?;

    connection.execute(
        r#"
        INSERT INTO installed_plugins (id, name, version, path, enabled, manifest, installed_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            version = excluded.version,
            path = excluded.path,
            enabled = excluded.enabled,
            manifest = excluded.manifest,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![
            plugin.id,
            plugin.name,
            plugin.version,
            plugin.path,
            if plugin.enabled { 1 } else { 0 },
            manifest_json,
        ],
    )?;
    Ok(())
}

pub fn delete_installed_plugin(
    app: &tauri::AppHandle,
    plugin_id: &str,
) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute(
        "DELETE FROM installed_plugins WHERE id = ?1",
        params![plugin_id],
    )?;
    Ok(())
}

pub fn set_plugin_enabled(
    app: &tauri::AppHandle,
    plugin_id: &str,
    enabled: bool,
) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let affected = connection.execute(
        "UPDATE installed_plugins SET enabled = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![if enabled { 1 } else { 0 }, plugin_id],
    )?;
    if affected == 0 {
        return Err(CommandError::new(
            "PLUGIN_NOT_FOUND",
            format!("Plugin not found: {}", plugin_id),
        ));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// 市场源 URL
// ---------------------------------------------------------------------------

pub fn get_market_source_url(app: &tauri::AppHandle) -> Result<String, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let result = connection
        .query_row(
            "SELECT value FROM app_config WHERE key = ?1",
            params![MARKET_SOURCE_URL_KEY],
            |row| row.get::<_, String>(0),
        )
        .optional()?;
    Ok(result.unwrap_or_else(|| DEFAULT_MARKET_SOURCE_URL.to_string()))
}

pub fn set_market_source_url(
    app: &tauri::AppHandle,
    url: &str,
) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute(
        r#"
        INSERT INTO app_config (key, value, updated_at)
        VALUES (?1, ?2, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        "#,
        params![MARKET_SOURCE_URL_KEY, url],
    )?;
    Ok(())
}
