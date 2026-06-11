use crate::errors::CommandError;
use crate::plugin_state::PluginState;
use crate::storage::plugin_store;

#[tauri::command]
pub fn load_plugin_states(app: tauri::AppHandle) -> Result<Vec<PluginState>, CommandError> {
    plugin_store::load_plugin_states(&app)
}

#[tauri::command]
pub fn save_plugin_states(
    app: tauri::AppHandle,
    states: Vec<PluginState>,
) -> Result<(), CommandError> {
    plugin_store::save_plugin_states(&app, &states)
}
