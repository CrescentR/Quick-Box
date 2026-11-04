//! 任务数据的 SQLite 读写，不依赖 Tauri 运行时，便于单元测试
use super::{model::*, validate::*};
use crate::errors::CommandError;
use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{
    params, params_from_iter, types::Value, Connection, OptionalExtension, Row, TransactionBehavior,
};
use std::collections::HashSet;

pub(super) fn map_task(row: &Row<'_>) -> rusqlite::Result<Task> {
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

pub(super) fn hydrate(conn: &Connection, task: &mut Task) -> Result<(), CommandError> {
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

pub(super) fn fetch_one(conn: &Connection, id: &str) -> Result<Task, CommandError> {
    validate_id(id)?;
    let mut task = conn
        .query_row(&format!("{SELECT} WHERE t.id=?"), [id], map_task)
        .optional()?
        .ok_or_else(|| CommandError::new("TASK_NOT_FOUND", "任务不存在"))?;
    hydrate(conn, &mut task)?;
    Ok(task)
}

pub(super) fn query_inner(
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

pub(super) fn validate_relations(
    conn: &Connection,
    id: &str,
    input: &TaskInput,
) -> Result<(), CommandError> {
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

pub(super) fn write_relations(
    conn: &Connection,
    id: &str,
    input: &TaskInput,
) -> Result<(), CommandError> {
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

pub(super) fn create_inner(conn: &Connection, input: &TaskInput) -> Result<Task, CommandError> {
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

pub(super) fn update_inner(
    conn: &Connection,
    id: &str,
    input: &TaskInput,
) -> Result<Task, CommandError> {
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

pub(super) fn next_date(date: &str, rule: &str) -> Option<String> {
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

pub(super) fn toggle_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
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

pub(super) fn delete_inner(conn: &Connection, id: &str, action: &str) -> Result<(), CommandError> {
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

pub(super) fn reorder_inner(
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

pub(super) fn lists_inner(conn: &Connection) -> Result<Vec<TaskList>, CommandError> {
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

pub(super) fn tags_inner(conn: &Connection) -> Result<Vec<Tag>, CommandError> {
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

pub(super) fn create_list_inner(conn: &Connection, name: &str) -> Result<TaskList, CommandError> {
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

pub(super) fn create_tag_inner(conn: &Connection, name: &str) -> Result<Tag, CommandError> {
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

pub(super) fn delete_list_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
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

pub(super) fn delete_tag_inner(conn: &Connection, id: &str) -> Result<(), CommandError> {
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

pub(super) fn overview_inner(conn: &Connection) -> Result<Overview, CommandError> {
    Ok(Overview {
        pending_today:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='pending' AND due_date<=date('now','localtime')",[],|r|r.get(0))?,
        completed_today:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='completed' AND date(completed_at)=date('now','localtime')",[],|r|r.get(0))?,
        overdue:conn.query_row("SELECT count(*) FROM qb_tasks WHERE deleted_at IS NULL AND status='pending' AND due_date<date('now','localtime')",[],|r|r.get(0))?,
    })
}

pub(super) fn import_item(conn: &Connection, item: ImportTaskInput) -> Result<(), CommandError> {
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

pub(super) fn import_inner(
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

pub(super) fn csv(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

pub(super) fn export_inner(conn: &Connection, format: &str) -> Result<String, CommandError> {
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

pub(super) fn setting_key(key: &str) -> Result<String, CommandError> {
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

pub(super) fn due_reminders_inner(conn: &Connection) -> Result<Vec<TaskReminder>, CommandError> {
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

pub(super) fn acknowledge_inner(conn: &Connection, ids: &[String]) -> Result<(), CommandError> {
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
