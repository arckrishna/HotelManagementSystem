Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         Starting StaySync Hotel Management System      " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

Write-Host "[1/3] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/3] Launching React Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev -- --host 127.0.0.1 --port 5173"

Write-Host "[3/3] Waiting for servers and opening browser..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173/login"

Write-Host ""
Write-Host "StaySync is now live on http://localhost:5173/login" -ForegroundColor Cyan
Write-Host "Admin Credentials: admin@staysync.com | Admin@123" -ForegroundColor Yellow
