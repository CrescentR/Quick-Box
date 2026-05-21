use tauri::WebviewWindow;

#[cfg(target_os = "windows")]
mod windows;

pub fn configure_launcher_window(window: &WebviewWindow) -> Result<(), tauri::Error> {
    window.set_always_on_top(true)?;
    #[cfg(target_os = "windows")]
    windows::configure_launcher_window(window)?;
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn ensure_taskbar_icon(window: &WebviewWindow) -> Result<(), tauri::Error> {
    windows::ensure_taskbar_icon(window)
}
