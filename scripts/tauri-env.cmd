@echo off
setlocal

set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\cargo.exe" (
  set "PATH=%CARGO_BIN%;%PATH%"
)

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VCVARS64="

if exist "%VSWHERE%" (
  for /f "usebackq delims=" %%I in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find VC\Auxiliary\Build\vcvars64.bat`) do (
    set "VCVARS64=%%I"
  )
)

if defined VCVARS64 (
  call "%VCVARS64%" >nul
)

set "TAURI_BIN=%~dp0..\node_modules\.bin\tauri.cmd"
if not exist "%TAURI_BIN%" (
  echo Could not find Tauri CLI at "%TAURI_BIN%".
  exit /b 1
)

if /I "%1"=="dev" (
  start "" /b powershell -ExecutionPolicy Bypass -File "%~dp0patch-taskbar-icon.ps1"
)

call "%TAURI_BIN%" %*
exit /b %ERRORLEVEL%
