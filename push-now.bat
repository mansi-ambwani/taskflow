@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push-to-github.ps1" -RepoUrl "https://github.com/mansi-ambwani/taskflow" -GitName "Mansi Ambwani" -GitEmail "mansiambwani80@gmail.com" -Message "Add invite-only sign-up with shareable invite link"
echo.
pause
