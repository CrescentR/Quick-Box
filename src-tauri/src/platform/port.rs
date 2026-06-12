use crate::errors::CommandError;
use serde::Serialize;
use std::collections::HashMap;
use std::process::Command;

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
        return scan_port_windows(port);
    }

    #[cfg(not(target_os = "windows"))]
    {
        return scan_port_unix(port);
    }
}

pub fn kill_port_occupants(port: u16, pids: Option<Vec<u32>>) -> Result<PortKillResult, CommandError> {
    validate_port(port)?;

    let occupants = scan_port(port)?;
    let target_pids: Vec<u32> = match pids {
        Some(values) if !values.is_empty() => values,
        _ => occupants.iter().map(|item| item.pid).collect(),
    };

    let mut killed_pids = Vec::new();
    let mut failed_pids = Vec::new();

    for pid in dedupe_pids(target_pids) {
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

fn dedupe_pids(pids: Vec<u32>) -> Vec<u32> {
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
fn scan_port_windows(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    let output = Command::new("netstat")
        .args(["-ano"])
        .output()
        .map_err(|error| {
            CommandError::with_details(
                "NETSTAT_FAILED",
                "无法执行 netstat 命令",
                error.to_string(),
            )
        })?;

    if !output.status.success() {
        return Err(CommandError::with_details(
            "NETSTAT_FAILED",
            "netstat 命令执行失败",
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut occupants = Vec::new();
    let mut seen = HashMap::new();

    for line in stdout.lines() {
        let columns: Vec<&str> = line.split_whitespace().collect();
        if columns.len() < 4 {
            continue;
        }

        let protocol = columns[0].to_ascii_uppercase();
        if protocol != "TCP" && protocol != "UDP" {
            continue;
        }

        let local_address = columns[1];
        if !local_address_uses_port(local_address, port) {
            continue;
        }

        let pid = match columns.last().and_then(|value| value.parse::<u32>().ok()) {
            Some(value) if value > 0 => value,
            _ => continue,
        };

        let state = if protocol == "TCP" && columns.len() >= 5 {
            Some(columns[3].to_string())
        } else {
            None
        };

        let key = (pid, local_address.to_string(), protocol.clone());
        if seen.contains_key(&key) {
            continue;
        }

        seen.insert(key.clone(), ());
        occupants.push(PortOccupant {
            pid,
            process_name: resolve_process_name_windows(pid),
            protocol,
            local_address: local_address.to_string(),
            state,
        });
    }

    occupants.sort_by(|left, right| {
        left.process_name
            .cmp(&right.process_name)
            .then(left.pid.cmp(&right.pid))
    });

    Ok(occupants)
}

#[cfg(target_os = "windows")]
fn resolve_process_name_windows(pid: u32) -> String {
    let output = Command::new("tasklist")
        .args([
            "/FI",
            &format!("PID eq {}", pid),
            "/FO",
            "CSV",
            "/NH",
        ])
        .output();

    let Ok(output) = output else {
        return format!("PID {}", pid);
    };

    if !output.status.success() {
        return format!("PID {}", pid);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first_line = stdout.lines().next().unwrap_or_default().trim();
    if first_line.is_empty() || first_line.starts_with("INFO:") {
        return format!("PID {}", pid);
    }

    first_line
        .split(',')
        .next()
        .map(|value| value.trim_matches('"').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| format!("PID {}", pid))
}

#[cfg(target_os = "windows")]
fn kill_pid(pid: u32) -> Result<(), CommandError> {
    let output = Command::new("taskkill")
        .args(["/PID", &pid.to_string(), "/F"])
        .output()
        .map_err(|error| {
            CommandError::with_details(
                "TASKKILL_FAILED",
                format!("无法终止进程 {}", pid),
                error.to_string(),
            )
        })?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let message = if stderr.is_empty() {
        format!("taskkill 未能终止进程 {}", pid)
    } else {
        stderr
    };

    Err(CommandError::new("TASKKILL_FAILED", message))
}

#[cfg(not(target_os = "windows"))]
fn scan_port_unix(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    let output = Command::new("lsof")
        .args(["-nP", "-i", &format!(":{}", port), "-F", "pcn"])
        .output()
        .map_err(|error| {
            CommandError::with_details(
                "LSOF_FAILED",
                "无法执行 lsof 命令，请确认系统已安装 lsof",
                error.to_string(),
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.contains("cannot identify protocol") || stderr.is_empty() {
            return Ok(Vec::new());
        }

        return Err(CommandError::with_details(
            "LSOF_FAILED",
            "lsof 命令执行失败",
            stderr,
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut occupants = Vec::new();
    let mut current_pid: Option<u32> = None;
    let mut current_name = String::new();
    let mut current_address = String::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }

        match line.chars().next() {
            Some('p') => {
                push_unix_occupant(
                    &mut occupants,
                    &mut current_pid,
                    &mut current_name,
                    &mut current_address,
                );
                current_pid = line[1..].parse().ok();
                current_name.clear();
                current_address.clear();
            }
            Some('c') => current_name = line[1..].to_string(),
            Some('n') => current_address = line[1..].to_string(),
            _ => {}
        }
    }

    push_unix_occupant(
        &mut occupants,
        &mut current_pid,
        &mut current_name,
        &mut current_address,
    );

    occupants.sort_by(|left, right| {
        left.process_name
            .cmp(&right.process_name)
            .then(left.pid.cmp(&right.pid))
    });

    Ok(occupants)
}

#[cfg(not(target_os = "windows"))]
fn push_unix_occupant(
    occupants: &mut Vec<PortOccupant>,
    current_pid: &mut Option<u32>,
    current_name: &mut String,
    current_address: &mut String,
) {
    let Some(pid) = current_pid.take() else {
        current_name.clear();
        current_address.clear();
        return;
    };

    if current_address.is_empty() {
        current_name.clear();
        return;
    }

    let (protocol, state) = parse_unix_address_meta(current_address);
    occupants.push(PortOccupant {
        pid,
        process_name: if current_name.is_empty() {
            format!("PID {}", pid)
        } else {
            current_name.clone()
        },
        protocol,
        local_address: current_address.clone(),
        state,
    });

    current_name.clear();
    current_address.clear();
}

#[cfg(not(target_os = "windows"))]
fn parse_unix_address_meta(address: &str) -> (String, Option<String>) {
    if let Some((left, state)) = address.rsplit_once(' ') {
        let protocol = left
            .split_whitespace()
            .next()
            .unwrap_or("TCP")
            .to_ascii_uppercase();
        let cleaned_state = state.trim_matches(|value| value == '(' || value == ')');
        return (protocol, Some(cleaned_state.to_string()));
    }

    ("TCP".to_string(), None)
}

#[cfg(not(target_os = "windows"))]
fn kill_pid(pid: u32) -> Result<(), CommandError> {
    let output = Command::new("kill")
        .args(["-9", &pid.to_string()])
        .output()
        .map_err(|error| {
            CommandError::with_details(
                "KILL_FAILED",
                format!("无法终止进程 {}", pid),
                error.to_string(),
            )
        })?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let message = if stderr.is_empty() {
        format!("kill 未能终止进程 {}", pid)
    } else {
        stderr
    };

    Err(CommandError::new("KILL_FAILED", message))
}

fn local_address_uses_port(address: &str, port: u16) -> bool {
    let port_text = port.to_string();

    if let Some(rest) = address.strip_prefix('[') {
        return rest
            .rsplit_once("]:")
            .map(|(_, value)| value == port_text)
            .unwrap_or(false);
    }

    address
        .rsplit_once(':')
        .map(|(_, value)| value == port_text)
        .unwrap_or(false)
}
