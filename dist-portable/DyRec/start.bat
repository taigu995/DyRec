@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM Create logs directory
if not exist "logs" mkdir logs

REM Generate log filename with timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set LOG_FILE=logs\startup_%TIMESTAMP%.log
set ERROR_LOG=logs\startup_%TIMESTAMP%.error.log

REM Initialize log file
echo [%date% %time%] DyRec Startup Log > "%LOG_FILE%"
echo [%date% %time%] Working directory: %CD% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo ============================================
echo   DyRec - Douyin Live Recorder Startup
echo ============================================
echo.
echo Log file: %LOG_FILE%
echo.

REM Check Node.js
echo [INFO] Checking Node.js...
echo [%date% %time%] Checking Node.js... >> "%LOG_FILE%"
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
echo. >> "%LOG_FILE%"

REM Check FFmpeg
echo [INFO] Checking FFmpeg...
echo [%date% %time%] Checking FFmpeg... >> "%LOG_FILE%"
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
echo. >> "%LOG_FILE%"

echo --------------------------------------------
echo   Installing dependencies...
echo --------------------------------------------
echo.
echo [%date% %time%] Installing dependencies... >> "%LOG_FILE%"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found, installing...
    echo [INFO] node_modules not found, installing... >> "%LOG_FILE%"
) else (
    echo [INFO] node_modules exists, checking...
    echo [INFO] node_modules exists >> "%LOG_FILE%"
)

REM Install dependencies using Chinese mirror
echo [INFO] Running: npm install --production --legacy-peer-deps
echo [INFO] Running: npm install --production --legacy-peer-deps >> "%LOG_FILE%"
call npm install --production --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund >> "%LOG_FILE%" 2>&1

if %errorlevel% neq 0 (
    echo [ERROR] npm install failed with error code: %errorlevel%
    echo [ERROR] npm install failed with error code: %errorlevel% >> "%LOG_FILE%"
    echo Please check the log file for details: %LOG_FILE%
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo [OK] Dependencies installed
echo [OK] Dependencies installed >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo --------------------------------------------
echo   Starting DyRec server...
echo --------------------------------------------
echo.
echo [%date% %time%] Starting server... >> "%LOG_FILE%"

REM Check if server.js exists
if not exist "server.js" (
    echo [ERROR] server.js not found!
    echo [ERROR] server.js not found! >> "%LOG_FILE%"
    echo Please make sure you are running this script from the DyRec directory.
    pause
    exit /b 1
)

echo [INFO] Running: node server.js
echo [INFO] Running: node server.js >> "%LOG_FILE%"
echo.

REM Set environment variables
set NODE_ENV=production
set PORT=5000

REM Start server and capture output
echo [%date% %time%] Server starting... >> "%LOG_FILE%"
echo.
echo Server is starting on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

REM Start server with output to both console and log
node server.js >> "%LOG_FILE%" 2>> "%ERROR_LOG%"

REM If server exits, show message
echo.
echo [%date% %time%] Server exited with code: %errorlevel% >> "%LOG_FILE%"
echo.
echo ============================================
echo   Server stopped
echo ============================================
echo.
echo Log file: %LOG_FILE%
echo Error log: %ERROR_LOG%
echo.
echo Press any key to exit...
pause >nul
