# Windows: start `claude remote-control` in this repo at logon (Task Scheduler).
#
#   powershell -ExecutionPolicy Bypass -File scripts\remote-control\install-windows.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\remote-control\install-windows.ps1 -Uninstall
param([switch]$Uninstall)
$ErrorActionPreference = "Stop"

$TaskName = "ClaudeRemoteControl"
$RepoDir  = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "Removed $TaskName"
  exit 0
}

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Error "claude コマンドが見つかりません。先に Claude Code をインストールしてください。"
}

$Action   = New-ScheduledTaskAction -Execute "powershell.exe" `
              -Argument "-NoProfile -WindowStyle Hidden -Command `"Set-Location '$RepoDir'; claude remote-control`"" `
              -WorkingDirectory $RepoDir
$Trigger  = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
              -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host "Installed $TaskName (repo: $RepoDir)"
Write-Host "スリープ防止（電源接続時）: powercfg /change standby-timeout-ac 0"
Write-Host "スマホの Claude アプリ → Code タブにこの PC が表示されるか確認してください。"
