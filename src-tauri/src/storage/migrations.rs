use rusqlite::{params, Connection};

pub fn run_migrations(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let mut connection = super::open_connection(app).map_err(|error| {
        std::io::Error::other(format!("{}: {:?}", error.message, error.details))
    })?;
    apply_migrations(&mut connection)?;
    Ok(())
}

pub(crate) fn apply_migrations(connection: &mut Connection) -> rusqlite::Result<()> {
    // 兼容旧库：原表均幂等建立；DDL 与版本标记在同一事务内提交。
    let transaction = connection.transaction()?;
    transaction.execute_batch(
        r#"
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
    "#,
    )?;
    let version: i64 = transaction.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    )?;
    if version > 2 {
        return Err(rusqlite::Error::InvalidQuery);
    }
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
            (
                "schema_comments",
                "column_name",
                "字段名，空字符串代表表说明",
            ),
            ("schema_comments", "description", "中文用途说明"),
        ] {
            transaction.execute("INSERT INTO schema_comments (table_name, column_name, description) VALUES (?1, ?2, ?3) ON CONFLICT(table_name, column_name) DO UPDATE SET description = excluded.description", params![table, column, description])?;
        }
        transaction.execute("INSERT INTO schema_migrations (version) VALUES (1)", [])?;
    }
    if version < 2 {
        transaction.execute_batch(
            r#"
            -- 任务清单，不使用物理外键，删除清单时由应用将任务移回收集箱。
            CREATE TABLE qb_task_lists (
                -- 清单唯一标识。
                id TEXT PRIMARY KEY,
                -- 清单名称。
                name TEXT NOT NULL UNIQUE,
                -- 清单图标名称。
                icon TEXT NOT NULL DEFAULT 'list',
                -- 清单显示顺序。
                sort_order INTEGER NOT NULL DEFAULT 0
            );
            -- 任务标签，任务关联由应用校验和清理。
            CREATE TABLE qb_task_labels (
                -- 标签唯一标识。
                id TEXT PRIMARY KEY,
                -- 不重复的标签名称。
                name TEXT NOT NULL UNIQUE
            );
            -- 任务主体，引用仅为普通字段，不建立物理外键。
            CREATE TABLE qb_tasks (
                -- 任务唯一标识。
                id TEXT PRIMARY KEY,
                -- 非空任务标题。
                title TEXT NOT NULL,
                -- 任务说明正文。
                description TEXT NOT NULL DEFAULT '',
                -- pending 未完成或 completed 已完成。
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
                -- 优先级 1 最高，4 为默认。
                priority INTEGER NOT NULL DEFAULT 4 CHECK(priority BETWEEN 1 AND 4),
                -- 同优先级下的拖动顺序。
                sort_order INTEGER NOT NULL DEFAULT 0,
                -- 清单标识，空表示收集箱，应用校验关联。
                list_id TEXT,
                -- 本地截止日期 YYYY-MM-DD。
                due_date TEXT,
                -- 本地截止时间 HH:MM。
                due_time TEXT,
                -- 提前提醒分钟数，空表示不提醒。
                reminder_minutes INTEGER,
                -- 该截止时刻是否已提醒的本地时间。
                notified_at TEXT,
                -- 重复规则 daily weekdays weekly monthly yearly。
                recurrence TEXT,
                -- 是否置顶 0 或 1。
                is_pinned INTEGER NOT NULL DEFAULT 0 CHECK(is_pinned IN (0,1)),
                -- 完成本地时间。
                completed_at TEXT,
                -- 创建本地时间。
                created_at TEXT NOT NULL,
                -- 更新本地时间。
                updated_at TEXT NOT NULL,
                -- 软删除本地时间，空表示未删除。
                deleted_at TEXT
            );
            -- 任务与标签的应用层关联。
            CREATE TABLE qb_task_tags (
                -- 任务标识，应用校验存在性。
                task_id TEXT NOT NULL,
                -- 标签标识，应用校验存在性。
                tag_id TEXT NOT NULL,
                PRIMARY KEY(task_id,tag_id)
            );
            -- 任务子项，不使用级联物理外键。
            CREATE TABLE qb_task_subtasks (
                -- 子项唯一标识。
                id TEXT PRIMARY KEY,
                -- 所属任务标识，应用维护关联。
                task_id TEXT NOT NULL,
                -- 非空子项标题。
                title TEXT NOT NULL,
                -- 是否完成 0 或 1。
                completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)),
                -- 子项显示顺序。
                sort_order INTEGER NOT NULL DEFAULT 0
            );
            -- 重复任务生成记录，防止撤销完成后再次生成相同下一期任务。
            CREATE TABLE qb_task_recurrences (
                -- 生成来源任务标识。
                source_id TEXT NOT NULL,
                -- 来源任务的截止日期。
                due_date TEXT NOT NULL,
                -- 本次采用的重复规则。
                recurrence TEXT NOT NULL,
                -- 已生成的下一期任务标识。
                next_id TEXT NOT NULL,
                PRIMARY KEY(source_id,due_date,recurrence)
            );
            -- 活动任务视图筛选与排序索引。
            CREATE INDEX qb_tasks_active ON qb_tasks(deleted_at,status,priority,sort_order);
            -- 日期视图与提醒查询索引。
            CREATE INDEX qb_tasks_due ON qb_tasks(due_date,due_time);
            -- 清单任务查询索引。
            CREATE INDEX qb_tasks_list ON qb_tasks(list_id);
            -- 按标签反向查询任务索引。
            CREATE INDEX qb_task_tags_label ON qb_task_tags(tag_id,task_id);
            -- 子项按所属任务及顺序查询索引。
            CREATE INDEX qb_task_subtasks_parent ON qb_task_subtasks(task_id,sort_order);
        "#,
        )?;
        for (table, column, description) in [
            ("qb_task_lists", "", "任务清单，关联由应用维护"),
            ("qb_task_lists", "id", "清单唯一标识"),
            ("qb_task_lists", "name", "不重复的清单名称"),
            ("qb_task_lists", "icon", "清单图标名称"),
            ("qb_task_lists", "sort_order", "清单显示顺序"),
            ("qb_task_labels", "", "任务标签"),
            ("qb_task_labels", "id", "标签唯一标识"),
            ("qb_task_labels", "name", "不重复的标签名称"),
            ("qb_tasks", "", "任务主体，所有引用均为应用层关联"),
            ("qb_tasks", "id", "任务唯一标识"),
            ("qb_tasks", "title", "非空任务标题"),
            ("qb_tasks", "description", "任务说明正文"),
            ("qb_tasks", "status", "pending 未完成或 completed 已完成"),
            ("qb_tasks", "priority", "1 最高，4 为默认优先级"),
            ("qb_tasks", "sort_order", "同优先级任务拖动顺序"),
            (
                "qb_tasks",
                "list_id",
                "清单标识，空表示收集箱，应用校验关联",
            ),
            ("qb_tasks", "due_date", "本地截止日期 YYYY-MM-DD"),
            ("qb_tasks", "due_time", "本地截止时间 HH:MM"),
            (
                "qb_tasks",
                "reminder_minutes",
                "提前提醒分钟数，空表示不提醒",
            ),
            ("qb_tasks", "notified_at", "最近提醒确认的本地时间"),
            (
                "qb_tasks",
                "recurrence",
                "daily weekdays weekly monthly yearly 重复规则",
            ),
            ("qb_tasks", "is_pinned", "是否置顶 0 或 1"),
            ("qb_tasks", "completed_at", "完成本地时间"),
            ("qb_tasks", "created_at", "创建本地时间"),
            ("qb_tasks", "updated_at", "更新本地时间"),
            ("qb_tasks", "deleted_at", "软删除本地时间，空表示活动任务"),
            ("qb_task_tags", "", "任务与标签的应用层多对多关联"),
            ("qb_task_tags", "task_id", "任务标识，应用校验存在性"),
            ("qb_task_tags", "tag_id", "标签标识，应用校验存在性"),
            ("qb_task_subtasks", "", "任务子项，应用维护所属关系"),
            ("qb_task_subtasks", "id", "子项唯一标识"),
            ("qb_task_subtasks", "task_id", "所属任务标识，应用维护关联"),
            ("qb_task_subtasks", "title", "非空子项标题"),
            ("qb_task_subtasks", "completed", "是否完成 0 或 1"),
            ("qb_task_subtasks", "sort_order", "子项显示顺序"),
            (
                "qb_task_recurrences",
                "",
                "重复生成去重记录，防止撤销后重复生成",
            ),
            ("qb_task_recurrences", "source_id", "生成来源任务标识"),
            ("qb_task_recurrences", "due_date", "来源任务截止日期"),
            ("qb_task_recurrences", "recurrence", "本次采用的重复规则"),
            ("qb_task_recurrences", "next_id", "已生成的下一期任务标识"),
        ] {
            transaction.execute("INSERT INTO schema_comments (table_name,column_name,description) VALUES (?1,?2,?3)", params![table,column,description])?;
        }
        transaction.execute("INSERT INTO schema_migrations (version) VALUES (2)", [])?;
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
        let value: String = connection
            .query_row(
                "SELECT value FROM app_config WHERE key = 'legacy'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(value, "keep");
        let versions: i64 = connection
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(versions, 2);
        let comments: i64 = connection
            .query_row("SELECT COUNT(*) FROM schema_comments", [], |r| r.get(0))
            .unwrap();
        assert!(comments > 20);
    }

    #[test]
    fn task_schema_has_no_foreign_keys_and_documents_every_table_and_column() {
        let mut connection = Connection::open_in_memory().unwrap();
        apply_migrations(&mut connection).unwrap();
        let mut statement = connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'qb_task%' ORDER BY name").unwrap();
        let tables: Vec<String> = statement
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(tables.len(), 6);
        for table in tables {
            let mut keys = connection
                .prepare(&format!("PRAGMA foreign_key_list({table})"))
                .unwrap();
            assert!(
                !keys.exists([]).unwrap(),
                "{table} must not contain physical foreign keys"
            );
            let table_comment: String = connection
                .query_row(
                    "SELECT description FROM schema_comments WHERE table_name=? AND column_name=''",
                    [&table],
                    |row| row.get(0),
                )
                .unwrap();
            assert!(!table_comment.is_empty());
            let mut info = connection
                .prepare(&format!("PRAGMA table_info({table})"))
                .unwrap();
            let columns: Vec<String> = info
                .query_map([], |row| row.get(1))
                .unwrap()
                .collect::<Result<_, _>>()
                .unwrap();
            for column in columns {
                let comment: String = connection.query_row("SELECT description FROM schema_comments WHERE table_name=? AND column_name=?", params![table,column], |row| row.get(0)).unwrap();
                assert!(!comment.is_empty());
            }
        }
        let unsupported: i64 = connection
            .query_row(
                "SELECT count(*) FROM sqlite_master WHERE type IN ('view','trigger')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(unsupported, 0);
    }
}
