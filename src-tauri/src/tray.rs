use crate::commands;
use crate::platform;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

const TRAY_ID: &str = "quickbox-tray";
const MENU_SHOW: &str = "quickbox-tray-show";
const MENU_HIDE: &str = "quickbox-tray-hide";
const MENU_QUIT: &str = "quickbox-tray-quit";

fn show_launcher(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.center();
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(target_os = "windows")]
        let _ = platform::ensure_taskbar_icon(&window);
    }
}

fn hide_launcher(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

pub fn register(app: &tauri::AppHandle) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id(MENU_SHOW, "显示 QuickBox").build(app)?)
        .item(&MenuItemBuilder::with_id(MENU_HIDE, "隐藏 QuickBox").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id(MENU_QUIT, "退出 QuickBox").build(app)?)
        .build()?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .menu(&menu)
        .tooltip("QuickBox")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_SHOW => show_launcher(app),
            MENU_HIDE => hide_launcher(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            }
            | TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = commands::window::toggle_launcher_window_impl(&window);
                }
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}
