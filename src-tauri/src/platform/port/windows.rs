use super::PortOccupant;
use crate::errors::CommandError;
use std::collections::HashMap;
use std::mem;
use std::net::Ipv6Addr;
use std::path::Path;
use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, ERROR_INSUFFICIENT_BUFFER, NO_ERROR};
use std::ffi::c_void;
use windows::Win32::NetworkManagement::IpHelper::{
    GetExtendedTcpTable, GetExtendedUdpTable, MIB_TCP6TABLE_OWNER_PID, MIB_TCPTABLE_OWNER_PID,
    MIB_UDPTABLE_OWNER_PID, TCP_TABLE_OWNER_PID_ALL, UDP_TABLE_OWNER_PID,
};
use windows::Win32::Networking::WinSock::{AF_INET, AF_INET6};
use windows::Win32::System::Threading::{
    OpenProcess, QueryFullProcessImageNameW, TerminateProcess, PROCESS_NAME_WIN32,
    PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
};

const MIB_TCP_STATE_LISTEN: u32 = 2;

pub fn scan_port(port: u16) -> Result<Vec<PortOccupant>, CommandError> {
    let mut process_names = HashMap::new();
    let mut occupants = Vec::new();
    let mut seen = HashMap::new();

    unsafe {
        collect_tcp_v4(port, &mut process_names, &mut occupants, &mut seen)?;
        collect_tcp_v6(port, &mut process_names, &mut occupants, &mut seen)?;
        collect_udp_v4(port, &mut process_names, &mut occupants, &mut seen)?;
    }

    occupants.sort_by(|left, right| {
        left.process_name
            .cmp(&right.process_name)
            .then(left.pid.cmp(&right.pid))
    });

    Ok(occupants)
}

pub fn kill_pid(pid: u32) -> Result<(), CommandError> {
    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, false, pid).map_err(|error| {
            CommandError::with_details(
                "KILL_FAILED",
                format!("无法打开进程 {}", pid),
                error.to_string(),
            )
        })?;

        let result = TerminateProcess(handle, 1).map_err(|error| {
            CommandError::with_details(
                "KILL_FAILED",
                format!("无法终止进程 {}", pid),
                error.to_string(),
            )
        });

        let _ = CloseHandle(handle);
        result
    }
}

unsafe fn collect_tcp_v4(
    port: u16,
    process_names: &mut HashMap<u32, String>,
    occupants: &mut Vec<PortOccupant>,
    seen: &mut HashMap<(u32, String, String), ()>,
) -> Result<(), CommandError> {
    let buffer = query_tcp_table(AF_INET.0.into())?;
    if buffer.len() < mem::size_of::<MIB_TCPTABLE_OWNER_PID>() {
        return Ok(());
    }

    let table = &*(buffer.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
    let rows = table.table.as_ptr();

    for index in 0..table.dwNumEntries as usize {
        let row = &*rows.add(index);
        if port_from_network(row.dwLocalPort) != port {
            continue;
        }

        push_tcp_row(
            row.dwOwningPid,
            "TCP",
            &format_ipv4(row.dwLocalAddr),
            Some(tcp_state_label(row.dwState)),
            process_names,
            occupants,
            seen,
        );
    }

    Ok(())
}

unsafe fn collect_tcp_v6(
    port: u16,
    process_names: &mut HashMap<u32, String>,
    occupants: &mut Vec<PortOccupant>,
    seen: &mut HashMap<(u32, String, String), ()>,
) -> Result<(), CommandError> {
    let buffer = query_tcp6_table()?;
    if buffer.len() < mem::size_of::<MIB_TCP6TABLE_OWNER_PID>() {
        return Ok(());
    }

    let table = &*(buffer.as_ptr() as *const MIB_TCP6TABLE_OWNER_PID);
    let rows = table.table.as_ptr();

    for index in 0..table.dwNumEntries as usize {
        let row = &*rows.add(index);
        if port_from_network(row.dwLocalPort) != port {
            continue;
        }

        push_tcp_row(
            row.dwOwningPid,
            "TCP",
            &format_ipv6_endpoint(&row.ucLocalAddr, row.dwLocalScopeId),
            Some(tcp_state_label(row.dwState)),
            process_names,
            occupants,
            seen,
        );
    }

    Ok(())
}

unsafe fn collect_udp_v4(
    port: u16,
    process_names: &mut HashMap<u32, String>,
    occupants: &mut Vec<PortOccupant>,
    seen: &mut HashMap<(u32, String, String), ()>,
) -> Result<(), CommandError> {
    let buffer = query_udp_table()?;
    if buffer.len() < mem::size_of::<MIB_UDPTABLE_OWNER_PID>() {
        return Ok(());
    }

    let table = &*(buffer.as_ptr() as *const MIB_UDPTABLE_OWNER_PID);
    let rows = table.table.as_ptr();

    for index in 0..table.dwNumEntries as usize {
        let row = &*rows.add(index);
        if port_from_network(row.dwLocalPort) != port {
            continue;
        }

        push_row(
            row.dwOwningPid,
            "UDP",
            format_ipv4(row.dwLocalAddr),
            None,
            process_names,
            occupants,
            seen,
        );
    }

    Ok(())
}

unsafe fn push_tcp_row(
    pid: u32,
    protocol: &str,
    local_address: &str,
    state: Option<String>,
    process_names: &mut HashMap<u32, String>,
    occupants: &mut Vec<PortOccupant>,
    seen: &mut HashMap<(u32, String, String), ()>,
) {
    push_row(
        pid,
        protocol,
        local_address.to_string(),
        state,
        process_names,
        occupants,
        seen,
    );
}

unsafe fn push_row(
    pid: u32,
    protocol: &str,
    local_address: String,
    state: Option<String>,
    process_names: &mut HashMap<u32, String>,
    occupants: &mut Vec<PortOccupant>,
    seen: &mut HashMap<(u32, String, String), ()>,
) {
    if pid == 0 {
        return;
    }

    let protocol_label = protocol.to_string();
    let key = (pid, local_address.clone(), protocol_label.clone());
    if seen.contains_key(&key) {
        return;
    }

    seen.insert(key, ());
    occupants.push(PortOccupant {
        pid,
        process_name: resolve_process_name(pid, process_names),
        protocol: protocol_label,
        local_address,
        state,
    });
}

unsafe fn query_tcp_table(address_family: u32) -> Result<Vec<u8>, CommandError> {
    let mut size = 0u32;
    let status = GetExtendedTcpTable(
        None,
        &mut size,
        false,
        address_family,
        TCP_TABLE_OWNER_PID_ALL,
        0,
    );

    if status != ERROR_INSUFFICIENT_BUFFER.0 && status != NO_ERROR.0 {
        return Err(ip_helper_error("GetExtendedTcpTable", status));
    }

    let mut buffer = vec![0u8; size as usize];
    let status = GetExtendedTcpTable(
        Some(buffer.as_mut_ptr().cast::<c_void>()),
        &mut size,
        false,
        address_family,
        TCP_TABLE_OWNER_PID_ALL,
        0,
    );

    if status != NO_ERROR.0 {
        return Err(ip_helper_error("GetExtendedTcpTable", status));
    }

    buffer.truncate(size as usize);
    Ok(buffer)
}

unsafe fn query_tcp6_table() -> Result<Vec<u8>, CommandError> {
    query_tcp_table(AF_INET6.0.into())
}

unsafe fn query_udp_table() -> Result<Vec<u8>, CommandError> {
    let mut size = 0u32;
    let status = GetExtendedUdpTable(
        None,
        &mut size,
        false,
        AF_INET.0.into(),
        UDP_TABLE_OWNER_PID,
        0,
    );

    if status != ERROR_INSUFFICIENT_BUFFER.0 && status != NO_ERROR.0 {
        return Err(ip_helper_error("GetExtendedUdpTable", status));
    }

    let mut buffer = vec![0u8; size as usize];
    let status = GetExtendedUdpTable(
        Some(buffer.as_mut_ptr().cast::<c_void>()),
        &mut size,
        false,
        AF_INET.0.into(),
        UDP_TABLE_OWNER_PID,
        0,
    );

    if status != NO_ERROR.0 {
        return Err(ip_helper_error("GetExtendedUdpTable", status));
    }

    buffer.truncate(size as usize);
    Ok(buffer)
}

fn ip_helper_error(action: &str, status: u32) -> CommandError {
    CommandError::with_details(
        "IP_HELPER_FAILED",
        format!("{action} 调用失败"),
        format!("Win32 error code {status}"),
    )
}

fn port_from_network(raw_port: u32) -> u16 {
    ((raw_port >> 8) & 0xFF) as u16 | ((raw_port & 0xFF) as u16) << 8
}

fn format_ipv4(raw_addr: u32) -> String {
    format!(
        "{}.{}.{}.{}",
        raw_addr & 0xFF,
        (raw_addr >> 8) & 0xFF,
        (raw_addr >> 16) & 0xFF,
        (raw_addr >> 24) & 0xFF
    )
}

fn format_ipv6_endpoint(address: &[u8; 16], scope_id: u32) -> String {
    let ip = Ipv6Addr::from(*address);
    if scope_id == 0 {
        return format!("[{ip}]");
    }

    format!("[{ip}%{scope_id}]")
}

fn tcp_state_label(state: u32) -> String {
    match state {
        MIB_TCP_STATE_LISTEN => "LISTENING".to_string(),
        3 => "SYN_SENT".to_string(),
        4 => "SYN_RECEIVED".to_string(),
        5 => "ESTABLISHED".to_string(),
        6 => "FIN_WAIT1".to_string(),
        7 => "FIN_WAIT2".to_string(),
        8 => "CLOSE_WAIT".to_string(),
        9 => "CLOSING".to_string(),
        10 => "LAST_ACK".to_string(),
        11 => "TIME_WAIT".to_string(),
        12 => "DELETE_TCB".to_string(),
        _ => format!("STATE_{state}"),
    }
}

unsafe fn resolve_process_name(pid: u32, cache: &mut HashMap<u32, String>) -> String {
    if let Some(name) = cache.get(&pid) {
        return name.clone();
    }

    let name = query_process_name(pid).unwrap_or_else(|| format!("PID {pid}"));
    cache.insert(pid, name.clone());
    name
}

unsafe fn query_process_name(pid: u32) -> Option<String> {
    let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
    let mut buffer = [0u16; 512];
    let mut size = buffer.len() as u32;

    let query_result =
        QueryFullProcessImageNameW(handle, PROCESS_NAME_WIN32, PWSTR(buffer.as_mut_ptr()), &mut size);
    let _ = CloseHandle(handle);

    query_result.ok()?;
    let path = String::from_utf16_lossy(&buffer[..size as usize]);
    Path::new(&path)
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
}
