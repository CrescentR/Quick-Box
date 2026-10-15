mod command_usage;
mod commands;
mod config;
mod errors;
mod platform;
mod plugin_state;
mod shortcuts;
mod storage;
mod tray;

use tauri::Manager;
use tauri_plugin_global_shortcut::ShortcutState;

pub fn run() {
    tauri::Builder::default()
        .manage(commands::file_search::SearchJobs::default())
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
            commands::clipboard_history::load_clipboard_history,
            commands::clipboard_history::record_clipboard_text,
            commands::clipboard_history::delete_clipboard_history_item,
            commands::clipboard_history::clear_clipboard_history,
            commands::release::open_release_page,
            commands::workspace::load_workspace,
            commands::workspace::save_workspace,
            commands::library::load_library,
            commands::library::save_library_item,
            commands::library::read_library_file,
            commands::library::delete_library_item,
            commands::backups::load_backups,
            commands::backups::add_backup_files,
            commands::backups::export_backup_file,
            commands::backups::delete_backup_file,
            commands::backups::open_backup_directory,
            storage::location::get_storage_location,
            storage::location::pick_storage_directory,
            storage::location::set_storage_location,
            commands::config::load_config,
            commands::config::save_config,
            commands::plugins::load_plugin_states,
            commands::plugins::save_plugin_states,
            commands::usage::load_command_usage,
            commands::usage::record_command_usage,
            commands::process::scan_port_occupants,
            commands::process::kill_port_occupants,
            commands::process::load_port_usage,
            commands::process::record_port_usage,
            commands::process::clear_port_usage,
            commands::files::list_directory_files,
            commands::files::apply_batch_rename,
            commands::file_search::search_file_contents,
            commands::file_search::cancel_file_search,
            commands::file_search::file_search_progress,
            commands::screen::pick_screen_color,
        ])
        .setup(|app| {
            let directory = storage::location::initialize(app.handle())
                .map_err(|error| std::io::Error::other(error.message))?;
            storage::migrations::run_migrations(app.handle())?;

            // 窗口创建前设置 WebView 存储位置，使缓存和 localStorage 跟随用户的数据目录。
            storage::location::validate_storage_path(&directory.join("webview"))
                .map_err(|error| std::io::Error::other(error.message))?;
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|window| window.label == "main")
                .ok_or("main window configuration is missing")?
                .clone();
            tauri::WebviewWindowBuilder::from_config(app.handle(), &window_config)?
                .data_directory(directory.join("webview"))
                .build()?;

            let config = storage::config_store::load_config(app.handle()).unwrap_or_default();
            let shortcut_registered =
                shortcuts::register_initial_launcher_hotkey(app.handle(), &config.hotkey);
            if config.enable_tray {
                tray::register(app.handle())?;
            }

            if let Some(window) = app.get_webview_window("main") {
                platform::configure_launcher_window(&window)?;
                window.set_always_on_top(config.always_on_top)?;

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
        .unwrap_or_else(|error| {
            rfd::MessageDialog::new()
                .set_title("QuickBox 启动失败")
                .set_description(format!("{error}\n请确认安装目录和数据目录可写。"))
                .set_level(rfd::MessageLevel::Error)
                .show();
        });
}
