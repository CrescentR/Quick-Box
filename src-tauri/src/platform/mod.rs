use tauri::WebviewWindow;

pub fn configure_launcher_window(window: &WebviewWindow) -> Result<(), tauri::Error> {
    window.set_always_on_top(true)?;
    window.set_skip_taskbar(true)?;
    Ok(())
}
