@echo off
chcp 65001 >nul 2>&1
title DyRec - Douyin Live Recorder

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo.
    echo Please install Node.js 20+ from:
    echo https://nodejs.org/zh-cn
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
node -v

REM Check FFmpeg (optional)
where ffmpeg >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] FFmpeg not found - recording disabled
    echo        You can install FFmpeg from the app settings
) else (
    echo [OK] FFmpeg found
    ffmpeg -version 2>nul | findstr /i "version"
)

echo.
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.

REM Set environment variables
set PORT=5000
set HOSTNAME=localhost
set NODE_ENV=production

REM Start the server
cd /d "%~dp0"
node server.js

REM If server exits
echo.
echo [INFO] Server stopped
pause
