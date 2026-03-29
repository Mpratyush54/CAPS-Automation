# CAPS-Automation Project Build Script
# This script installs all dependencies and builds the production bundle for the frontend.

Write-Host "🏗️ Starting CAPS-Automation Project Build..." -ForegroundColor Cyan

$backendPath = "D:\CAPS-Automation"
$frontendPath = "D:\CAPS-Automaion-frontend"

# Step 1: Backend Build (Install Dependencies)
Write-Host "📦 Installing Backend Dependencies in $backendPath..." -ForegroundColor Yellow
Set-Location $backendPath
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Backend npm install failed!"; exit }

# Step 2: Frontend Build (Install + Build)
Write-Host "🌐 Installing Frontend Dependencies in $frontendPath..." -ForegroundColor Green
Set-Location $frontendPath
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend npm install failed!"; exit }

Write-Host "🛠️ Building Frontend Production Assets..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed!"; exit }

Write-Host "✅ Build Complete! Project is ready to deploy." -ForegroundColor Cyan
