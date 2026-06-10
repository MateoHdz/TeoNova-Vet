# Levanta TeoNova-Vet con Docker (Windows PowerShell)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path ".env.docker")) {
  Copy-Item ".env.docker.example" ".env.docker"
  Write-Host "Creado .env.docker — revisa JWT_SECRET y contraseñas antes de producción." -ForegroundColor Yellow
}

docker compose --env-file .env.docker up -d --build

Write-Host ""
Write-Host "Esperando MySQL..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

Write-Host "Configurando contraseñas demo (setup-admin)..." -ForegroundColor Cyan
docker compose --env-file .env.docker --profile setup run --rm setup-admin

Write-Host ""
Write-Host "Listo: http://localhost" -ForegroundColor Green
Write-Host "  admin@mrmax.com / Admin1234!" -ForegroundColor Green
