@echo off
chcp 65001 >nul 2>&1

echo ============================================
echo   DyRec - Build Windows EXE Installer
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    pause
    exit /b 1
)

echo [1/4] Cleaning old files...
if exist dist-electron rmdir /s /q dist-electron

echo [2/4] Installing dependencies...
call npm install --legacy-peer-deps --registry=https://registry.npmmirror.com
if errorlevel 1 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo [3/4] Building Next.js...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo [4/4] Building EXE...
call npx electron-builder --win --x64
if errorlevel 1 (
    echo [ERROR] EXE build failed!
    pause
    exit /b 1
)

echo.
echo Build completed!
echo EXE location: dist-electronDyRec-*-Setup.exe
echo.
pause