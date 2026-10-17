# TaskFlow one-time setup for Windows. Run by double-clicking setup.bat
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root 'server'
$envFile = Join-Path $server '.env'
$log = Join-Path $root 'setup.log'
function Log($msg) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg); Write-Host $msg }
function Set-EnvValue($key, $value) {
  # Quote the value so special characters (#, spaces, quotes) survive
  if ($value -notmatch "'") { $q = "'" + $value + "'" } else { $q = '"' + $value + '"' }
  $lines = Get-Content $envFile
  $found = $false
  $lines = $lines | ForEach-Object { if ($_ -match "^$key=") { $found = $true; "$key=$q" } else { $_ } }
  if (-not $found) { $lines += "$key=$q" }
  Set-Content -Path $envFile -Value $lines -Encoding ASCII
}
function Plain($secure) { [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)) }

Set-Content -Path $log -Value "=== TaskFlow setup log ==="
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "        TaskFlow - one-time setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Make sure Node.js is available (install it with winget if missing)
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
Refresh-Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "`n[0/4] Node.js is not installed - installing Node.js LTS (2-4 minutes)..." -ForegroundColor Yellow
  Write-Host "      If Windows asks 'Do you want to allow this app to make changes?', click YES." -ForegroundColor Yellow
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements 2>&1 | Out-File -Append -FilePath $log -Encoding utf8
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:Path = "C:\Program Files\nodejs;" + $env:Path
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Log "STEP0_FAILED node install"
    Write-Host "Node.js could not be installed automatically. Install it from https://nodejs.org (LTS) and run setup.bat again." -ForegroundColor Red
    exit 1
  }
}
Log ("STEP0_OK node " + (node -v))

# 0. Create server/.env with a fresh JWT secret if it doesn't exist yet
if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $server '.env.example') $envFile
  $bytes = New-Object byte[] 48; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  Set-EnvValue 'JWT_SECRET' (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
  Log "STEP0_OK created server/.env with a new JWT secret"
}

# 1. Install packages
Write-Host "`n[1/4] Installing packages (1-3 minutes)..." -ForegroundColor Yellow
Set-Location $root
npm run install:all 2>&1 | Out-File -Append -FilePath $log -Encoding utf8
if ($LASTEXITCODE -ne 0) { Log "STEP1_FAILED npm install"; Write-Host "Package install failed. See setup.log" -ForegroundColor Red; exit 1 }
Log "STEP1_OK packages installed"

# 2. MySQL password
Write-Host "`n[2/4] MySQL connection" -ForegroundColor Yellow
Write-Host "Type the MySQL ROOT password you chose when you installed MySQL."
Write-Host "(Nothing will appear while you type - that is normal. Press Enter when done.)"
Set-Location $server
$ok = $false
for ($i = 1; $i -le 5; $i++) {
  $pw = Plain (Read-Host -AsSecureString "MySQL root password")
  Set-EnvValue 'DB_PASSWORD' $pw
  $out = node scripts/check-db.js 2>&1
  $code = $LASTEXITCODE
  if ($code -eq 0) { Log "STEP2_OK $out"; $ok = $true; break }
  elseif ($code -eq 2) { Write-Host "Wrong password, try again ($i/5)." -ForegroundColor Red; Log "STEP2_WRONG_PASSWORD attempt $i" }
  else { Log "STEP2_FAILED $out"; Write-Host $out -ForegroundColor Red; break }
}
if (-not $ok) { Write-Host "Could not connect to MySQL. See setup.log" -ForegroundColor Red; Log "STEP2_GAVE_UP"; exit 1 }

# 3. Admin account
Write-Host "`n[3/4] Admin login for the TaskFlow app" -ForegroundColor Yellow
$email = Read-Host "Admin email   (press Enter to use admin@taskflow.com)"
if ([string]::IsNullOrWhiteSpace($email)) { $email = 'admin@taskflow.com' }
Set-EnvValue 'ADMIN_EMAIL' $email.Trim()
$adminPw = Plain (Read-Host -AsSecureString "Admin password (press Enter to use ChangeMe@123)")
if ([string]::IsNullOrWhiteSpace($adminPw)) { $adminPw = 'ChangeMe@123'; $usedDefault = $true }
Set-EnvValue 'ADMIN_PASSWORD' $adminPw
Log ("STEP3_OK admin email: " + $email.Trim() + $(if ($usedDefault) { " (default password)" } else { " (custom password)" }))

# 4. Database
Write-Host "`n[4/4] Creating the database, tables and demo data..." -ForegroundColor Yellow
$dbOut = npm run db:setup 2>&1
$dbOut | Out-File -Append -FilePath $log -Encoding utf8
$dbOut | Write-Host
if ($LASTEXITCODE -ne 0) { Log "STEP4_FAILED"; Write-Host "Database setup failed. See setup.log" -ForegroundColor Red; exit 1 }
Log "STEP4_OK database ready"
Log "SETUP_COMPLETE"

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " Setup complete!  Now double-click  start.bat" -ForegroundColor Green
Write-Host " Log in with: $($email.Trim())" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
