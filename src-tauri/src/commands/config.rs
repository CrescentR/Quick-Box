use crate::errors::CommandError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickBoxConfig {
    pub hotkey: String,
    pub theme: String,
    pub enable_tray: bool,
}

impl Default for QuickBoxConfig {
    fn default() -> Self {
        Self {
            hotkey: "Alt+Space".to_string(),
            theme: "dark".to_string(),
            enable_tray: true,
        }
    }
}

#[tauri::command]
pub fn load_config() -> Result<QuickBoxConfig, CommandError> {
    Ok(QuickBoxConfig::default())
}

#[tauri::command]
pub fn save_config(config: QuickBoxConfig) -> Result<(), CommandError> {
    let _ = config;
    Ok(())
}
