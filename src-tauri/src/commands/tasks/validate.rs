//! 命令入参校验
use super::model::*;
use crate::errors::CommandError;
use chrono::{Datelike, Local, NaiveDate, NaiveTime};
use std::collections::HashSet;
use uuid::Uuid;

pub(super) fn invalid(message: &str) -> CommandError {
    CommandError::new("INVALID_TASK", message)
}

pub(super) fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub(super) fn now() -> String {
    Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

pub(super) fn validate_id(id: &str) -> Result<(), CommandError> {
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

pub(super) fn validate_name(name: &str) -> Result<(), CommandError> {
    if name.trim().is_empty() || name.len() > 240 || name.contains('\0') {
        return Err(invalid("名称不能为空且不能超过 240 字节"));
    }
    Ok(())
}

pub(super) fn validate_input(input: &TaskInput) -> Result<(), CommandError> {
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
