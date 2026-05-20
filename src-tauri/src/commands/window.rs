use crate::errors::CommandError;
use tauri::{Manager, WebviewWindow};

pub fn toggle_launcher_window_impl(window: &WebviewWindow) -> Result<(), CommandError> {
    if window.is_visible()? {
        window.hide()?;
        return Ok(());
    }

    window.center()?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

#[tauri::command]
pub fn show_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::new("WINDOW_NOT_FOUND", "Launcher window not found"))?;

    window.center()?;
    window.show()?;
    window.set_focus()?;
    Ok(())
}

#[tauri::command]
pub fn hide_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::new("WINDOW_NOT_FOUND", "Launcher window not found"))?;

    window.hide()?;
    Ok(())
}

#[tauri::command]
pub fn toggle_launcher_window(app: tauri::AppHandle) -> Result<(), CommandError> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| CommandError::new("WINDOW_NOT_FOUND", "Launcher window not found"))?;

    toggle_launcher_window_impl(&window)
}
