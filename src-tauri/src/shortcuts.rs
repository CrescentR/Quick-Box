use crate::errors::CommandError;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

const FALLBACK_HOTKEYS: [&str; 3] = ["Alt+Space", "Ctrl+Alt+Space", "Ctrl+Alt+K"];

fn normalize_hotkey(hotkey: &str) -> String {
    hotkey
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("+")
}

fn shortcut_error(error: tauri_plugin_global_shortcut::Error) -> CommandError {
    CommandError::with_details(
        "HOTKEY_REGISTER_FAILED",
        "Failed to register launcher hotkey",
        error.to_string(),
    )
}

pub fn register_initial_launcher_hotkey(app: &tauri::AppHandle, configured_hotkey: &str) -> bool {
    let configured_hotkey = normalize_hotkey(configured_hotkey);
    let mut candidates = Vec::from([configured_hotkey]);
    candidates.extend(FALLBACK_HOTKEYS.iter().map(|hotkey| (*hotkey).to_string()));

    for hotkey in candidates {
        if hotkey.is_empty() {
            continue;
        }

        if app.global_shortcut().is_registered(hotkey.as_str()) {
            return true;
        }

        match app.global_shortcut().register(hotkey.as_str()) {
            Ok(()) => return true,
            Err(_error) => {
                #[cfg(debug_assertions)]
                eprintln!("failed to register global shortcut {hotkey}: {_error}");
            }
        }
    }

    false
}

pub fn replace_launcher_hotkey(
    app: &tauri::AppHandle,
    previous_hotkey: &str,
    next_hotkey: &str,
) -> Result<(), CommandError> {
    let previous_hotkey = normalize_hotkey(previous_hotkey);
    let next_hotkey = normalize_hotkey(next_hotkey);

    if next_hotkey.is_empty() {
        return Err(CommandError::new(
            "HOTKEY_EMPTY",
            "Launcher hotkey cannot be empty",
        ));
    }

    if previous_hotkey == next_hotkey {
        return Ok(());
    }

    app.global_shortcut()
        .unregister_all()
        .map_err(shortcut_error)?;

    if let Err(error) = app.global_shortcut().register(next_hotkey.as_str()) {
        if !previous_hotkey.is_empty() {
            let _ = register_initial_launcher_hotkey(app, &previous_hotkey);
        }

        return Err(shortcut_error(error));
    }

    Ok(())
}
