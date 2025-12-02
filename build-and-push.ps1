# PowerShell script for Windows

# Load environment variables
if (Test-Path .env.production) {
    Get-Content .env.production | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}

# Set defaults if not provided
$DOCKER_USERNAME = if ($env:DOCKER_USERNAME) { $env:DOCKER_USERNAME } else { "nguyenthanhduy220507" }
$VERSION = if ($env:VERSION) { $env:VERSION } else { "latest" }

Write-Host "🐳 Building Docker images..." -ForegroundColor Cyan
Write-Host "Docker Hub Username: $DOCKER_USERNAME" -ForegroundColor Yellow
Write-Host "Version: $VERSION" -ForegroundColor Yellow
Write-Host ""

# Build backend
Write-Host "📦 Building backend..." -ForegroundColor Cyan
docker build -t "${DOCKER_USERNAME}/ai-meeting-backend:${VERSION}" ./backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend build complete" -ForegroundColor Green
Write-Host ""

# Build frontend dashboard
Write-Host "📦 Building frontend dashboard..." -ForegroundColor Cyan
docker build -t "${DOCKER_USERNAME}/ai-meeting-frontend:${VERSION}" ./fe-dashboard
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dashboard build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Frontend dashboard build complete" -ForegroundColor Green
Write-Host ""

# Build Python service
Write-Host "📦 Building Python service..." -ForegroundColor Cyan
docker build -t "${DOCKER_USERNAME}/ai-meeting-python:${VERSION}" ./python-service-metting
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python service build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Python service build complete" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Pushing images to Docker Hub..." -ForegroundColor Cyan
Write-Host ""

# Push images
Write-Host "⬆️  Pushing backend..." -ForegroundColor Cyan
docker push "${DOCKER_USERNAME}/ai-meeting-backend:${VERSION}"
Write-Host "✅ Backend pushed" -ForegroundColor Green
Write-Host ""

Write-Host "⬆️  Pushing frontend..." -ForegroundColor Cyan
docker push "${DOCKER_USERNAME}/ai-meeting-frontend:${VERSION}"
Write-Host "✅ Frontend pushed" -ForegroundColor Green
Write-Host ""

Write-Host "⬆️  Pushing Python service..." -ForegroundColor Cyan
docker push "${DOCKER_USERNAME}/ai-meeting-python:${VERSION}"
Write-Host "✅ Python service pushed" -ForegroundColor Green
Write-Host ""

Write-Host "✨ Done! Images pushed to Docker Hub:" -ForegroundColor Green
Write-Host "  - ${DOCKER_USERNAME}/ai-meeting-backend:${VERSION}" -ForegroundColor Yellow
Write-Host "  - ${DOCKER_USERNAME}/ai-meeting-frontend:${VERSION}" -ForegroundColor Yellow
Write-Host "  - ${DOCKER_USERNAME}/ai-meeting-python:${VERSION}" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Share these images with your users!" -ForegroundColor Cyan

