use serde::{Deserialize, Serialize};

fn default_language() -> String {
    "system".to_string()
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickBoxConfig {
    pub hotkey: String,
    pub theme: String,
    #[serde(default = "default_language")]
    pub language: String,
    pub enable_tray: bool,
    #[serde(default)]
    pub always_on_top: bool,
}

impl Default for QuickBoxConfig {
    fn default() -> Self {
        Self {
            hotkey: "Alt+Space".to_string(),
            theme: "dark".to_string(),
            language: default_language(),
            enable_tray: true,
            always_on_top: false,
        }
    }
}
