$port = 1420

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listener) {
  $processIdValue = $listener.OwningProcess
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processIdValue" -ErrorAction SilentlyContinue

  if ($process -and $process.CommandLine -like '*vite*' -and $process.CommandLine -like '*crescent-box*') {
    Stop-Process -Id $processIdValue -Force
    Start-Sleep -Milliseconds 500
  } else {
    Write-Error "Port $port is already in use by another process. Stop it first, then retry."
    if ($process) {
      Write-Error "PID: $processIdValue"
      Write-Error "CommandLine: $($process.CommandLine)"
    }
    exit 1
  }
}

& pnpm.cmd dev --host 127.0.0.1 --port $port --strictPort
exit $LASTEXITCODE
