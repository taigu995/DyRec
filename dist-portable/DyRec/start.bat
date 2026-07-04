@echo off
chcp 65001 >nul 2>&1
title DyRec - Douyin Live Recorder
cd /d "%~dp0"

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

REM Check Node.js
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

REM Check FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] FFmpeg not found - recording disabled
    echo        You can install FFmpeg from the app settings
) else (
    echo [OK] FFmpeg found
)

REM Check if dependencies are installed
if not exist "node_modules\next" (
    echo.
    echo [INFO] Installing dependencies ^(first run^)...
    echo        This may take a few minutes...
    echo.
    call npm install --production
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

REM Start the server
set PORT=5000
set HOSTNAME=localhost
node server.js

REM If server exits
echo.
echo [INFO] Server stopped
pause
