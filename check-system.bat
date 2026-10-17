@echo off
cd /d "%~dp0"
set LOG=%~dp0system-check.log
echo === TaskFlow system check === > "%LOG%"
echo [node] >> "%LOG%"
where node >> "%LOG%" 2>&1
node -v >> "%LOG%" 2>&1
echo [npm] >> "%LOG%"
call npm -v >> "%LOG%" 2>&1
echo [git] >> "%LOG%"
git --version >> "%LOG%" 2>&1
echo [winget] >> "%LOG%"
winget --version >> "%LOG%" 2>&1
echo [mysql on PATH] >> "%LOG%"
where mysql >> "%LOG%" 2>&1
echo [mysql services] >> "%LOG%"
powershell -NoProfile -Command "Get-Service | Where-Object { $_.Name -like '*mysql*' -or $_.Name -like '*maria*' } | Format-Table Name,Status,StartType -AutoSize | Out-String -Width 200" >> "%LOG%" 2>&1
echo [mysql folders] >> "%LOG%"
dir /b "C:\Program Files\MySQL" >> "%LOG%" 2>&1
dir /b "C:\xampp\mysql\bin\mysql.exe" >> "%LOG%" 2>&1
echo [port 3306] >> "%LOG%"
netstat -ano | findstr ":3306" >> "%LOG%" 2>&1
echo [port 5000 / 5173] >> "%LOG%"
netstat -ano | findstr ":5000 :5173" >> "%LOG%" 2>&1
echo === done === >> "%LOG%"
echo Check finished. You can close this window.
timeout /t 3 >nul
