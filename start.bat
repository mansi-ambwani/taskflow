@echo off
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
echo Starting TaskFlow...
start "TaskFlow API (keep open)" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 4 /nobreak >nul
start "TaskFlow Web (keep open)" cmd /k "cd /d "%~dp0client" && npm run dev"
timeout /t 6 /nobreak >nul
start "" http://localhost:5173
echo.
echo Two windows opened: "TaskFlow API" and "TaskFlow Web". Keep them open while you use the app.
echo To stop the app, close those two windows.
timeout /t 8 >nul
