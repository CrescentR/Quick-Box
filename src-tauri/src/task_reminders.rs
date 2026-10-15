use crate::{commands::tasks, errors::CommandError, storage};
use std::time::Duration;
use tauri::{Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindow};

const LABEL: &str = "task-reminder";

fn place(window: &WebviewWindow) {
    let monitor = window
        .app_handle()
        .get_webview_window("main")
        .and_then(|main| main.current_monitor().ok().flatten())
        .or_else(|| window.primary_monitor().ok().flatten());
    let (Some(monitor), Ok(size)) = (monitor, window.outer_size()) else {
        return;
    };
    let origin = monitor.position();
    let screen = monitor.size();
    let side = (18.0 * monitor.scale_factor()).round() as i32;
    let bottom = (64.0 * monitor.scale_factor()).round() as i32;
    let x = origin.x + screen.width.saturating_sub(size.width) as i32 - side;
    let y = origin.y + screen.height.saturating_sub(size.height) as i32 - bottom;
    let _ = window.set_position(PhysicalPosition::new(x.max(origin.x), y.max(origin.y)));
}

fn ensure_window(app: &tauri::AppHandle) -> Result<WebviewWindow, CommandError> {
    if let Some(window) = app.get_webview_window(LABEL) {
        return Ok(window);
    }
    // 提醒窗口复用用户的数据目录，不能另外落到系统 AppData。
    let directory = storage::location::resolve_directory(&storage::location::installation_directory()?)?;
    let window = tauri::WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("QuickBox · 任务提醒")
        .inner_size(390.0, 220.0)
        .resizable(false)
        .decorations(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .focused(false)
        .focusable(false)
        .visible(false)
        .data_directory(directory.join("webview"))
        .build()?;
    place(&window);
    Ok(window)
}

pub fn start(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        // 主窗口完成初始化后再读取提醒；每次重新打开当前库，跟随数据目录迁移。
        std::thread::sleep(Duration::from_secs(3));
        loop {
            match tasks::task_due_reminders(app.clone()) {
                Ok(notices) => {
                    if !notices.is_empty() || app.get_webview_window(LABEL).is_some() {
                        match ensure_window(&app) {
                            Ok(window) => {
                                // 新窗口的前端还会主动读取一次，避免首次监听尚未就绪而漏掉提醒。
                                let _ = window.emit("quickbox:task-reminders", &notices);
                            }
                            Err(error) => eprintln!("Task reminder window: {}", error.message),
                        }
                    }
                }
                Err(error) => eprintln!("Task reminders: {}", error.message),
            }
            std::thread::sleep(Duration::from_secs(15));
        }
    });
}

#[tauri::command]
pub fn task_show_reminder(app: tauri::AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window(LABEL) {
        place(&window);
        window.show()?;
    }
    Ok(())
}

#[tauri::command]
pub fn task_hide_reminder(app: tauri::AppHandle) -> Result<(), CommandError> {
    if let Some(window) = app.get_webview_window(LABEL) {
        window.hide()?;
    }
    Ok(())
}

#[tauri::command]
pub fn task_open_from_reminder(app: tauri::AppHandle, id: String) -> Result<(), CommandError> {
    if id.is_empty() || id.len() > 100 {
        return Err(CommandError::new("INVALID_TASK", "任务编号无效"));
    }
    if !tasks::task_due_reminders(app.clone())?.iter().any(|notice| notice.id == id) {
        return Err(CommandError::new("STALE_REMINDER", "提醒已更新或任务插件已停用，请刷新后重试"));
    }
    let window = app.get_webview_window("main").ok_or_else(|| {
        CommandError::new("WINDOW_UNAVAILABLE", "主窗口尚未就绪，请重新打开 QuickBox")
    })?;
    window.show()?;
    window.unminimize()?;
    window.set_focus()?;
    window.emit("quickbox:task-open", serde_json::json!({ "id": id }))?;
    #[cfg(target_os = "windows")]
    crate::platform::ensure_taskbar_icon(&window)?;
    Ok(())
}
