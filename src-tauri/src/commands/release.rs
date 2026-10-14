use crate::errors::CommandError;
#[tauri::command]
pub fn open_release_page() -> Result<(), CommandError> {
    let url = "https://github.com/CrescentR/Quick-Box/releases";
    #[cfg(target_os = "windows")]
    let mut command = {
        use std::os::windows::process::CommandExt;
        let mut command = std::process::Command::new("explorer.exe");
        command.creation_flags(0x08000000);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = std::process::Command::new("open");
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let mut command = std::process::Command::new("xdg-open");
    let mut child = command.arg(url).spawn()?;
    std::thread::spawn(move || { let _ = child.wait(); });
    Ok(())
}
