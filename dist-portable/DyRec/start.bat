@echo off
chcp 65001 >nul 2>&1

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.

REM Check Node.js
echo [INFO] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/zh-cn
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%
echo.

REM Check .next directory
echo [INFO] Checking .next directory...
if not exist ".next" (
    echo [ERROR] .next directory not found!
    echo.
    echo This usually means your extraction tool skipped hidden files.
    echo Please re-extract using 7-Zip or PowerShell:
    echo   Expand-Archive -Path DyRec.zip -DestinationPath . -Force
    echo.
    pause
    exit /b 1
)

if not exist ".next\BUILD_ID" (
    echo [ERROR] .next\BUILD_ID not found!
    echo Please re-download and re-extract the ZIP file.
    echo.
    pause
    exit /b 1
)

echo [OK] .next directory verified
echo.

REM Check FFmpeg
echo [INFO] Checking FFmpeg...
set FFMPEG_PATH=
for %%p in (ffmpeg.exe) do (
    if not "%%~$PATH:p"=="" (
        set "FFMPEG_PATH=%%~$PATH:p"
        echo [OK] FFmpeg found: %%~$PATH:p
    )
)

if defined FFMPEG_PATH (
    set "DYREC_FFMPEG_PATH=%FFMPEG_PATH%"
) else (
    echo [WARN] FFmpeg not found - recording disabled
    echo        You can install FFmpeg from /setup page
)
echo.

REM Install dependencies
echo [INFO] Checking dependencies...
if not exist "node_modules\next" (
    echo [INFO] Installing dependencies (first run)...
    call npm install --production --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

REM Start server
echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

node server.js

echo.
echo ============================================
echo   Server stopped
echo ============================================
echo.
pause
