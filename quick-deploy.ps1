# Quick Deploy Script for AI Meeting Platform
# This script helps deploy the system using Docker

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 AI Meeting Platform - Quick Docker Deploy 🚀      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if .env.production exists
if (-not (Test-Path .env.production)) {
    Write-Host "❌ File .env.production không tồn tại!" -ForegroundColor Red
    Write-Host "`nTạo file .env.production với nội dung:`n" -ForegroundColor Yellow
    Write-Host @"
DOCKER_USERNAME=nguyenthanhduyznake
PYTHON_SERVICE_CALLBACK_TOKEN=73755272400664530092426538745578
HF_TOKEN=your-huggingface-token-here
GOOGLE_API_KEY=your-google-api-key-here
POSTGRES_USER=meeting
POSTGRES_PASSWORD=meeting
POSTGRES_DB=meeting_notes
"@ -ForegroundColor White
    Write-Host "`nLấy API keys tại:" -ForegroundColor Yellow
    Write-Host "  - HF Token: https://huggingface.co/settings/tokens" -ForegroundColor Cyan
    Write-Host "  - Google Key: https://makersuite.google.com/app/apikey`n" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ File .env.production đã tồn tại`n" -ForegroundColor Green

# Pull images
Write-Host "📦 Pulling Docker images from Docker Hub..." -ForegroundColor Cyan
docker compose -f docker-compose.production.yml pull

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to pull images!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Images pulled successfully`n" -ForegroundColor Green

# Start containers
Write-Host "🚀 Starting containers..." -ForegroundColor Cyan
docker compose -f docker-compose.production.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to start containers!" -ForegroundColor Red
    Write-Host "Check if ports are available (3333, 4000, 5000, 80, 5432, 6379)`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ Containers started!`n" -ForegroundColor Green
Write-Host "⏳ Waiting 30 seconds for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check container status
Write-Host "`n📊 Container Status:" -ForegroundColor Cyan
docker compose -f docker-compose.production.yml ps

# Test endpoints
Write-Host "`n🔍 Testing endpoints..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri http://localhost:3333 -TimeoutSec 5
    Write-Host "  ✅ Backend API (3333): OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Backend API (3333): FAILED" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri http://localhost:4000 -TimeoutSec 5
    Write-Host "  ✅ Dashboard (4000): OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Dashboard (4000): FAILED" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri http://localhost -TimeoutSec 5
    Write-Host "  ✅ Frontend (80): OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Frontend (80): FAILED" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri http://localhost:5050 -TimeoutSec 5
    Write-Host "  ✅ pgAdmin (5050): OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ pgAdmin (5050): FAILED" -ForegroundColor Red
}

Write-Host "`n╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✨ Deployment Complete! ✨                            ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "📍 Access URLs:" -ForegroundColor Yellow
Write-Host "  - Frontend (Next.js): http://localhost" -ForegroundColor White
Write-Host "  - Dashboard (React): http://localhost:4000" -ForegroundColor White
Write-Host "  - Backend API: http://localhost:3333" -ForegroundColor White
Write-Host "  - pgAdmin: http://localhost:5050 (admin@admin.com / admin)`n" -ForegroundColor White

Write-Host "📖 Useful commands:" -ForegroundColor Yellow
Write-Host "  - View logs: docker compose -f docker-compose.production.yml logs -f" -ForegroundColor Cyan
Write-Host "  - Stop: docker compose -f docker-compose.production.yml down" -ForegroundColor Cyan
Write-Host "  - Restart: docker compose -f docker-compose.production.yml restart`n" -ForegroundColor Cyan

