use crate::errors::CommandError;
use rusqlite::params;
use serde::Serialize;

const MAX_PORT_USAGE_ITEMS: i64 = 12;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortUsage {
    pub port: i64,
    pub use_count: i64,
    pub kill_count: i64,
    pub last_used_at: String,
}

pub fn load_port_usage(app: &tauri::AppHandle) -> Result<Vec<PortUsage>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let mut statement = connection.prepare(
        "SELECT port, use_count, kill_count, last_used_at FROM port_usage ORDER BY use_count DESC, last_used_at DESC LIMIT ?1",
    )?;
    let rows = statement.query_map(params![MAX_PORT_USAGE_ITEMS], |row| {
        Ok(PortUsage {
            port: row.get(0)?,
            use_count: row.get(1)?,
            kill_count: row.get(2)?,
            last_used_at: row.get(3)?,
        })
    })?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }

    Ok(items)
}

pub fn record_port_usage(
    app: &tauri::AppHandle,
    port: u16,
    killed: bool,
) -> Result<Vec<PortUsage>, CommandError> {
    let connection = crate::storage::open_connection(app)?;

    if killed {
        connection.execute(
            r#"
            INSERT INTO port_usage (port, use_count, kill_count, last_used_at)
            VALUES (?1, 1, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(port) DO UPDATE SET
              use_count = use_count + 1,
              kill_count = kill_count + 1,
              last_used_at = CURRENT_TIMESTAMP
            "#,
            params![port],
        )?;
    } else {
        connection.execute(
            r#"
            INSERT INTO port_usage (port, use_count, kill_count, last_used_at)
            VALUES (?1, 1, 0, CURRENT_TIMESTAMP)
            ON CONFLICT(port) DO UPDATE SET
              use_count = use_count + 1,
              last_used_at = CURRENT_TIMESTAMP
            "#,
            params![port],
        )?;
    }

    connection.execute(
        r#"
        DELETE FROM port_usage
        WHERE port NOT IN (
            SELECT port FROM port_usage ORDER BY use_count DESC, last_used_at DESC LIMIT ?1
        )
        "#,
        params![MAX_PORT_USAGE_ITEMS],
    )?;

    load_port_usage(app)
}

pub fn clear_port_usage(app: &tauri::AppHandle) -> Result<(), CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute("DELETE FROM port_usage", [])?;
    Ok(())
}
