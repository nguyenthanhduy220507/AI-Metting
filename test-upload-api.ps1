# Test actual file upload via API
Write-Host "=== Testing File Upload ===" -ForegroundColor Cyan
Write-Host ""

# Create a small test audio file (silent audio)
$testDir = "E:\ai-meeting\test-data"
New-Item -ItemType Directory -Force -Path $testDir | Out-Null

$testAudioPath = "$testDir\test-audio.m4a"

# Check if test file exists, if not create a small one
if (-not (Test-Path $testAudioPath)) {
    Write-Host "Creating test audio file..." -ForegroundColor Yellow
    # Use ffmpeg to create a 5-second silent audio file
    $ffmpegCmd = "ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 5 -c:a aac -b:a 128k -y `"$testAudioPath`""
    Invoke-Expression $ffmpegCmd 2>&1 | Out-Null
    
    if (Test-Path $testAudioPath) {
        Write-Host "  Test file created: $testAudioPath" -ForegroundColor Green
    } else {
        Write-Host "  Failed to create test file" -ForegroundColor Red
        Write-Host "  Please manually place a small audio file at: $testAudioPath" -ForegroundColor Yellow
        exit 1
    }
}

# Upload the file
Write-Host ""
Write-Host "Uploading test file to backend..." -ForegroundColor Yellow

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"file`"; filename=`"test-audio.m4a`"",
    "Content-Type: audio/mp4$LF",
    [System.IO.File]::ReadAllText($testAudioPath),
    "--$boundary",
    "Content-Disposition: form-data; name=`"title`"$LF",
    "Test Meeting - Path Fix Verification",
    "--$boundary",
    "Content-Disposition: form-data; name=`"description`"$LF",
    "Testing path normalization fix for Windows",
    "--$boundary--$LF"
) -join $LF

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3333/meetings" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines `
        -TimeoutSec 30
    
    Write-Host "  Upload successful!" -ForegroundColor Green
    Write-Host "  Meeting ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "  Status: $($response.status)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitor progress:" -ForegroundColor Yellow
    Write-Host "  Backend log (Terminal 3): Should show '[DEBUG] Normalized path: E:/ai-meeting/...'" -ForegroundColor Gray
    Write-Host "  Python log (Terminal 14): Should show '[DEBUG] Original path:' and processing logs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check status: http://localhost:3333/meetings/$($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "  Upload failed!" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Backend is running on port 3333" -ForegroundColor Gray
    Write-Host "  2. Python service is running on port 5000" -ForegroundColor Gray
    Write-Host "  3. Check terminal logs for errors" -ForegroundColor Gray
}

