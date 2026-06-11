mod commands;
mod command_usage;
mod config;
mod errors;
mod platform;
mod plugin_state;
mod shortcuts;
mod storage;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

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
            commands::window::minimize_launcher_window,
            commands::window::maximize_launcher_window,
            commands::window::unmaximize_launcher_window,
            commands::window::close_launcher_window,
            commands::window::reset_launcher_window,
            commands::window::is_launcher_window_maximized,
            commands::clipboard::read_clipboard_text,
            commands::clipboard::write_clipboard_text,
            commands::config::load_config,
            commands::config::save_config,
            commands::plugins::load_plugin_states,
            commands::plugins::save_plugin_states,
            commands::usage::load_command_usage,
            commands::usage::record_command_usage,
        ])
        .setup(|app| {
            storage::migrations::run_migrations(app.handle())?;

            let config = storage::config_store::load_config(app.handle()).unwrap_or_default();
            let shortcut_registered =
                shortcuts::register_initial_launcher_hotkey(app.handle(), &config.hotkey);

            if let Some(window) = app.get_webview_window("main") {
                platform::configure_launcher_window(&window)?;

                if cfg!(debug_assertions) || !shortcut_registered {
                    window.center()?;
                    window.show()?;
                    window.set_focus()?;
                    #[cfg(target_os = "windows")]
                    platform::ensure_taskbar_icon(&window)?;
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run QuickBox");
}
