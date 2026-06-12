use crate::errors::CommandError;
use serde::Serialize;
use std::collections::HashMap;

#[cfg(not(target_os = "windows"))]
mod unix;
#[cfg(target_os = "windows")]
mod windows;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortOccupant {
    pub pid: u32,
    pub process_name: String,
    pub protocol: String,
    pub local_address: String,
    pub state: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortKillFailure {
    pub pid: u32,
    pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortKillResult {
    pub port: u16,
    pub killed_pids: Vec<u32>,
    pub failed_pids: Vec<PortKillFailure>,
}

pub fn scan_port(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    validate_port(port)?;

    #[cfg(target_os = "windows")]
    {
        return windows::scan_port(port);
    }

    #[cfg(not(target_os = "windows"))]
    {
        return unix::scan_port(port);
    }
}

pub fn kill_port_occupants(port: u16, pids: Option<Vec<u32>>) -> Result<PortKillResult, CommandError> {
    validate_port(port)?;

    let target_pids = match pids {
        Some(values) if !values.is_empty() => dedupe_pids(values),
        _ => dedupe_pids(
            scan_port(port)?
                .iter()
                .map(|item| item.pid)
                .collect(),
        ),
    };

    let mut killed_pids = Vec::new();
    let mut failed_pids = Vec::new();

    for pid in target_pids {
        if !is_safe_pid(pid) {
            failed_pids.push(PortKillFailure {
                pid,
                message: "系统进程不允许终止".to_string(),
            });
            continue;
        }

        match kill_pid(pid) {
            Ok(()) => killed_pids.push(pid),
            Err(error) => failed_pids.push(PortKillFailure {
                pid,
                message: error.message,
            }),
        }
    }

    Ok(PortKillResult {
        port,
        killed_pids,
        failed_pids,
    })
}

fn validate_port(port: u16) -> Result<(), CommandError> {
    if port == 0 {
        return Err(CommandError::new(
            "INVALID_PORT",
            "端口号必须在 1 到 65535 之间",
        ));
    }

    Ok(())
}

pub(crate) fn dedupe_pids(pids: Vec<u32>) -> Vec<u32> {
    let mut seen = HashMap::new();
    for pid in pids {
        seen.entry(pid).or_insert(());
    }
    seen.keys().copied().collect()
}

fn is_safe_pid(pid: u32) -> bool {
    pid > 4
}

#[cfg(target_os = "windows")]
fn kill_pid(pid: u32) -> Result<(), CommandError> {
    windows::kill_pid(pid)
}

#[cfg(not(target_os = "windows"))]
fn kill_pid(pid: u32) -> Result<(), CommandError> {
    unix::kill_pid(pid)
}
