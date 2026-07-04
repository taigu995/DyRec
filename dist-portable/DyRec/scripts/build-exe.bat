@echo off
chcp 65001 >nul 2>&1
title DyRec - Build Windows EXE

echo ============================================
echo   DyRec - Build Windows EXE Installer
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org/zh-cn
    pause
    exit /b 1
)

REM Check pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing pnpm...
    npm install -g pnpm
)

echo [OK] Node.js and pnpm found
echo.

REM Navigate to project directory
cd /d "%~dp0\.."

echo [1/4] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building Next.js app...
call pnpm build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Packaging Electron app (this may take 5-10 minutes)...
call npx electron-builder --win portable --x64
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Packaging failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo.
echo ============================================
echo   Output files:
echo ============================================
echo   dist-electron\DyRec.exe (portable)
echo   dist-electron\DyRec-1.0.0-Setup.exe (installer)
echo ============================================
echo.

REM Open output directory
explorer dist-electron

pause
