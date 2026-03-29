
# CAPS-Automation Project Launcher
# This script starts both the backend and frontend in parallel for development.

Write-Host "🚀 Starting CAPS-Automation Project..." -ForegroundColor Cyan

$backendPath = "D:\CAPS-Automation"
$frontendPath = "D:\CAPS-Automaion-frontend"

# Ensure directories exist
if (-not (Test-Path $backendPath)) { Write-Error "Backend path not found: $backendPath"; exit }
if (-not (Test-Path $frontendPath)) { Write-Error "Frontend path not found: $frontendPath"; exit }

# Start Backend
Write-Host "📦 Launching Backend (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $backendPath; npm run dev"

# Start Frontend
Write-Host "🌐 Launching Frontend (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $frontendPath; npm run dev"

Write-Host "✅ Both services are starting. Please check the new windows." -ForegroundColor Cyan
