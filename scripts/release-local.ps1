param(
  [string]$Version = "",
  [string]$Repo = "JustDream-LoL/LucidPad",
  [string]$OutputDir = "release",
  [string]$SigningPassword = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
Set-Location $rootDir

$package = Get-Content package.json -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = $package.version
}

$config = Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
if ($config.version -ne $Version) {
  throw "Version mismatch: package.json=$($package.version), tauri.conf.json=$($config.version), requested=$Version"
}

$localKeyPath = Join-Path $rootDir "src-tauri/.tauri/lucidpad.key"
$localPubKeyPath = Join-Path $rootDir "src-tauri/.tauri/lucidpad.key.pub"
if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
  if (-not (Test-Path $localKeyPath)) {
    throw "TAURI_SIGNING_PRIVATE_KEY is not set and local key was not found at $localKeyPath"
  }
  $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $localKeyPath -Raw)
}

if ([string]::IsNullOrWhiteSpace($SigningPassword)) {
  $SigningPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
}

if ([string]::IsNullOrWhiteSpace($SigningPassword)) {
  throw "TAURI_SIGNING_PRIVATE_KEY_PASSWORD is required for updater signing"
}
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $SigningPassword

if (Test-Path $localPubKeyPath) {
  $localPubKey = (Get-Content $localPubKeyPath -Raw).Trim()
  $configPubKey = [string]$config.plugins.updater.pubkey
  if ($localPubKey -ne $configPubKey) {
    Write-Warning "Local updater public key does not match src-tauri/tauri.conf.json"
  }
}

Write-Host "Building LucidPad v$Version with updater signing..."
npm run tauri:build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$expectedSigFiles = @(
  "src-tauri/target/release/bundle/nsis/LucidPad_${Version}_x64-setup.exe.sig",
  "src-tauri/target/release/bundle/msi/LucidPad_${Version}_x64_en-US.msi.sig"
)

if (-not ($expectedSigFiles | Where-Object { Test-Path $_ })) {
  throw "Signed updater artifacts were not generated for v$Version"
}

Write-Host "Generating latest.json and release upload folder..."
node scripts/generate-latest-json.mjs --version $Version --repo $Repo --output-dir $OutputDir
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$resolvedOutput = Resolve-Path (Join-Path $OutputDir "v$Version")
Write-Host "Release artifacts are ready in $resolvedOutput"
