use tauri::WebviewWindow;

pub mod port;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub fn configure_launcher_window(window: &WebviewWindow) -> Result<(), tauri::Error> {
    #[cfg(target_os = "windows")]
    windows::configure_launcher_window(window)?;
    #[cfg(target_os = "macos")]
    macos::configure_launcher_window(window)?;
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn ensure_taskbar_icon(window: &WebviewWindow) -> Result<(), tauri::Error> {
    windows::ensure_taskbar_icon(window)
}
