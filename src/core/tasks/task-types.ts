export type ViewKey = "today" | "inbox" | "upcoming" | "all" | "completed" | "trash" | `list:${string}` | `tag:${string}`;
export type QueryView = ViewKey | "search";

export interface TaskList { id: string; name: string; icon: string; sort_order: number }
export interface Tag { id: string; name: string }
export interface Subtask { id: string; task_id: string; title: string; completed: boolean; sort_order: number }

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed";
  priority: 1 | 2 | 3 | 4;
  sort_order: number;
  list_id: string | null;
  list_name: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_minutes: number | null;
  recurrence: string | null;
  is_pinned: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tags: Tag[];
  subtasks: Subtask[];
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: number;
  list_id?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  reminder_minutes?: number | null;
  recurrence?: string | null;
  is_pinned?: boolean;
  tag_ids?: string[];
  subtasks?: Pick<Subtask, "id" | "title" | "completed" | "sort_order">[];
}

export interface QueryInput { view: QueryView; search?: string; limit?: number; offset?: number }
export interface Overview { pending_today: number; completed_today: number; overdue: number }

export interface ImportSubtaskItem { title: string; completed?: boolean }
export interface ImportTaskItem {
  title: string;
  description?: string;
  status?: "pending" | "completed";
  priority?: number;
  list_name?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  reminder_minutes?: number | null;
  recurrence?: string | null;
  is_pinned?: boolean;
  tag_names?: string[];
  subtasks?: ImportSubtaskItem[];
}
export interface ImportResult { imported: number; skipped: number; errors: string[] }

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: number;
  list_id: string | null;
  due_date: string | null;
  due_time: string | null;
  reminder_minutes: number | null;
  recurrence: string | null;
  tag_ids: string[];
  subtasks: { title: string }[];
  used_at: string;
}

export interface TaskReminder { id: string; title: string; due_date: string; due_time: string }
