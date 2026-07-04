@echo off
chcp 65001 >nul 2>&1
title DyRec - Douyin Live Recorder
cd /d "%~dp0"

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js found: %NODE_VER%

:: Check FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] FFmpeg not found - recording disabled
    echo        You can install FFmpeg from the app settings
) else (
    for /f "tokens=*" %%i in ('ffmpeg -version 2^>^&1 ^| findstr /i "version"') do set FF_VER=%%i
    echo [OK] FFmpeg found: %FF_VER%
)

:: Check if dependencies are installed
if not exist "node_modules\next" (
    echo.
    echo [INFO] Installing dependencies (first run)...
    echo        This may take a few minutes...
    echo.
    npm install --production
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
)

echo.
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.
echo   Open browser: http://localhost:5000
echo   Press Ctrl+C to stop
echo.
echo --------------------------------------------
echo.

:: Start server
set PORT=5000
set HOSTNAME=localhost
node server.js

echo.
echo [INFO] Server stopped
pause
