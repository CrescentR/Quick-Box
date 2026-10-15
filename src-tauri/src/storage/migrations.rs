use rusqlite::{Connection, params};

pub fn run_migrations(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = super::open_connection(app).map_err(|error| std::io::Error::other(format!("{}: {:?}", error.message, error.details)))?;
    apply_migrations(&mut connection)?;
    Ok(())
}

pub(super) fn apply_migrations(connection: &mut Connection) -> rusqlite::Result<()> {
    // 兼容旧库：原表均幂等建立；DDL 与版本标记在同一事务内提交。
    let transaction = connection.transaction()?;
    transaction.execute_batch(r#"
            -- 数据库迁移版本记录
            CREATE TABLE IF NOT EXISTS schema_migrations (
                -- 迁移版本号
                version INTEGER PRIMARY KEY,
                -- 迁移执行时间 UTC
                applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- 应用配置与个人工作台 JSON
            CREATE TABLE IF NOT EXISTS app_config (
                -- 配置唯一键
                key TEXT PRIMARY KEY,
                -- 版本化 JSON 配置
                value TEXT NOT NULL,
                -- 最后更新时间 UTC
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- 插件启停状态
            CREATE TABLE IF NOT EXISTS plugins (
                -- 插件唯一标识
                id TEXT PRIMARY KEY,
                -- 插件来源
                source TEXT NOT NULL,
                -- 是否启用 0 或 1
                enabled INTEGER NOT NULL DEFAULT 1,
                -- 插件元数据 JSON
                metadata TEXT NOT NULL DEFAULT '{}',
                -- 最后更新时间 UTC
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- 命令使用记录
            CREATE TABLE IF NOT EXISTS command_usage (
                -- 命令唯一标识
                command_id TEXT PRIMARY KEY,
                -- 执行次数
                run_count INTEGER NOT NULL DEFAULT 0,
                -- 最后执行时间 UTC
                last_run_at TEXT
            );

            -- 本机剪贴板纯文本历史
            CREATE TABLE IF NOT EXISTS clipboard_history (
                -- 历史自增标识
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                -- 原始文本
                text TEXT NOT NULL UNIQUE,
                -- 记录或刷新时间 UTC
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            -- 常用端口记录
            CREATE TABLE IF NOT EXISTS port_usage (
                -- 端口号
                port INTEGER PRIMARY KEY,
                -- 查询次数
                use_count INTEGER NOT NULL DEFAULT 0,
                -- 清理次数
                kill_count INTEGER NOT NULL DEFAULT 0,
                -- 最后使用时间 UTC
                last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        -- SQLite 中持久保存表和字段注释，不使用物理外键。
        CREATE TABLE IF NOT EXISTS schema_comments (
            -- 被说明的表名。
            table_name TEXT NOT NULL,
            -- 字段名，空字符串表示表说明。
            column_name TEXT NOT NULL,
            -- 表或字段用途的中文说明。
            description TEXT NOT NULL,
            PRIMARY KEY (table_name, column_name)
        );
    "#)?;
    let version: i64 = transaction.query_row("SELECT COALESCE(MAX(version), 0) FROM schema_migrations", [], |row| row.get(0))?;
    if version > 1 { return Err(rusqlite::Error::InvalidQuery); }
    if version < 1 {
        for (table, column, description) in [
        ("schema_migrations", "", "数据库迁移版本记录"),
        ("schema_migrations", "version", "迁移版本号"),
        ("schema_migrations", "applied_at", "迁移执行时间 UTC"),
        ("app_config", "", "应用配置与个人工作台 JSON"),
        ("app_config", "key", "配置唯一键"),
        ("app_config", "value", "版本化 JSON 配置"),
        ("app_config", "updated_at", "最后更新时间 UTC"),
        ("plugins", "", "插件启停状态"),
        ("plugins", "id", "插件唯一标识"),
        ("plugins", "source", "插件来源"),
        ("plugins", "enabled", "是否启用 0 或 1"),
        ("plugins", "metadata", "插件元数据 JSON"),
        ("plugins", "updated_at", "最后更新时间 UTC"),
        ("command_usage", "", "命令使用记录"),
        ("command_usage", "command_id", "命令唯一标识"),
        ("command_usage", "run_count", "执行次数"),
        ("command_usage", "last_run_at", "最后执行时间 UTC"),
        ("clipboard_history", "", "本机剪贴板纯文本历史"),
        ("clipboard_history", "id", "历史自增标识"),
        ("clipboard_history", "text", "原始文本"),
        ("clipboard_history", "created_at", "记录或刷新时间 UTC"),
        ("port_usage", "", "常用端口记录"),
        ("port_usage", "port", "端口号"),
        ("port_usage", "use_count", "查询次数"),
        ("port_usage", "kill_count", "清理次数"),
        ("port_usage", "last_used_at", "最后使用时间 UTC"),
        ("schema_comments", "", "表与字段说明，SQLite 注释元数据"),
        ("schema_comments", "table_name", "被说明的表名"),
        ("schema_comments", "column_name", "字段名，空字符串代表表说明"),
        ("schema_comments", "description", "中文用途说明"),
        ] {
            transaction.execute("INSERT INTO schema_comments (table_name, column_name, description) VALUES (?1, ?2, ?3) ON CONFLICT(table_name, column_name) DO UPDATE SET description = excluded.description", params![table, column, description])?;
        }
        transaction.execute("INSERT INTO schema_migrations (version) VALUES (1)", [])?;
    }
    transaction.commit()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn upgrades_legacy_database_without_losing_data_and_is_repeatable() {
        let mut connection = Connection::open_in_memory().unwrap();
        // 旧版本配置表样本：key 为唯一配置键，value 为 JSON，updated_at 为更新时间。
        connection.execute_batch("CREATE TABLE app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); INSERT INTO app_config (key, value) VALUES ('legacy', 'keep');").unwrap();
        apply_migrations(&mut connection).unwrap();
        apply_migrations(&mut connection).unwrap();
        let value: String = connection.query_row("SELECT value FROM app_config WHERE key = 'legacy'", [], |r| r.get(0)).unwrap();
        assert_eq!(value, "keep");
        let versions: i64 = connection.query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0)).unwrap();
        assert_eq!(versions, 1);
        let comments: i64 = connection.query_row("SELECT COUNT(*) FROM schema_comments", [], |r| r.get(0)).unwrap();
        assert!(comments > 20);
    }
}
