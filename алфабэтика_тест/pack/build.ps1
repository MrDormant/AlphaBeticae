# Собирает один portable-файл Alfabetica.exe (нужны Node.js и npm).
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host 'Установи Node.js с https://nodejs.org и повтори.'
  exit 1
}
npm install
npm run build
Write-Host ""
Write-Host "Готово: pack\dist\Alfabetica.exe"
Write-Host "Это один exe — скопируй на флешку и запускай двойным щелчком."
