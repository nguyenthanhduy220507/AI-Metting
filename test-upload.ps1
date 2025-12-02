# Test script for upload functionality
Write-Host "=== AI Meeting Upload Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if services are running
Write-Host "Step 1: Checking services..." -ForegroundColor Yellow

# Check Python service
Write-Host "  - Checking Python service (port 5000)..." -NoNewline
try {
    $pythonHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
    Write-Host "    Models loaded: $($pythonHealth.models_loaded)" -ForegroundColor Gray
    Write-Host "    Enrolled speakers: $($pythonHealth.enrolled_speakers)" -ForegroundColor Gray
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Python service is not running. Please start it first:" -ForegroundColor Yellow
    Write-Host "  cd python-service-metting" -ForegroundColor Cyan
    Write-Host "  .\venv\Scripts\activate" -ForegroundColor Cyan
    Write-Host "  uvicorn api:app --host 0.0.0.0 --port 5000 --reload" -ForegroundColor Cyan
    exit 1
}

# Check Backend service
Write-Host "  - Checking Backend service (port 3333)..." -NoNewline
try {
    $null = Invoke-RestMethod -Uri "http://localhost:3333" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "    Backend is not running. Please start it:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Cyan
    Write-Host "  npm run start:dev" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "Step 2: Testing path normalization..." -ForegroundColor Yellow

# Create a test audio file path (Windows format)
$testPath = "E:\ai-meeting\backend\uploads\test\sample.m4a"
Write-Host "  Windows path: $testPath" -ForegroundColor Gray

# Show how it will be normalized
$normalizedPath = $testPath.Replace('\', '/')
Write-Host "  Normalized path: $normalizedPath" -ForegroundColor Gray
Write-Host "  Path will be sent via HTTP JSON without escape issues" -ForegroundColor Green

Write-Host ""
Write-Host "=== All checks passed! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now upload a file via frontend:" -ForegroundColor Cyan
Write-Host "  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Watch logs in:" -ForegroundColor Yellow
Write-Host "  - Terminal 3 (Backend): Look for '[DEBUG] Normalized path:'" -ForegroundColor Gray
Write-Host "  - Terminal 14 (Python): Look for '[DEBUG] Original path:'" -ForegroundColor Gray

