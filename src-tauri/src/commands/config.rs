use crate::config::QuickBoxConfig;
use crate::errors::CommandError;
use crate::shortcuts;
use crate::storage::config_store;

#[tauri::command]
pub fn load_config(app: tauri::AppHandle) -> Result<QuickBoxConfig, CommandError> {
    config_store::load_config(&app)
}

#[tauri::command]
pub fn save_config(app: tauri::AppHandle, config: QuickBoxConfig) -> Result<(), CommandError> {
    let previous_config = config_store::load_config(&app).unwrap_or_default();

    if previous_config.hotkey != config.hotkey {
        shortcuts::replace_launcher_hotkey(&app, &previous_config.hotkey, &config.hotkey)?;
    }

    if let Err(error) = config_store::save_config(&app, &config) {
        if previous_config.hotkey != config.hotkey {
            let _ = shortcuts::replace_launcher_hotkey(&app, &config.hotkey, &previous_config.hotkey);
        }

        return Err(error);
    }

    Ok(())
}
