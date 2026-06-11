use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginState {
    pub id: String,
    pub source: String,
    pub enabled: bool,
}
