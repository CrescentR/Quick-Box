use tauri::WebviewWindow;

use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongW, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, SWP_FRAMECHANGED, SWP_NOMOVE,
    SWP_NOSIZE, SWP_NOOWNERZORDER, SWP_NOZORDER, WS_EX_APPWINDOW, WS_EX_NOACTIVATE,
    WS_EX_TOOLWINDOW,
};

pub fn platform_name() -> &'static str {
    "windows"
}

pub fn configure_launcher_window(window: &WebviewWindow) -> Result<(), tauri::Error> {
    window.set_skip_taskbar(false)?;
    Ok(())
}

pub fn ensure_taskbar_icon(window: &WebviewWindow) -> Result<(), tauri::Error> {
    let hwnd = HWND(window.hwnd()?.0);
    unsafe {
        let current_ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
        let next_ex_style = (current_ex_style
            & !(WS_EX_TOOLWINDOW.0 as u32)
            & !(WS_EX_NOACTIVATE.0 as u32))
            | (WS_EX_APPWINDOW.0 as u32);

        if next_ex_style != current_ex_style {
            let _ = SetWindowLongW(hwnd, GWL_EXSTYLE, next_ex_style as i32);
            let _ = SetWindowPos(
                hwnd,
                None,
                0,
                0,
                0,
                0,
                SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOOWNERZORDER | SWP_NOZORDER,
            );
        }
    }

    Ok(())
}
