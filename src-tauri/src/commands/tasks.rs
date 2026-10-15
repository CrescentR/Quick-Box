//! Task 的本地任务能力。每次调用从 QuickBox 当前数据目录打开数据库，随统一存储迁移。
use crate::{errors::CommandError, storage};
use chrono::{Datelike, Duration, Local, NaiveDate, NaiveTime};
use rusqlite::{
    params, params_from_iter, types::Value, Connection, OptionalExtension, Row, TransactionBehavior,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

const SETTINGS_PREFIX: &str = "quickbox.tasks.settings.";
const MAX_TASKS: i64 = 100_000;

#[derive(Debug, Clone, Serialize)]
pub struct TaskList {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub sort_order: i64,
}
#[derive(Debug, Clone, Serialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subtask {
    pub id: String,
    #[serde(default)]
    pub task_id: Option<String>,
    pub title: String,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub sort_order: i64,
}
#[derive(Debug, Clone, Serialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: i64,
    pub sort_order: i64,
    pub list_id: Option<String>,
    pub list_name: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub reminder_minutes: Option<i64>,
    pub recurrence: Option<String>,
    pub is_pinned: bool,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
    pub tags: Vec<Tag>,
    pub subtasks: Vec<Subtask>,
}
fn default_priority() -> i64 {
    4
}
fn default_limit() -> i64 {
    50
}
fn default_status() -> String {
    "pending".into()
}
#[derive(Debug, Clone, Deserialize)]
pub struct TaskInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_priority")]
    pub priority: i64,
    pub list_id: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub reminder_minutes: Option<i64>,
    pub recurrence: Option<String>,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub tag_ids: Vec<String>,
    #[serde(default)]
    pub subtasks: Vec<Subtask>,
}
#[derive(Debug, Deserialize)]
pub struct QueryInput {
    pub view: String,
    #[serde(default)]
    pub search: String,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}
#[derive(Debug, Serialize)]
pub struct Overview {
    pub pending_today: i64,
    pub completed_today: i64,
    pub overdue: i64,
}
#[derive(Debug, Deserialize)]
pub struct ImportSubtaskInput {
    pub title: String,
    #[serde(default)]
    pub completed: bool,
}
#[derive(Debug, Deserialize)]
pub struct ImportTaskInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_priority")]
    pub priority: i64,
    pub list_name: Option<String>,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub reminder_minutes: Option<i64>,
    pub recurrence: Option<String>,
    #[serde(default)]
    pub is_pinned: bool,
    #[serde(default)]
    pub tag_names: Vec<String>,
    #[serde(default)]
    pub subtasks: Vec<ImportSubtaskInput>,
}
#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub imported: i64,
    pub skipped: i64,
    pub errors: Vec<String>,
}
#[derive(Debug, Clone, Serialize)]
pub struct TaskReminder {
    pub id: String,
    pub title: String,
    pub due_date: String,
    pub due_time: String,
}

fn invalid(message: &str) -> CommandError {
    CommandError::new("INVALID_TASK", message)
}
fn new_id() -> String {
    Uuid::new_v4().to_string()
}
fn now() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}
fn validate_id(id: &str) -> Result<(), CommandError> {
    if id.is_empty()
        || id.len() > 80
        || !id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
    {
        return Err(invalid("任务、清单或标签标识格式无效"));
    }
    Ok(())
}
fn validate_name(name: &str) -> Result<(), CommandError> {
    if name.trim().is_empty() || name.len() > 240 || name.contains('\0') {
        return Err(invalid("名称不能为空且不能超过 240 字节"));
    }
    Ok(())
}
fn validate_input(input: &TaskInput) -> Result<(), CommandError> {
    if input.title.trim().is_empty()
        || input.title.len() > 2000
        || input.title.contains('\0')
        || input.description.len() > 200_000
    {
        return Err(invalid(
            "任务标题不能为空（最多 2000 字节），说明最多 200 KB",
        ));
    }
    if !(1..=4).contains(&input.priority) {
        return Err(invalid("优先级必须为 P1 到 P4"));
    }
    if let Some(id) = &input.list_id {
        validate_id(id)?;
    }
    if let Some(date) = &input.due_date {
        let parsed = NaiveDate::parse_from_str(date, "%Y-%m-%d")
            .map_err(|_| invalid("截止日期格式必须为 YYYY-MM-DD"))?;
        if !(1..=9999).contains(&parsed.year()) || parsed.format("%Y-%m-%d").to_string() != *date {
            return Err(invalid("截止日期无效"));
        }
    }
    if let Some(time) = &input.due_time {
        let parsed = NaiveTime::parse_from_str(time, "%H:%M")
            .map_err(|_| invalid("截止时间格式必须为 HH:MM"))?;
        if input.due_date.is_none() || parsed.format("%H:%M").to_string() != *time {
            return Err(invalid("截止时间需要有效日期，格式为 HH:MM"));
        }
    }
    if let Some(minutes) = input.reminder_minutes {
        if !(0..=525_600).contains(&minutes) || input.due_date.is_none() || input.due_time.is_none()
        {
            return Err(invalid(
                "提醒需要截止日期和时间，提前量必须在 0 到 525600 分钟之间",
            ));
        }
    }
    if let Some(rule) = &input.recurrence {
        if !["daily", "weekdays", "weekly", "monthly", "yearly"].contains(&rule.as_str())
            || input.due_date.is_none()
        {
            return Err(invalid("重复任务需要截止日期和有效重复规则"));
        }
    }
    if input.tag_ids.len() > 100 || input.subtasks.len() > 200 {
        return Err(invalid("每个任务最多 100 个标签和 200 个子任务"));
    }
    let mut tag_ids = HashSet::new();
    for id in &input.tag_ids {
        validate_id(id)?;
        if !tag_ids.insert(id) {
            return Err(invalid("不能重复关联同一标签"));
        }
    }
    let mut sub_ids = HashSet::new();
    for sub in &input.subtasks {
        if sub.title.trim().is_empty() || sub.title.len() > 2000 || sub.title.contains('\0') {
            return Err(invalid("子任务标题不能为空且最多 2000 字节"));
        }
        if !sub.id.is_empty() {
            validate_id(&sub.id)?;
            if !sub_ids.insert(&sub.id) {
                return Err(invalid("子任务标识不能重复"));
            }
        }
    }
    Ok(())
}

const SELECT: &str = "SELECT t.id,t.title,t.description,t.status,t.priority,t.sort_order,t.list_id,l.name,t.due_date,t.due_time,t.reminder_minutes,t.recurrence,t.is_pinned,t.completed_at,t.created_at,t.updated_at,t.deleted_at FROM qb_tasks t LEFT JOIN qb_task_lists l ON l.id=t.list_id";
fn map_task(row: &Row<'_>) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        sort_order: row.get(5)?,
        list_id: row.get(6)?,
        list_name: row.get(7)?,
        due_date: row.get(8)?,
        due_time: row.get(9)?,
        reminder_minutes: row.get(10)?,
        recurrence: row.get(11)?,
        is_pinned: row.get::<_, i64>(12)? != 0,
        completed_at: row.get(13)?,
        created_at: row.get(14)?,
        updated_at: row.get(15)?,
        deleted_at: row.get(16)?,
        tags: vec![],
        subtasks: vec![],
    })
}
fn hydrate(conn: &Connection, task: &mut Task) -> Result<(), CommandError> {
    let mut stmt = conn.prepare("SELECT l.id,l.name FROM qb_task_labels l JOIN qb_task_tags x ON l.id=x.tag_id WHERE x.task_id=? ORDER BY l.name")?;
    task.tags = stmt
        .query_map([&task.id], |r| {
            Ok(Tag {
                id: r.get(0)?,
                name: r.get(1)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    let mut stmt = conn.prepare("SELECT id,task_id,title,completed,sort_order FROM qb_task_subtasks WHERE task_id=? ORDER BY sort_order,id")?;
    task.subtasks = stmt
        .query_map([&task.id], |r| {
            Ok(Subtask {
                id: r.get(0)?,
                task_id: r.get(1)?,
                title: r.get(2)?,
                completed: r.get::<_, i64>(3)? != 0,
                sort_order: r.get(4)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(())
}
fn fetch_one(conn: &Connection, id: &str) -> Result<Task, CommandError> {
    validate_id(id)?;
    let mut task = conn
        .query_row(&format!("{SELECT} WHERE t.id=?"), [id], map_task)
        .optional()?
        .ok_or_else(|| CommandError::new("TASK_NOT_FOUND", "任务不存在"))?;
    hydrate(conn, &mut task)?;
    Ok(task)
}
fn query_inner(
    conn: &Connection,
    input: &QueryInput,
    export: bool,
) -> Result<Vec<Task>, CommandError> {
    if input.search.len() > 2000 || input.offset < 0 || input.offset > MAX_TASKS {
        return Err(invalid("搜索或分页参数无效"));
    }
    let mut values = vec![];
    let condition = match input.view.as_str() {
        "trash" => "t.deleted_at IS NOT NULL",
        "completed" => "t.deleted_at IS NULL AND t.status='completed'",
        "today" => "t.deleted_at IS NULL AND t.status='pending' AND t.due_date<=date('now','localtime')",
        "inbox" => "t.deleted_at IS NULL AND t.status='pending' AND t.list_id IS NULL",
        "upcoming" => "t.deleted_at IS NULL AND t.status='pending' AND t.due_date>date('now','localtime') AND t.due_date<=date('now','localtime','+30 day')",
        "search" => "t.deleted_at IS NULL",
        "all" if export => "t.deleted_at IS NULL",
        "all" => "t.deleted_at IS NULL AND t.status='pending'",
        view if view.starts_with("list:") => {
            validate_id(&view[5..])?; values.push(Value::Text(view[5..].to_string()));
            "t.deleted_at IS NULL AND t.status='pending' AND t.list_id=?"
        },
        view if view.starts_with("tag:") => {
            validate_id(&view[4..])?; values.push(Value::Text(view[4..].to_string()));
            "t.deleted_at IS NULL AND t.status='pending' AND EXISTS(SELECT 1 FROM qb_task_tags tt WHERE tt.task_id=t.id AND tt.tag_id=?)"
        },
        _ => return Err(invalid("任务视图无效")),
    };
    let mut sql = format!("{SELECT} WHERE {condition}");
    if !input.search.trim().is_empty() {
        sql.push_str(" AND (lower(t.title) LIKE ? ESCAPE '\\' OR lower(t.description) LIKE ? ESCAPE '\\' OR lower(COALESCE(l.name,'')) LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM qb_task_tags tx JOIN qb_task_labels tg ON tg.id=tx.tag_id WHERE tx.task_id=t.id AND lower(tg.name) LIKE ? ESCAPE '\\'))");
        let pattern = input
            .search
            .trim()
            .to_lowercase()
            .replace('\\', "\\\\")
            .replace('%', "\\%")
            .replace('_', "\\_");
        let value = Value::Text(format!("%{pattern}%"));
        values.extend([value.clone(), value.clone(), value.clone(), value]);
    }
    sql.push_str(" ORDER BY t.is_pinned DESC,t.priority,t.sort_order,CASE WHEN t.due_date<date('now','localtime') THEN 0 ELSE 1 END,CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,t.due_date,CASE WHEN t.due_time IS NULL THEN 1 ELSE 0 END,t.due_time,t.created_at DESC,t.id LIMIT ? OFFSET ?");
    values.push(Value::Integer(
        input.limit.clamp(1, if export { MAX_TASKS } else { 200 }),
    ));
    values.push(Value::Integer(input.offset));
    let mut stmt = conn.prepare(&sql)?;
    let mut tasks: Vec<Task> = stmt
        .query_map(params_from_iter(values), map_task)?
        .collect::<Result<_, _>>()?;
    drop(stmt);
    for task in &mut tasks {
        hydrate(conn, task)?;
    }
    Ok(tasks)
}
fn validate_relations(conn: &Connection, id: &str, input: &TaskInput) -> Result<(), CommandError> {
    if let Some(list_id) = &input.list_id {
        if !conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM qb_task_lists WHERE id=?)",
            [list_id],
            |r| r.get::<_, bool>(0),
        )? {
            return Err(invalid("所选清单不存在"));
        }
    }
    for tag_id in &input.tag_ids {
        if !conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM qb_task_labels WHERE id=?)",
            [tag_id],
            |r| r.get::<_, bool>(0),
        )? {
            return Err(invalid("所选标签不存在"));
        }
    }
    for sub in &input.subtasks {
        if sub.id.is_empty() {
            continue;
        }
        let owner: Option<String> = conn
            .query_row(
                "SELECT task_id FROM qb_task_subtasks WHERE id=?",
                [&sub.id],
                |r| r.get(0),
            )
            .optional()?;
        if owner.as_deref().is_some_and(|owner| owner != id) {
            return Err(invalid("子任务标识已属于其他任务"));
        }
    }
    Ok(())
}
fn write_relations(conn: &Connection, id: &str, input: &TaskInput) -> Result<(), CommandError> {
    conn.execute("DELETE FROM qb_task_tags WHERE task_id=?", [id])?;
    for tag in &input.tag_ids {
        conn.execute(
            "INSERT INTO qb_task_tags(task_id,tag_id) VALUES(?,?)",
            params![id, tag],
        )?;
    }
    conn.execute("DELETE FROM qb_task_subtasks WHERE task_id=?", [id])?;
    for (index, sub) in input.subtasks.iter().enumerate() {
        let sub_id = if sub.id.is_empty() {
            new_id()
        } else {
            sub.id.clone()
        };
        conn.execute(
            "INSERT INTO qb_task_subtasks(id,task_id,title,completed,sort_order) VALUES(?,?,?,?,?)",
            params![
                sub_id,
                id,
                sub.title.trim(),
                sub.completed as i64,
                index as i64
            ],
        )?;
    }
    Ok(())
}
fn create_inner(conn: &Connection, input: &TaskInput) -> Result<Task, CommandError> {
    validate_input(input)?;
    let count: i64 = conn.query_row("SELECT count(*) FROM qb_tasks", [], |r| r.get(0))?;
    if count >= MAX_TASKS {
        return Err(invalid("任务总数已达 100000 条，请清理回收站"));
    }
    let id = new_id();
    validate_relations(conn, &id, input)?;
    let stamp = now();
    let order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order),-1)+1 FROM qb_tasks",
        [],
        |r| r.get(0),
    )?;
    conn.execute("INSERT INTO qb_tasks(id,title,description,priority,sort_order,list_id,due_date,due_time,reminder_minutes,recurrence,is_pinned,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",params![id,input.title.trim(),input.description,input.priority,order,input.list_id,input.due_date,input.due_time,input.reminder_minutes,input.recurrence,input.is_pinned as i64,stamp,stamp])?;
    write_relations(conn, &id, input)?;
    fetch_one(conn, &id)
}
fn update_inner(conn: &Connection, id: &str, input: &TaskInput) -> Result<Task, CommandError> {
    validate_input(input)?;
    let previous = fetch_one(conn, id)?;
    if previous.deleted_at.is_some() {
        return Err(invalid("请先恢复回收站中的任务再编辑"));
    }
    validate_relations(conn, id, input)?;
    conn.execute("UPDATE qb_tasks SET title=?1,description=?2,priority=?3,list_id=?4,due_date=?5,due_time=?6,reminder_minutes=?7,recurrence=?8,is_pinned=?9,notified_at=CASE WHEN due_date IS NOT ?5 OR due_time IS NOT ?6 OR reminder_minutes IS NOT ?7 THEN NULL ELSE notified_at END,updated_at=?10 WHERE id=?11",params![input.title.trim(),input.description,input.priority,input.list_id,input.due_date,input.due_time,input.reminder_minutes,input.recurrence,input.is_pinned as i64,now(),id])?;
    write_relations(conn, id, input)?;
    fetch_one(conn, id)
}
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

fn next_date(date: &str, rule: &str) -> Option<String> {
    let date = NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
    let next = match rule {
        "daily" => date.checked_add_signed(Duration::days(1))?,
        "weekly" => date.checked_add_signed(Duration::days(7))?,
        "weekdays" => {
            let mut next = date.checked_add_signed(Duration::days(1))?;
            while next.weekday().number_from_monday() > 5 {
                next = next.checked_add_signed(Duration::days(1))?;
            }
            next
        }
        "monthly" => date.checked_add_months(chrono::Months::new(1))?,
        "yearly" => date.checked_add_months(chrono::Months::new(12))?,
        _ => return None,
    };
    if next.year() > 9999 {
        return None;
    }
    Some(next.format("%Y-%m-%d").to_string())
}
fn toggle_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
    let task = fetch_one(conn, id)?;
    if task.deleted_at.is_some() {
        return Err(invalid("回收站任务不能标记完成"));
    }
    let stamp = now();
    if task.status == "completed" {
        conn.execute(
            "UPDATE qb_tasks SET status='pending',completed_at=NULL,updated_at=? WHERE id=?",
            params![stamp, id],
        )?;
    } else {
        conn.execute(
            "UPDATE qb_tasks SET status='completed',completed_at=?,updated_at=? WHERE id=?",
            params![stamp, stamp, id],
        )?;
        if let (Some(date), Some(rule)) = (&task.due_date, &task.recurrence) {
            let generated:bool=conn.query_row("SELECT EXISTS(SELECT 1 FROM qb_task_recurrences WHERE source_id=? AND due_date=? AND recurrence=?)",params![id,date,rule],|r|r.get(0))?;
            if !generated {
                let next = next_date(date, rule)
                    .ok_or_else(|| invalid("无法生成下一次重复日期，请调整截止日期"))?;
                let input = TaskInput {
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    list_id: task.list_id,
                    due_date: Some(next),
                    due_time: task.due_time,
                    reminder_minutes: task.reminder_minutes,
                    recurrence: task.recurrence.clone(),
                    is_pinned: task.is_pinned,
                    tag_ids: task.tags.into_iter().map(|t| t.id).collect(),
                    subtasks: task
                        .subtasks
                        .into_iter()
                        .map(|s| Subtask {
                            id: String::new(),
                            completed: false,
                            ..s
                        })
                        .collect(),
                };
                let next_task = create_inner(conn, &input)?;
                conn.execute("INSERT INTO qb_task_recurrences(source_id,due_date,recurrence,next_id) VALUES(?,?,?,?)",params![id,date,rule,next_task.id])?;
            }
        }
    }
    Ok(())
}
#[tauri::command]
pub fn task_toggle(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    let mut db = storage::open_connection(&app)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    toggle_inner(&tx, &id)?;
    tx.commit()?;
    Ok(())
}
fn delete_inner(conn: &Connection, id: &str, action: &str) -> Result<(), CommandError> {
    let task = fetch_one(conn, id)?;
    let stamp = now();
    match action {
        "delete" => {
            conn.execute(
                "UPDATE qb_tasks SET deleted_at=?,updated_at=? WHERE id=?",
                params![stamp, stamp, id],
            )?;
        }
        "restore" => {
            conn.execute(
                "UPDATE qb_tasks SET deleted_at=NULL,updated_at=? WHERE id=?",
                params![stamp, id],
            )?;
        }
        "purge" => {
            if task.deleted_at.is_none() {
                return Err(invalid("请先移入回收站，再永久删除任务"));
            }
            conn.execute("DELETE FROM qb_task_tags WHERE task_id=?", [id])?;
            conn.execute("DELETE FROM qb_task_subtasks WHERE task_id=?", [id])?;
            // 仅删除以本任务为来源的去重记录；上期记录保留，防止上期撤销后重复生成。
            conn.execute("DELETE FROM qb_task_recurrences WHERE source_id=?", [id])?;
            conn.execute("DELETE FROM qb_tasks WHERE id=?", [id])?;
        }
        _ => return Err(invalid("任务操作无效")),
    }
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
fn reorder_inner(
    conn: &Connection,
    ids: &[String],
    dragged_id: &str,
    priority: i64,
) -> Result<(), CommandError> {
    if ids.is_empty()
        || ids.len() > 10_000
        || !(1..=4).contains(&priority)
        || !ids.iter().any(|id| id == dragged_id)
    {
        return Err(invalid("任务排序参数无效"));
    }
    let mut unique = HashSet::new();
    for id in ids {
        validate_id(id)?;
        if !unique.insert(id) {
            return Err(invalid("任务排序不能包含重复标识"));
        }
        let task = fetch_one(conn, id)?;
        if task.deleted_at.is_some() || task.status != "pending" {
            return Err(invalid("只能排序未删除的待办任务"));
        }
    }
    conn.execute(
        "UPDATE qb_tasks SET priority=?,updated_at=? WHERE id=?",
        params![priority, now(), dragged_id],
    )?;
    for (index, id) in ids.iter().enumerate() {
        conn.execute(
            "UPDATE qb_tasks SET sort_order=? WHERE id=?",
            params![index as i64, id],
        )?;
    }
    Ok(())
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

fn lists_inner(conn: &Connection) -> Result<Vec<TaskList>, CommandError> {
    let mut stmt =
        conn.prepare("SELECT id,name,icon,sort_order FROM qb_task_lists ORDER BY sort_order,name")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(TaskList {
                id: r.get(0)?,
                name: r.get(1)?,
                icon: r.get(2)?,
                sort_order: r.get(3)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(rows)
}
fn tags_inner(conn: &Connection) -> Result<Vec<Tag>, CommandError> {
    let mut stmt = conn.prepare("SELECT id,name FROM qb_task_labels ORDER BY name")?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Tag {
                id: r.get(0)?,
                name: r.get(1)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(rows)
}
fn create_list_inner(conn: &Connection, name: &str) -> Result<TaskList, CommandError> {
    validate_name(name)?;
    let name = name.trim();
    if let Some(list) = conn
        .query_row(
            "SELECT id,name,icon,sort_order FROM qb_task_lists WHERE name=?",
            [name],
            |r| {
                Ok(TaskList {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    icon: r.get(2)?,
                    sort_order: r.get(3)?,
                })
            },
        )
        .optional()?
    {
        return Ok(list);
    }
    let lists = lists_inner(conn)?;
    if lists.len() >= 1000 {
        return Err(invalid("最多创建 1000 个任务清单"));
    }
    let list = TaskList {
        id: new_id(),
        name: name.into(),
        icon: "list".into(),
        sort_order: lists.iter().map(|l| l.sort_order).max().unwrap_or(-1) + 1,
    };
    conn.execute(
        "INSERT INTO qb_task_lists(id,name,icon,sort_order) VALUES(?,?,?,?)",
        params![list.id, list.name, list.icon, list.sort_order],
    )?;
    Ok(list)
}
fn create_tag_inner(conn: &Connection, name: &str) -> Result<Tag, CommandError> {
    validate_name(name)?;
    let name = name.trim();
    if let Some(tag) = conn
        .query_row(
            "SELECT id,name FROM qb_task_labels WHERE name=?",
            [name],
            |r| {
                Ok(Tag {
                    id: r.get(0)?,
                    name: r.get(1)?,
                })
            },
        )
        .optional()?
    {
        return Ok(tag);
    }
    let count: i64 = conn.query_row("SELECT count(*) FROM qb_task_labels", [], |r| r.get(0))?;
    if count >= 5000 {
        return Err(invalid("最多创建 5000 个任务标签"));
    }
    let tag = Tag {
        id: new_id(),
        name: name.into(),
    };
    conn.execute(
        "INSERT INTO qb_task_labels(id,name) VALUES(?,?)",
        params![tag.id, tag.name],
    )?;
    Ok(tag)
}
fn delete_list_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
    validate_id(id)?;
    if !conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM qb_task_lists WHERE id=?)",
        [id],
        |r| r.get::<_, bool>(0),
    )? {
        return Err(invalid("清单不存在"));
    }
    conn.execute(
        "UPDATE qb_tasks SET list_id=NULL,updated_at=? WHERE list_id=?",
        params![now(), id],
    )?;
    conn.execute("DELETE FROM qb_task_lists WHERE id=?", [id])?;
    Ok(())
}
fn delete_tag_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
    validate_id(id)?;
    if !conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM qb_task_labels WHERE id=?)",
        [id],
        |r| r.get::<_, bool>(0),
    )? {
        return Err(invalid("标签不存在"));
    }
    conn.execute("DELETE FROM qb_task_tags WHERE tag_id=?", [id])?;
    conn.execute("DELETE FROM qb_task_labels WHERE id=?", [id])?;
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
fn overview_inner(conn: &Connection) -> Result<Overview, CommandError> {
    Ok(Overview {
        pending_today:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='pending' AND due_date<=date('now','localtime')",[],|r|r.get(0))?,
        completed_today:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='completed' AND date(completed_at)=date('now','localtime')",[],|r|r.get(0))?,
        overdue:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='pending' AND due_date<date('now','localtime')",[],|r|r.get(0))?,
    })
}
#[tauri::command]
pub fn task_overview(app: tauri::AppHandle) -> Result<Overview, CommandError> {
    let db = storage::open_connection(&app)?;
    overview_inner(&db)
}

fn import_item(conn: &Connection, item: ImportTaskInput) -> Result<(), CommandError> {
    if item.status != "pending" && item.status != "completed" {
        return Err(invalid("任务状态必须为 pending 或 completed"));
    }
    if item.tag_names.len() > 100 {
        return Err(invalid("每个任务最多 100 个标签"));
    }
    let mut input = TaskInput {
        title: item.title,
        description: item.description,
        priority: item.priority,
        list_id: None,
        due_date: item.due_date,
        due_time: item.due_time,
        reminder_minutes: item.reminder_minutes,
        recurrence: item.recurrence,
        is_pinned: item.is_pinned,
        tag_ids: vec![],
        subtasks: item
            .subtasks
            .into_iter()
            .map(|s| Subtask {
                id: String::new(),
                task_id: None,
                title: s.title,
                completed: s.completed,
                sort_order: 0,
            })
            .collect(),
    };
    validate_input(&input)?;
    if let Some(name) = item.list_name {
        if !name.trim().is_empty() && name.trim() != "收集箱" {
            input.list_id = Some(create_list_inner(conn, &name)?.id);
        }
    }
    let mut seen = HashSet::new();
    for name in item.tag_names {
        validate_name(&name)?;
        let name = name.trim();
        if seen.insert(name.to_string()) {
            input.tag_ids.push(create_tag_inner(conn, name)?.id);
        }
    }
    let task = create_inner(conn, &input)?;
    if item.status == "completed" {
        conn.execute(
            "UPDATE qb_tasks SET status='completed',completed_at=? WHERE id=?",
            params![now(), task.id],
        )?;
    }
    Ok(())
}
fn import_inner(
    conn: &mut Connection,
    items: Vec<ImportTaskInput>,
) -> Result<ImportResult, CommandError> {
    if items.len() > 10_000 {
        return Err(invalid("单次最多导入 10000 条任务"));
    }
    let bytes: usize = items
        .iter()
        .map(|item| {
            item.title.len()
                + item.description.len()
                + item.subtasks.iter().map(|s| s.title.len()).sum::<usize>()
        })
        .sum();
    if bytes > 50_000_000 {
        return Err(invalid("导入内容不能超过 50 MB"));
    }
    let mut tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let mut result = ImportResult {
        imported: 0,
        skipped: 0,
        errors: vec![],
    };
    for (index, item) in items.into_iter().enumerate() {
        // 每条任务一个保存点，坏任务连同刚创建的清单/标签一并回滚。
        let savepoint = tx.savepoint()?;
        match import_item(&savepoint, item) {
            Ok(()) => {
                savepoint.commit()?;
                result.imported += 1;
            }
            Err(error) => {
                result.skipped += 1;
                if result.errors.len() < 20 {
                    result
                        .errors
                        .push(format!("第 {} 条：{}", index + 1, error.message));
                }
                // Drop 自动 ROLLBACK TO / RELEASE 此保存点，继续下一条。
            }
        }
    }
    tx.commit()?;
    Ok(result)
}
#[tauri::command]
pub fn task_import(
    app: tauri::AppHandle,
    items: Vec<ImportTaskInput>,
) -> Result<ImportResult, CommandError> {
    let mut db = storage::open_connection(&app)?;
    import_inner(&mut db, items)
}
fn csv(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
fn export_inner(conn: &Connection, format: &str) -> Result<String, CommandError> {
    if !["json", "csv", "markdown"].contains(&format) {
        return Err(invalid("不支持的导出格式"));
    }
    let tasks = query_inner(
        conn,
        &QueryInput {
            view: "all".into(),
            search: String::new(),
            limit: MAX_TASKS,
            offset: 0,
        },
        true,
    )?;
    match format {
        "json" => serde_json::to_string_pretty(&tasks).map_err(|error| {
            CommandError::with_details("TASK_EXPORT", "任务导出失败", error.to_string())
        }),
        "csv" => {
            let mut out = "标题,描述,状态,优先级,列表,日期,时间,标签,创建时间\n".to_string();
            for task in tasks {
                out.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{}\n",
                    csv(&task.title),
                    csv(&task.description),
                    task.status,
                    task.priority,
                    csv(task.list_name.as_deref().unwrap_or("收集箱")),
                    task.due_date.unwrap_or_default(),
                    task.due_time.unwrap_or_default(),
                    csv(&task
                        .tags
                        .iter()
                        .map(|tag| tag.name.as_str())
                        .collect::<Vec<_>>()
                        .join(";")),
                    task.created_at
                ));
            }
            Ok(out)
        }
        "markdown" => {
            let mut out = "# Task\n\n".to_string();
            for task in tasks {
                out.push_str(&format!(
                    "- [{}] {}{}{}\n",
                    if task.status == "completed" { "x" } else { " " },
                    task.title.replace('\n', " "),
                    task.due_date
                        .map(|date| format!(" ({date})"))
                        .unwrap_or_default(),
                    if task.description.is_empty() {
                        String::new()
                    } else {
                        format!(" — {}", task.description.replace('\n', " "))
                    }
                ));
            }
            Ok(out)
        }
        _ => unreachable!(),
    }
}
#[tauri::command]
pub fn task_export(app: tauri::AppHandle, format: String) -> Result<String, CommandError> {
    let db = storage::open_connection(&app)?;
    export_inner(&db, &format)
}
fn setting_key(key: &str) -> Result<String, CommandError> {
    if key.is_empty()
        || key.len() > 80
        || !key
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-' || c == b'.')
    {
        return Err(invalid("任务设置键无效"));
    }
    Ok(format!("{SETTINGS_PREFIX}{key}"))
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

fn due_reminders_inner(conn: &Connection) -> Result<Vec<TaskReminder>, CommandError> {
    let enabled: bool = conn.query_row(
        "SELECT COALESCE((SELECT enabled FROM plugins WHERE id='official.task-tool'),1)",
        [],
        |r| r.get(0),
    )?;
    if !enabled {
        return Ok(vec![]);
    }
    let mut stmt=conn.prepare("SELECT id,title,due_date,due_time FROM qb_tasks WHERE deleted_at IS NULL AND status='pending' AND due_date IS NOT NULL AND due_time IS NOT NULL AND reminder_minutes IS NOT NULL AND notified_at IS NULL AND datetime(due_date||' '||due_time,'-'||reminder_minutes||' minutes')<=datetime('now','localtime') ORDER BY due_date,due_time,id LIMIT 100")?;
    let reminders = stmt
        .query_map([], |r| {
            Ok(TaskReminder {
                id: r.get(0)?,
                title: r.get(1)?,
                due_date: r.get(2)?,
                due_time: r.get(3)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(reminders)
}
#[tauri::command]
pub fn task_due_reminders(app: tauri::AppHandle) -> Result<Vec<TaskReminder>, CommandError> {
    let db = storage::open_connection(&app)?;
    due_reminders_inner(&db)
}
fn acknowledge_inner(conn: &Connection, ids: &[String]) -> Result<(), CommandError> {
    if ids.len() > 1000 {
        return Err(invalid("单次最多确认 1000 条提醒"));
    }
    for id in ids {
        validate_id(id)?;
    }
    for id in ids {
        // 提醒弹窗可能仍显示旧计划；重新核实当前计划已到期且插件启用，避免误确认未来提醒。
        conn.execute(
            "UPDATE qb_tasks SET notified_at=? WHERE id=? AND notified_at IS NULL AND deleted_at IS NULL AND status='pending' AND due_date IS NOT NULL AND due_time IS NOT NULL AND reminder_minutes IS NOT NULL AND datetime(due_date||' '||due_time,'-'||reminder_minutes||' minutes')<=datetime('now','localtime') AND COALESCE((SELECT enabled FROM plugins WHERE id='official.task-tool'),1)=1",
            params![now(), id],
        )?;
    }
    Ok(())
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
        acknowledge_inner(&conn, &[task.id.clone()]).unwrap();
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
        acknowledge_inner(&conn, &[task.id.clone()]).unwrap();
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
