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

echo.
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.

set PORT=5000
set HOSTNAME=localhost
set NODE_ENV=production

start http://localhost:5000
node server.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start
    echo.
    echo If you see module not found errors, run:
    echo   npm install
    echo.
    pause
)
