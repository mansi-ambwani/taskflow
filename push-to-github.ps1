# Pushes the TaskFlow project to your GitHub repository. Run by double-clicking push-to-github.bat
param([string]$RepoUrl = '', [string]$GitName = '', [string]$GitEmail = '', [string]$Message = 'TaskFlow: full-stack task management app (React, Node.js, Express, MySQL)')
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$log = Join-Path $root 'push.log'
function Log($msg) { Add-Content -Path $log -Value ("[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg); Write-Host $msg }
Set-Content -Path $log -Value "=== TaskFlow GitHub push log ==="

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "        TaskFlow - push to GitHub" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Log "FAILED git not installed"; Write-Host "Git is not installed. Install it from https://git-scm.com and run this again." -ForegroundColor Red; exit 1 }

# 1. Your name/email for commits (only asked once)
if (-not (Test-Path (Join-Path $root '.git'))) { git init 2>&1 | Out-Null; Log "STEP2 git init" }
$name = git config user.name
$mail = git config user.email
if (-not $name) { if ($GitName) { $name = $GitName } else { $name = Read-Host "Your name (shown on your GitHub commits)" }; git config user.name "$name" }
if (-not $mail) { if ($GitEmail) { $mail = $GitEmail } else { $mail = Read-Host "The email you use for GitHub" }; git config user.email "$mail" }
Log "STEP1_OK git identity: $name"

# 2. Create the local repository and commit
if (-not (Test-Path (Join-Path $root '.git'))) { git init 2>&1 | Out-Null; Log "STEP2 git init" }
git add -A 2>&1 | Out-Null

# Safety check: never upload secrets
$staged = git diff --cached --name-only
$secret = $staged | Where-Object { $_ -match '(^|/)\.env$' }
if ($secret) { Log "STOPPED secret file staged: $secret"; Write-Host "STOPPED: a .env file with passwords was about to be uploaded ($secret). Nothing was pushed." -ForegroundColor Red; exit 1 }
if ($staged | Where-Object { $_ -match 'node_modules/' }) { Log "STOPPED node_modules staged"; Write-Host "STOPPED: node_modules was about to be uploaded. Nothing was pushed." -ForegroundColor Red; exit 1 }

$count = ($staged | Measure-Object).Count
if ($count -gt 0) {
  git commit -m "$Message" 2>&1 | Out-File -Append -FilePath $log -Encoding utf8
  Log "STEP2_OK committed $count files (.env and node_modules excluded)"
} else { Log "STEP2_OK nothing new to commit" }
git branch -M main 2>&1 | Out-Null

# 3. Connect to GitHub and push
Write-Host "`nPaste your GitHub repository link (looks like https://github.com/yourname/taskflow.git)" -ForegroundColor Yellow
do {
  if ($RepoUrl) { $url = $RepoUrl.Trim(); $RepoUrl = '' } else { $url = (Read-Host "Repository link").Trim() }
  $valid = $url -match '^https://github\.com/[^/\s]+/[^/\s]+?(\.git)?/?$'
  if (-not $valid) { Write-Host "That doesn't look like a GitHub repository link. Try again." -ForegroundColor Red }
} until ($valid)
if (-not $url.EndsWith('.git')) { $url = $url.TrimEnd('/') + '.git' }

git remote remove origin 2>$null
git remote add origin $url
Log "STEP3 remote set to $url"
Write-Host "`nUploading... If a GitHub sign-in window opens, sign in there." -ForegroundColor Yellow
git push -u origin main 2>&1 | Tee-Object -Variable pushOut | Write-Host
$pushOut | Out-File -Append -FilePath $log -Encoding utf8
if ($LASTEXITCODE -ne 0) { Log "STEP3_FAILED push"; Write-Host "`nPush failed. Send a screenshot of this window to Claude." -ForegroundColor Red; exit 1 }
Log "STEP3_OK pushed to $url"
Log "PUSH_COMPLETE"

$web = $url -replace '\.git$',''
Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " Done! Your code is on GitHub:" -ForegroundColor Green
Write-Host " $web" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
