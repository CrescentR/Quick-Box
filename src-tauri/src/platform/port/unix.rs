use super::PortOccupant;
use crate::errors::CommandError;
use std::process::Command;

pub fn scan_port(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
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
                push_occupant(
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

    push_occupant(
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

pub fn kill_pid(pid: u32) -> Result<(), CommandError> {
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

fn push_occupant(
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
