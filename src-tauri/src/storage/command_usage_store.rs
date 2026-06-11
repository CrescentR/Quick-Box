use crate::command_usage::CommandUsage;
use crate::errors::CommandError;
use rusqlite::params;

pub fn load_command_usage(app: &tauri::AppHandle) -> Result<Vec<CommandUsage>, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    let mut statement = connection.prepare(
        "SELECT command_id, run_count, last_run_at FROM command_usage ORDER BY run_count DESC, last_run_at DESC",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(CommandUsage {
            command_id: row.get(0)?,
            run_count: row.get(1)?,
            last_run_at: row.get(2)?,
        })
    })?;

    let mut usage = Vec::new();
    for row in rows {
        usage.push(row?);
    }

    Ok(usage)
}

pub fn record_command_usage(
    app: &tauri::AppHandle,
    command_id: &str,
) -> Result<CommandUsage, CommandError> {
    let connection = crate::storage::open_connection(app)?;
    connection.execute(
        r#"
        INSERT INTO command_usage (command_id, run_count, last_run_at)
        VALUES (?1, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(command_id) DO UPDATE SET
          run_count = run_count + 1,
          last_run_at = CURRENT_TIMESTAMP
        "#,
        params![command_id],
    )?;

    let usage = connection.query_row(
        "SELECT command_id, run_count, last_run_at FROM command_usage WHERE command_id = ?1",
        params![command_id],
        |row| {
            Ok(CommandUsage {
                command_id: row.get(0)?,
                run_count: row.get(1)?,
                last_run_at: row.get(2)?,
            })
        },
    )?;

    Ok(usage)
}
