use crate::errors::CommandError;
use crate::platform;
use tauri::{LogicalSize, Manager, Size, WebviewWindow};

const DEFAULT_WINDOW_WIDTH: f64 = 1080.0;
const DEFAULT_WINDOW_HEIGHT: f64 = 720.0;

fn main_window(app: &tauri::AppHandle) -> Result<WebviewWindow, CommandError> {
    app.get_webview_window("main")
        .ok_or_else(|| CommandError::new("WINDOW_NOT_FOUND", "Launcher window not found"))
}

pub fn toggle_launcher_window_impl(window: &WebviewWindow) -> Result<(), CommandError> {
    if window.is_visible()? {
        window.hide()?;
        return Ok(());
    }

    window.center()?;
    window.show()?;
    window.set_focus()?;
    #[cfg(target_os = "windows")]
    platform::ensure_taskbar_icon(window)?;
    Ok(())
}

#[tauri::command]
pub fn show_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = main_window(&app)?;

    window.center()?;
    window.show()?;
    window.set_focus()?;
    #[cfg(target_os = "windows")]
    platform::ensure_taskbar_icon(&window)?;
    Ok(())
}

#[tauri::command]
pub fn hide_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = main_window(&app)?;

    window.hide()?;
    Ok(())
}

#[tauri::command]
pub fn toggle_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = main_window(&app)?;

    toggle_launcher_window_impl(&window)
}

#[tauri::command]
pub fn minimize_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    main_window(&app)?.minimize()?;
    Ok(())
}

#[tauri::command]
pub fn maximize_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    main_window(&app)?.maximize()?;
    Ok(())
}

#[tauri::command]
pub fn unmaximize_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    main_window(&app)?.unmaximize()?;
    Ok(())
}

#[tauri::command]
pub fn close_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    main_window(&app)?.close()?;
    Ok(())
}

#[tauri::command]
pub fn reset_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = main_window(&app)?;
    window.unmaximize()?;
    window.set_size(Size::Logical(LogicalSize {
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
    }))?;
    window.center()?;
    window.show()?;
    window.set_focus()?;
    #[cfg(target_os = "windows")]
    platform::ensure_taskbar_icon(&window)?;
    Ok(())
}

#[tauri::command]
pub fn is_launcher_window_maximized(app: tauri::AppHandle) -> Result<bool, CommandError> {
    Ok(main_window(&app)?.is_maximized()?)
}
