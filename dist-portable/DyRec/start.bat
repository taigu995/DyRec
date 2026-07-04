@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found
    echo Please install Node.js from https://nodejs.org/zh-cn
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

echo.

REM Check if node_modules exists and is complete
if not exist "node_modules\next" (
    echo --------------------------------------------
    echo   Installing dependencies (first run)...
    echo --------------------------------------------
    echo.
    echo Using Chinese mirror for faster download...
    echo.
    call npm install --production --omit=dev --registry=https://registry.npmmirror.com --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies
        echo Please check your network connection and try again
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed
    echo.
)

echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.

REM Set environment variables
set NODE_ENV=production
set PORT=5000
set HOSTNAME=0.0.0.0

REM Start server
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start
    echo.
    echo If you see module not found errors, try:
    echo   rmdir /s /q node_modules
    echo   npm install --production --registry=https://registry.npmmirror.com
    echo.
)

echo.
echo [INFO] Server stopped
pause
