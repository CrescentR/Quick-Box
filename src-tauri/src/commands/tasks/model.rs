//! 任务、清单、标签等数据结构与默认值
use serde::{Deserialize, Serialize};

pub(super) const SETTINGS_PREFIX: &str = "quickbox.tasks.settings.";

pub(super) const MAX_TASKS: i64 = 100_000;

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

pub(super) fn default_priority() -> i64 {
    4
}

pub(super) fn default_limit() -> i64 {
    50
}

pub(super) fn default_status() -> String {
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

pub(super) const SELECT: &str = "SELECT t.id,t.title,t.description,t.status,t.priority,t.sort_order,t.list_id,l.name,t.due_date,t.due_time,t.reminder_minutes,t.recurrence,t.is_pinned,t.completed_at,t.created_at,t.updated_at,t.deleted_at FROM qb_tasks t LEFT JOIN qb_task_lists l ON l.id=t.list_id";
