@echo off
chcp 65001 >nul 2>&1

echo ============================================
echo   DyRec - Douyin Live Recorder
echo ============================================
echo.

REM Check Node.js
echo [INFO] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)
echo [OK] Node.js found
echo.

REM Check build directory
echo [INFO] Checking build directory...
if not exist "next-build" (
    echo [ERROR] next-build directory not found!
    pause
    exit /b 1
)
echo [OK] Build directory found
echo.

REM Install dependencies if needed
echo [INFO] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install --production --legacy-peer-deps
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
echo   Starting server...
echo --------------------------------------------
echo.
node server.js

echo.
echo Server stopped.
pause