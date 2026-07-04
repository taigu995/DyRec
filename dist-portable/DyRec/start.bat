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
    echo [WARN] FFmpeg not found - recording disabled
    echo        You can install FFmpeg from the app settings
) else (
    echo [OK] FFmpeg found
)

echo.
echo --------------------------------------------
echo   Installing dependencies...
echo --------------------------------------------
echo.

REM Install dependencies using Chinese mirror
call npm install --production --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund --loglevel=error

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

node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start
    echo.
    echo If you see module not found errors, run:
    echo   npm install --production
    echo.
)

echo.
echo [INFO] Server stopped
pause
