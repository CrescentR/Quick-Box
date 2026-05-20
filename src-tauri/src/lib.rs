mod commands;
mod errors;
mod platform;
mod storage;

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = commands::window::toggle_launcher_window_impl(&window);
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::window::show_launcher_window,
            commands::window::hide_launcher_window,
            commands::window::toggle_launcher_window,
            commands::clipboard::read_clipboard_text,
            commands::clipboard::write_clipboard_text,
            commands::config::load_config,
            commands::config::save_config,
        ])
        .setup(|app| {
            storage::migrations::run_migrations(app.handle())?;

            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            let shortcut_registered = match app.global_shortcut().register(shortcut) {
                Ok(()) => true,
                Err(error) => {
                    eprintln!("failed to register global shortcut Alt+Space: {error}");
                    false
                }
            };

            if let Some(window) = app.get_webview_window("main") {
                platform::configure_launcher_window(&window)?;

                if cfg!(debug_assertions) || !shortcut_registered {
                    window.center()?;
                    window.show()?;
                    window.set_focus()?;
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run QuickBox");
}
