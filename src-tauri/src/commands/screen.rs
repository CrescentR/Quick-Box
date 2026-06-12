use crate::errors::CommandError;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ScreenColor {
    pub x: i32,
    pub y: i32,
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub hex: String,
    pub rgb: String,
}

#[cfg(target_os = "windows")]
fn pick_screen_color_impl() -> Result<ScreenColor, CommandError> {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{GetDC, GetPixel, ReleaseDC};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    unsafe {
        let mut point = POINT { x: 0, y: 0 };
        GetCursorPos(&mut point)
            .map_err(|error| CommandError::with_details("GET_CURSOR_POS_FAILED", "无法读取鼠标位置", error.to_string()))?;

        let device_context = GetDC(None);
        if device_context.is_invalid() {
            return Err(CommandError::new("GET_SCREEN_DC_FAILED", "无法读取屏幕设备上下文"));
        }

        let pixel = GetPixel(device_context, point.x, point.y);
        let _ = ReleaseDC(None, device_context);

        if pixel.0 == 0xFFFF_FFFF {
            return Err(CommandError::new("GET_PIXEL_FAILED", "无法读取屏幕像素颜色"));
        }

        let raw = pixel.0;
        let r = (raw & 0xff) as u8;
        let g = ((raw >> 8) & 0xff) as u8;
        let b = ((raw >> 16) & 0xff) as u8;
        Ok(ScreenColor {
            x: point.x,
            y: point.y,
            r,
            g,
            b,
            hex: format!("#{r:02x}{g:02x}{b:02x}"),
            rgb: format!("rgb({r}, {g}, {b})"),
        })
    }
}

#[cfg(not(target_os = "windows"))]
fn pick_screen_color_impl() -> Result<ScreenColor, CommandError> {
    Err(CommandError::new(
        "SCREEN_COLOR_PICKER_UNSUPPORTED",
        "当前版本仅支持 Windows 屏幕取色",
    ))
}

#[tauri::command]
pub async fn pick_screen_color() -> Result<ScreenColor, CommandError> {
    tauri::async_runtime::spawn_blocking(pick_screen_color_impl)
        .await
        .map_err(|_| CommandError::new("SCREEN_COLOR_PICK_CANCELLED", "屏幕取色任务已取消"))?
}
