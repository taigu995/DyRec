@echo off
chcp 65001 >nul
title DyRec - Douyin Live Recorder

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/zh-cn
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    if exist ".deps\ffmpeg\bin\ffmpeg.exe" (
        echo [OK] FFmpeg found in .deps folder
        set PATH=%PATH%;%CD%\.deps\ffmpeg\bin
    ) else (
        echo [WARN] FFmpeg not found - will auto-download
        echo        You can also install FFmpeg from /setup page
    )
) else (
    echo [OK] FFmpeg found
)

echo.
echo --------------------------------------------
echo   Installing dependencies...
echo --------------------------------------------
echo.

REM Install dependencies using Chinese mirror
call npm install --production --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund --loglevel=error 2>&1

if %errorlevel% neq 0 (
    echo.
    echo [WARN] Dependency installation failed
    echo       You can try running: npm install --production
    echo.
)

echo.
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.

REM Set environment variables
set NODE_ENV=production
set PORT=5000

REM Start the server in background and open browser
echo [INFO] Server starting on http://localhost:5000
echo [INFO] Opening browser...
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

REM Start server and keep window open
node server.js

REM If server exits, pause to show any error messages
echo.
echo [INFO] Server stopped
pause
