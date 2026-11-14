use crate::commands;
use crate::platform;
use crate::storage::config_store;
use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, Wry};

const TRAY_ID: &str = "quickbox-tray";
const MENU_SHOW: &str = "quickbox-tray-show";
const MENU_HIDE: &str = "quickbox-tray-hide";
const MENU_QUIT: &str = "quickbox-tray-quit";

fn is_english_locale(language: &str) -> bool {
    match language {
        "en-US" => true,
        "zh-CN" => false,
        _ => {
            let env_lang = std::env::var("LC_ALL")
                .or_else(|_| std::env::var("LANG"))
                .unwrap_or_default()
                .to_lowercase();
            !env_lang.starts_with("zh")
        }
    }
}

fn build_tray_menu(app: &tauri::AppHandle, language: &str) -> tauri::Result<Menu<Wry>> {
    let english = is_english_locale(language);
    let (show_label, hide_label, quit_label) = if english {
        ("Show QuickBox", "Hide QuickBox", "Quit QuickBox")
    } else {
        ("显示 QuickBox", "隐藏 QuickBox", "退出 QuickBox")
    };

    MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id(MENU_SHOW, show_label).build(app)?)
        .item(&MenuItemBuilder::with_id(MENU_HIDE, hide_label).build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id(MENU_QUIT, quit_label).build(app)?)
        .build()
}

pub fn refresh_menu(app: &tauri::AppHandle, language: &str) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let menu = build_tray_menu(app, language)?;
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

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
    let config = config_store::load_config(app).unwrap_or_default();
    let menu = build_tray_menu(app, &config.language)?;

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
