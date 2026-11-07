//! Task 的本地任务能力。每次调用从 QuickBox 当前数据目录打开数据库，随统一存储迁移。
mod model;
mod repo;
mod validate;

use crate::{errors::CommandError, storage};
pub use model::*;
use repo::*;
use rusqlite::{params, OptionalExtension, TransactionBehavior};
use validate::*;

#[tauri::command]
pub fn task_query(app: tauri::AppHandle, input: QueryInput) -> Result<Vec<Task>, CommandError> {
    let db = storage::open_connection(&app)?;
    query_inner(&db, &input, false)
}

#[tauri::command]
pub fn task_get(app: tauri::AppHandle, id: String) -> Result<Option<Task>, CommandError> {
    validate_id(&id)?;
    let db = storage::open_connection(&app)?;
    let Some(mut task) = db
        .query_row(&format!("{SELECT} WHERE t.id=?"), [&id], map_task)
        .optional()?
    else {
        return Ok(None);
    };
    hydrate(&db, &mut task)?;
    Ok(Some(task))
}

#[tauri::command]
pub fn task_create(app: tauri::AppHandle, input: TaskInput) -> Result<Task, CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let task = create_inner(&tx, &input)?;
    tx.commit()?;
    Ok(task)
}

#[tauri::command]
pub fn task_update(
    app: tauri::AppHandle,
    id: String,
    input: TaskInput,
) -> Result<Task, CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let task = update_inner(&tx, &id, &input)?;
    tx.commit()?;
    Ok(task)
}

#[tauri::command]
pub fn task_toggle(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    toggle_inner(&tx, &id)?;
    tx.commit()?;
    Ok(())
}

fn change_deleted(app: &tauri::AppHandle, id: &str, action: &str) -> Result<(), CommandError> {
    let mut db = storage::open_connection(app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    delete_inner(&tx, id, action)?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub fn task_delete(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    change_deleted(&app, &id, "delete")
}

#[tauri::command]
pub fn task_restore(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    change_deleted(&app, &id, "restore")
}

#[tauri::command]
pub fn task_purge(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    change_deleted(&app, &id, "purge")
}

#[tauri::command]
pub fn task_reorder(
    app: tauri::AppHandle,
    ordered_ids: Vec<String>,
    dragged_id: String,
    priority: i64,
) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    reorder_inner(&tx, &ordered_ids, &dragged_id, priority)?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub fn task_lists(app: tauri::AppHandle) -> Result<Vec<TaskList>, CommandError> {
    let db = storage::open_connection(&app)?;
    lists_inner(&db)
}

#[tauri::command]
pub fn task_tags(app: tauri::AppHandle) -> Result<Vec<Tag>, CommandError> {
    let db = storage::open_connection(&app)?;
    tags_inner(&db)
}

#[tauri::command]
pub fn task_create_list(app: tauri::AppHandle, name: String) -> Result<TaskList, CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let list = create_list_inner(&tx, &name)?;
    tx.commit()?;
    Ok(list)
}

#[tauri::command]
pub fn task_create_tag(app: tauri::AppHandle, name: String) -> Result<Tag, CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let tag = create_tag_inner(&tx, &name)?;
    tx.commit()?;
    Ok(tag)
}

#[tauri::command]
pub fn task_delete_list(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    delete_list_inner(&tx, &id)?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub fn task_delete_tag(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    delete_tag_inner(&tx, &id)?;
    tx.commit()?;
    Ok(())
}

#[tauri::command]
pub fn task_overview(app: tauri::AppHandle) -> Result<Overview, CommandError> {
    let db = storage::open_connection(&app)?;
    overview_inner(&db)
}

#[tauri::command]
pub fn task_import(
    app: tauri::AppHandle,
    items: Vec<ImportTaskInput>,
) -> Result<ImportResult, CommandError> {
    let mut db = storage::open_connection(&app)?;
    import_inner(&mut db, items)
}

#[tauri::command]
pub fn task_export(app: tauri::AppHandle, format: String) -> Result<String, CommandError> {
    let db = storage::open_connection(&app)?;
    export_inner(&db, &format)
}

#[tauri::command]
pub fn task_get_setting(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<String>, CommandError> {
    let key = setting_key(&key)?;
    Ok(storage::open_connection(&app)?
        .query_row("SELECT value FROM app_config WHERE key=?", [key], |r| {
            r.get(0)
        })
        .optional()?)
}

#[tauri::command]
pub fn task_set_setting(
    app: tauri::AppHandle,
    key: String,
    value: String,
) -> Result<(), CommandError> {
    let key = setting_key(&key)?;
    if value.len() > 1_000_000 {
        return Err(invalid("任务设置不能超过 1 MB"));
    }
    storage::open_connection(&app)?.execute("INSERT INTO app_config(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",params![key,value])?;
    Ok(())
}

#[tauri::command]
pub fn task_due_reminders(app: tauri::AppHandle) -> Result<Vec<TaskReminder>, CommandError> {
    let db = storage::open_connection(&app)?;
    due_reminders_inner(&db)
}

#[tauri::command]
pub fn task_acknowledge_reminders(
    app: tauri::AppHandle,
    ids: Vec<String>,
) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    acknowledge_inner(&tx, &ids)?;
    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Local};
    use rusqlite::Connection;
    fn database() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        crate::storage::migrations::apply_migrations(&mut conn).unwrap();
        conn
    }
    fn input(title: &str) -> TaskInput {
        serde_json::from_value(serde_json::json!({"title":title})).unwrap()
    }
    fn query(conn: &Connection, view: &str) -> Vec<Task> {
        query_inner(
            conn,
            &QueryInput {
                view: view.into(),
                search: String::new(),
                limit: 200,
                offset: 0,
            },
            false,
        )
        .unwrap()
    }
    #[test]
    fn task_relations_are_validated_and_manual_cleanup_preserves_task() {
        let conn = database();
        let list = create_list_inner(&conn, "工作").unwrap();
        let tag = create_tag_inner(&conn, "开发").unwrap();
        let mut data = input("发布");
        data.list_id = Some(list.id.clone());
        data.tag_ids = vec![tag.id.clone()];
        data.subtasks = vec![Subtask {
            id: String::new(),
            task_id: None,
            title: "验证".into(),
            completed: false,
            sort_order: 9,
        }];
        let task = create_inner(&conn, &data).unwrap();
        assert_eq!(task.priority, 4);
        assert_eq!(task.subtasks.len(), 1);
        data.tag_ids = vec!["missing".into()];
        assert!(update_inner(&conn, &task.id, &data).is_err());
        assert_eq!(fetch_one(&conn, &task.id).unwrap().tags.len(), 1);
        let mut hijack = input("别的任务");
        hijack.subtasks = task.subtasks.clone();
        assert!(create_inner(&conn, &hijack).is_err());
        delete_list_inner(&conn, &list.id).unwrap();
        delete_tag_inner(&conn, &tag.id).unwrap();
        let saved = fetch_one(&conn, &task.id).unwrap();
        assert!(saved.list_id.is_none());
        assert!(saved.tags.is_empty());
        assert!(delete_inner(&conn, &task.id, "purge").is_err());
        delete_inner(&conn, &task.id, "delete").unwrap();
        assert_eq!(query(&conn, "trash").len(), 1);
        delete_inner(&conn, &task.id, "restore").unwrap();
        assert_eq!(query(&conn, "inbox").len(), 1);
        delete_inner(&conn, &task.id, "delete").unwrap();
        delete_inner(&conn, &task.id, "purge").unwrap();
        let subs: i64 = conn
            .query_row("SELECT count(*) FROM qb_task_subtasks", [], |r| r.get(0))
            .unwrap();
        assert_eq!(subs, 0);
    }
    #[test]
    fn recurrence_clamps_months_and_does_not_duplicate_after_undo_or_purge() {
        assert_eq!(
            next_date("2024-01-31", "monthly").as_deref(),
            Some("2024-02-29")
        );
        assert_eq!(
            next_date("2024-02-29", "yearly").as_deref(),
            Some("2025-02-28")
        );
        assert_eq!(
            next_date("2026-08-21", "weekdays").as_deref(),
            Some("2026-08-24")
        );
        let conn = database();
        let mut data = input("例行维护");
        data.due_date = Some("2024-01-31".into());
        data.recurrence = Some("monthly".into());
        let task = create_inner(&conn, &data).unwrap();
        toggle_inner(&conn, &task.id).unwrap();
        let next = query(&conn, "all");
        assert_eq!(next.len(), 1);
        assert_eq!(next[0].due_date.as_deref(), Some("2024-02-29"));
        toggle_inner(&conn, &task.id).unwrap();
        toggle_inner(&conn, &task.id).unwrap();
        assert_eq!(query(&conn, "all").len(), 1);
        delete_inner(&conn, &next[0].id, "delete").unwrap();
        delete_inner(&conn, &next[0].id, "purge").unwrap();
        toggle_inner(&conn, &task.id).unwrap();
        toggle_inner(&conn, &task.id).unwrap();
        assert!(query(&conn, "all").is_empty());
    }
    #[test]
    fn import_skips_bad_rows_and_rolls_back_their_new_lists_and_tags() {
        let mut conn = database();
        let items = serde_json::from_value(serde_json::json!([
            {"title":"有效任务","list_name":"有效清单","tag_names":["有效标签"]},
            {"title":"损坏关联","list_name":"不应留下","tag_names":["不应留下",""]},
            {"title":"非法日期","due_date":"2026-02-30","list_name":"无效日期清单"},
            {"title":"已完成","status":"completed","priority":1}
        ]))
        .unwrap();
        let result = import_inner(&mut conn, items).unwrap();
        assert_eq!((result.imported, result.skipped), (2, 2));
        assert_eq!(lists_inner(&conn).unwrap().len(), 1);
        assert_eq!(tags_inner(&conn).unwrap().len(), 1);
        assert_eq!(query(&conn, "completed").len(), 1);
        let json = export_inner(&conn, "json").unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.as_array().unwrap().len(), 2);
        assert!(export_inner(&conn, "csv").unwrap().contains("有效标签"));
    }
    #[test]
    fn reminder_acknowledgement_and_plugin_disable_are_respected() {
        let conn = database();
        let mut data = input("到期提醒");
        data.due_date = Some("2020-01-01".into());
        data.due_time = Some("09:00".into());
        data.reminder_minutes = Some(5);
        let task = create_inner(&conn, &data).unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 1);
        acknowledge_inner(&conn, std::slice::from_ref(&task.id)).unwrap();
        assert!(due_reminders_inner(&conn).unwrap().is_empty());
        data.due_time = Some("10:00".into());
        update_inner(&conn, &task.id, &data).unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 1);
        conn.execute(
            "INSERT INTO plugins(id,source,enabled) VALUES('official.task-tool','builtin',0)",
            [],
        )
        .unwrap();
        assert!(due_reminders_inner(&conn).unwrap().is_empty());
        conn.execute(
            "UPDATE plugins SET enabled=1 WHERE id='official.task-tool'",
            [],
        )
        .unwrap();
        toggle_inner(&conn, &task.id).unwrap();
        assert!(due_reminders_inner(&conn).unwrap().is_empty());
        toggle_inner(&conn, &task.id).unwrap();
        delete_inner(&conn, &task.id, "delete").unwrap();
        assert!(due_reminders_inner(&conn).unwrap().is_empty());
    }
    #[test]
    fn zero_minute_reminders_fire_only_at_due_time_and_advance_reminders_fire_earlier() {
        let conn = database();
        let future = Local::now().naive_local() + Duration::minutes(10);
        let mut exact = input("准时提醒");
        exact.due_date = Some(future.format("%Y-%m-%d").to_string());
        exact.due_time = Some(future.format("%H:%M").to_string());
        exact.reminder_minutes = Some(0);
        let exact_task = create_inner(&conn, &exact).unwrap();
        let mut advance = exact.clone();
        advance.title = "提前提醒".into();
        advance.reminder_minutes = Some(15);
        let advance_task = create_inner(&conn, &advance).unwrap();
        let reminders = due_reminders_inner(&conn).unwrap();
        assert_eq!(reminders.len(), 1);
        assert_eq!(reminders[0].id, advance_task.id);
        exact.due_date = Some("2020-01-01".into());
        update_inner(&conn, &exact_task.id, &exact).unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 2);
        let mut silent = exact.clone();
        silent.title = "不提醒".into();
        silent.reminder_minutes = None;
        create_inner(&conn, &silent).unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 2);
    }
    #[test]
    fn acknowledging_an_old_popup_does_not_consume_a_rescheduled_future_reminder() {
        let conn = database();
        let mut data = input("改期提醒");
        data.due_date = Some("2020-01-01".into());
        data.due_time = Some("09:00".into());
        data.reminder_minutes = Some(0);
        let task = create_inner(&conn, &data).unwrap();
        let old_popup = due_reminders_inner(&conn).unwrap();
        assert_eq!(old_popup.len(), 1);
        data.due_date = Some(
            (Local::now().date_naive() + Duration::days(1))
                .format("%Y-%m-%d")
                .to_string(),
        );
        update_inner(&conn, &task.id, &data).unwrap();
        acknowledge_inner(&conn, &[old_popup[0].id.clone()]).unwrap();
        let notified: Option<String> = conn
            .query_row(
                "SELECT notified_at FROM qb_tasks WHERE id=?",
                [&task.id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(notified.is_none());
        data.due_date = Some("2020-01-01".into());
        update_inner(&conn, &task.id, &data).unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 1);
        conn.execute(
            "INSERT INTO plugins(id,source,enabled) VALUES('official.task-tool','builtin',0)",
            [],
        )
        .unwrap();
        acknowledge_inner(&conn, std::slice::from_ref(&task.id)).unwrap();
        conn.execute(
            "UPDATE plugins SET enabled=1 WHERE id='official.task-tool'",
            [],
        )
        .unwrap();
        assert_eq!(due_reminders_inner(&conn).unwrap().len(), 1);
        acknowledge_inner(&conn, &[task.id]).unwrap();
        assert!(due_reminders_inner(&conn).unwrap().is_empty());
    }
    #[test]
    fn query_views_and_reordering_keep_other_task_priorities() {
        let conn = database();
        let mut high = input("高优先级");
        high.priority = 1;
        let high = create_inner(&conn, &high).unwrap();
        let low = create_inner(&conn, &input("低优先级")).unwrap();
        reorder_inner(&conn, &[low.id.clone(), high.id.clone()], &low.id, 2).unwrap();
        assert_eq!(fetch_one(&conn, &high.id).unwrap().priority, 1);
        assert_eq!(fetch_one(&conn, &low.id).unwrap().priority, 2);
        let mut overdue = input("逾期");
        overdue.due_date = Some("2020-01-01".into());
        create_inner(&conn, &overdue).unwrap();
        assert_eq!(query(&conn, "today").len(), 1);
        let mut upcoming = input("将来");
        upcoming.due_date = Some(
            (Local::now().date_naive() + Duration::days(5))
                .format("%Y-%m-%d")
                .to_string(),
        );
        create_inner(&conn, &upcoming).unwrap();
        assert_eq!(query(&conn, "upcoming").len(), 1);
        toggle_inner(&conn, &high.id).unwrap();
        let input = QueryInput {
            view: "search".into(),
            search: "高优先级".into(),
            limit: 50,
            offset: 0,
        };
        assert_eq!(query_inner(&conn, &input, false).unwrap().len(), 1);
        assert_eq!(overview_inner(&conn).unwrap().overdue, 1);
    }
    #[test]
    fn validation_rejects_invalid_dates_priorities_and_cross_namespace_settings() {
        let mut data = input("任务");
        data.priority = 0;
        assert!(validate_input(&data).is_err());
        data.priority = 4;
        data.due_date = Some("2026-13-01".into());
        assert!(validate_input(&data).is_err());
        data.due_date = Some("2026-10-01".into());
        data.due_time = Some("25:00".into());
        assert!(validate_input(&data).is_err());
        assert!(setting_key("../quickbox.config").is_err());
        assert_eq!(
            setting_key("templates").unwrap(),
            "quickbox.tasks.settings.templates"
        );
    }
}
