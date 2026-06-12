use crate::errors::CommandError;
use crate::platform::port::{self, PortKillResult, PortOccupant};

#[tauri::command]
pub async fn scan_port_occupants(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    tauri::async_runtime::spawn_blocking(move || port::scan_port(port))
        .await
        .map_err(|_| CommandError::new("SCAN_CANCELLED", "端口扫描任务已取消"))?
}

#[tauri::command]
pub async fn kill_port_occupants(
    port: u16,
    pids: Option<Vec<u32>>,
) -> Result<PortKillResult, CommandError> {
    tauri::async_runtime::spawn_blocking(move || port::kill_port_occupants(port, pids))
        .await
        .map_err(|_| CommandError::new("KILL_CANCELLED", "终止进程任务已取消"))?
}
