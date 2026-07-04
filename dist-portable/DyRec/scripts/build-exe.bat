@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================
echo   DyRec - Build Windows EXE Installer
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] pnpm not found, installing...
    npm install -g pnpm
)

echo.
echo --------------------------------------------
echo   [1/4] Cleaning old files...
echo --------------------------------------------
if exist node_modules rmdir /s /q node_modules
if exist .next rmdir /s /q .next
if exist dist-electron rmdir /s /q dist-electron
if exist pnpm-lock.yaml del /f pnpm-lock.yaml
echo [OK] Cleaned old files

echo.
echo --------------------------------------------
echo   [2/4] Installing dependencies...
echo --------------------------------------------
pnpm install --no-frozen-lockfile
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo --------------------------------------------
echo   [3/4] Building Next.js...
echo --------------------------------------------
pnpm build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Next.js!
    pause
    exit /b 1
)
echo [OK] Next.js built

echo.
echo --------------------------------------------
echo   [4/4] Building EXE installer...
echo --------------------------------------------
npx electron-builder --win --x64
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build EXE!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build completed!
echo ============================================
echo.
echo EXE installer location:
echo   dist-electron\DyRec-*-Setup.exe
echo.
echo You can now install DyRec on Windows 10!
echo.
pause
