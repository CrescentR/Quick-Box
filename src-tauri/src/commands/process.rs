use crate::errors::CommandError;
use crate::platform::port::{self, PortKillResult, PortOccupant};

#[tauri::command]
pub fn scan_port_occupants(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    port::scan_port(port)
}

#[tauri::command]
pub fn kill_port_occupants(port: u16, pids: Option<Vec<u32>>) -> Result<PortKillResult, CommandError> {
    port::kill_port_occupants(port, pids)
}
