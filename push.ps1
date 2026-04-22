# push.ps1 — reliable Docker Hub push with automatic retry
# Run from your inventory_application folder:
#   .\push.ps1

$ErrorActionPreference = "Stop"

$BACKEND_IMAGE  = "prince060100/inventory-backend:latest"
$FRONTEND_IMAGE = "prince060100/inventory-frontend:latest"
$MAX_RETRIES    = 5
$RETRY_DELAY    = 15   # seconds between retries

function Push-WithRetry {
    param([string]$Image)

    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "Pushing: $Image" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

    for ($i = 1; $i -le $MAX_RETRIES; $i++) {
        Write-Host "[Attempt $i / $MAX_RETRIES]" -ForegroundColor Yellow
        
        docker push $Image
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n  $Image pushed successfully!" -ForegroundColor Green
            return $true
        }

        if ($i -lt $MAX_RETRIES) {
            Write-Host "`n Push failed. Waiting $RETRY_DELAY seconds before retry..." -ForegroundColor Yellow
            Start-Sleep -Seconds $RETRY_DELAY
            # Re-authenticate before each retry to refresh the session token
            Write-Host "Re-authenticating..." -ForegroundColor Yellow
            docker login
        }
    }

    Write-Host "`n  Failed to push $Image after $MAX_RETRIES attempts." -ForegroundColor Red
    return $false
}

# ── 1. Login ──────────────────────────────────────────────────────────────────
Write-Host "Logging in to Docker Hub..." -ForegroundColor Cyan
docker login
if ($LASTEXITCODE -ne 0) { Write-Host "Login failed. Exiting." -ForegroundColor Red; exit 1 }

# ── 2. Build fresh images from the updated Dockerfiles ───────────────────────
Write-Host "`nBuilding backend image..." -ForegroundColor Cyan
docker build -t $BACKEND_IMAGE -f backend/Dockerfile.backend ./backend
if ($LASTEXITCODE -ne 0) { Write-Host "Backend build failed." -ForegroundColor Red; exit 1 }

Write-Host "`nBuilding frontend image..." -ForegroundColor Cyan
docker build -t $FRONTEND_IMAGE -f frontend/Dockerfile.frontend ./frontend
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend build failed." -ForegroundColor Red; exit 1 }

# ── 3. Push with retry ────────────────────────────────────────────────────────
$backendOk  = Push-WithRetry -Image $BACKEND_IMAGE
$frontendOk = Push-WithRetry -Image $FRONTEND_IMAGE

# ── 4. Summary ────────────────────────────────────────────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "PUSH SUMMARY" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Backend:  $(if ($backendOk)  { 'OK' } else { ' FAILED' })"
Write-Host "Frontend: $(if ($frontendOk) { ' OK' } else { ' FAILED' })"

if ($backendOk -and $frontendOk) {
    Write-Host "`nBoth images pushed. You can now deploy with:" -ForegroundColor Green
    Write-Host "  docker-compose -f docker-compose-prod.yml pull" -ForegroundColor White
    Write-Host "  docker-compose -f docker-compose-prod.yml up -d" -ForegroundColor White
}