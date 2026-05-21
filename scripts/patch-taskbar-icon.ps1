param(
  [string]$ProcessName = 'quickbox',
  [int]$TimeoutSeconds = 30
)

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Win32TaskbarPatch {
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")]
  public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);

  [DllImport("user32.dll", EntryPoint="SetWindowLongPtrW")]
  public static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, IntPtr dwNewLong);

  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
'@

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$process = $null

while ((Get-Date) -lt $deadline) {
  $process = Get-Process $ProcessName -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($process -and $process.MainWindowHandle -ne 0) {
    break
  }

  Start-Sleep -Milliseconds 500
}

if (-not $process -or $process.MainWindowHandle -eq 0) {
  exit 0
}

$GWL_EXSTYLE = -20
$WS_EX_APPWINDOW = 0x00040000
$WS_EX_TOOLWINDOW = 0x00000080
$WS_EX_NOACTIVATE = 0x08000000
$SWP_NOMOVE = 0x0002
$SWP_NOSIZE = 0x0001
$SWP_NOZORDER = 0x0004
$SWP_NOOWNERZORDER = 0x0200
$SWP_FRAMECHANGED = 0x0020

$hwnd = [IntPtr]::new([int64]$process.MainWindowHandle)
$currentStyle = [Win32TaskbarPatch]::GetWindowLongPtr($hwnd, $GWL_EXSTYLE).ToInt64()
$nextStyle = ($currentStyle -band (-bnot $WS_EX_TOOLWINDOW) -band (-bnot $WS_EX_NOACTIVATE)) -bor $WS_EX_APPWINDOW

[void][Win32TaskbarPatch]::SetWindowLongPtr($hwnd, $GWL_EXSTYLE, [IntPtr]::new($nextStyle))
[void][Win32TaskbarPatch]::SetWindowPos(
  $hwnd,
  [IntPtr]::Zero,
  0,
  0,
  0,
  0,
  ($SWP_FRAMECHANGED -bor $SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_NOOWNERZORDER -bor $SWP_NOZORDER)
)
