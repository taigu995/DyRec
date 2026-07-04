@echo off
chcp 65001 >nul
title DyRec - Douyin Live Recorder

REM Create logs directory
if not exist "logs" mkdir logs

REM Get current timestamp for log filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
set datetime=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%%datetime:~10,2%%datetime:~12,2%

REM Log file paths
set LOG_FILE=logs\startup_%datetime%.log
set ERROR_FILE=logs\startup_%datetime%.error.log

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.
echo [INFO] Log file: %LOG_FILE%
echo [INFO] Error log: %ERROR_FILE%
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! >> "%LOG_FILE%"
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/zh-cn
    echo Please install Node.js 20+ from https://nodejs.org/zh-cn >> "%LOG_FILE%"
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%
echo [OK] Node.js found: %NODE_VERSION% >> "%LOG_FILE%"

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    if exist ".deps\ffmpeg\bin\ffmpeg.exe" (
        echo [OK] FFmpeg found in .deps folder
        echo [OK] FFmpeg found in .deps folder >> "%LOG_FILE%"
        set PATH=%PATH%;%CD%\.deps\ffmpeg\bin
    ) else (
        echo [WARN] FFmpeg not found - will auto-download
        echo [WARN] FFmpeg not found - will auto-download >> "%LOG_FILE%"
        echo        You can also install FFmpeg from /setup page
    )
) else (
    echo [OK] FFmpeg found
    echo [OK] FFmpeg found >> "%LOG_FILE%"
)

echo.
echo --------------------------------------------
echo   Installing dependencies...
echo --------------------------------------------
echo.
echo [%date% %time%] Installing dependencies... >> "%LOG_FILE%"

REM Install dependencies using Chinese mirror
call npm install --production --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund >> "%LOG_FILE%" 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [WARN] Dependency installation failed
    echo [WARN] Dependency installation failed >> "%LOG_FILE%"
    echo       You can try running: npm install --production
    echo.
)

echo.
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.
echo [%date% %time%] Starting DyRec server... >> "%LOG_FILE%"

REM Set environment variables
set NODE_ENV=production
set PORT=5000

REM Start the server in background and open browser
echo [INFO] Server starting on http://localhost:5000
echo [INFO] Opening browser...
echo [INFO] Server starting on http://localhost:5000 >> "%LOG_FILE%"
start "" http://localhost:5000

REM Wait a moment for browser to open
timeout /t 2 /nobreak >nul

REM Auto-check and install dependencies via API (in background)
start /b cmd /c "timeout /t 5 /nobreak >nul && curl -s -X POST http://localhost:5000/api/dependencies -H \"Content-Type: application/json\" -d \"{\\\"action\\\":\\\"auto\\\"}\" >nul 2>&1"

echo [INFO] Checking dependencies in background...
echo.
echo [INFO] DyRec is running at http://localhost:5000
echo [INFO] Press Ctrl+C to stop the server
echo.
echo [INFO] Logs are saved to: %LOG_FILE%
echo.

REM Start server and redirect output to log file
echo [%date% %time%] Server started >> "%LOG_FILE%"
node server.js >> "%LOG_FILE%" 2>> "%ERROR_FILE%"

REM If server exits, log it
echo.
echo [%date% %time%] Server stopped >> "%LOG_FILE%"
echo.
echo [INFO] Server stopped
echo [INFO] Check logs at: %LOG_FILE%
echo [INFO] Check errors at: %ERROR_FILE%
echo.
echo If startup failed, please share the log files for debugging.
echo.
pause
