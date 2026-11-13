# Запуск сборщика на этом компьютере (вызывается Планировщиком заданий Windows каждые 3 часа).
$ErrorActionPreference = 'Continue'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
$logs = Join-Path $here 'logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$log = Join-Path $logs ("run-{0:yyyy-MM-dd_HH-mm}.log" -f (Get-Date))
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUNBUFFERED = '1'
& (Join-Path $here '.venv\Scripts\python.exe') -W ignore main.py *> $log
# храним логи только за последние 7 дней
Get-ChildItem $logs -Filter 'run-*.log' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
