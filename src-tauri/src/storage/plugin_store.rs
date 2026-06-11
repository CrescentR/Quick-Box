use crate::errors::CommandError;
use crate::plugin_state::PluginState;
use rusqlite::params;

pub fn load_plugin_states(app: &tauri::AppHandle) -> Result<Vec<PluginState>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let mut statement =
        connection.prepare("SELECT id, source, enabled FROM plugins ORDER BY id ASC")?;
    let rows = statement.query_map([], |row| {
        Ok(PluginState {
            id: row.get(0)?,
            source: row.get(1)?,
            enabled: row.get::<_, i64>(2)? != 0,
        })
    })?;

    let mut states = Vec::new();
    for row in rows {
        states.push(row?);
    }

    Ok(states)
}

pub fn save_plugin_states(
    app: &tauri::AppHandle,
    states: &[PluginState],
) -> Result<(), CommandError> {
    let mut connection = crate::storage::open_connection(app)?;
    let transaction = connection.transaction()?;

    for state in states {
        transaction.execute(
            r#"
            INSERT INTO plugins (id, source, enabled, metadata, updated_at)
            VALUES (?1, ?2, ?3, '{}', CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              source = excluded.source,
              enabled = excluded.enabled,
              updated_at = CURRENT_TIMESTAMP
            "#,
            params![state.id, state.source, if state.enabled { 1 } else { 0 }],
        )?;
    }

    transaction.commit()?;
    Ok(())
}
