@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   DyRec - 抖音直播录制工具 一键打包脚本
echo ==========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 20+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 正在安装 pnpm...
    npm install -g pnpm
)

:: 安装依赖
echo [1/5] 安装依赖...
pnpm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

:: 构建 Next.js
echo.
echo [2/5] 构建 Next.js 应用...
pnpm build
if %errorlevel% neq 0 (
    echo [错误] 构建失败
    pause
    exit /b 1
)

:: 打包 Electron
echo.
echo [3/5] 打包 Electron 应用 (Windows x64)...
npx @electron/packager . DyRec --platform=win32 --arch=x64 --out=dist-electron --overwrite --asar
if %errorlevel% neq 0 (
    echo [错误] 打包失败
    pause
    exit /b 1
)

:: 创建安装包 (可选)
echo.
echo [4/5] 创建安装程序...
npx electron-builder --win nsis --x64
if %errorlevel% neq 0 (
    echo [提示] 安装程序创建失败，但便携版已生成
)

:: 完成
echo.
echo [5/5] 打包完成!
echo.
echo ==========================================
echo   输出目录: dist-electron\
echo.
echo   便携版: dist-electron\DyRec-win32-x64\
echo     直接运行 DyRec.exe 即可
echo.
echo   安装版: dist-electron\DyRec-1.0.0-Setup.exe
echo     双击安装到系统
echo.
echo   注意: 请确保 ffmpeg.exe 在系统 PATH 中
echo     或放在 DyRec 运行目录下
echo ==========================================
echo.

:: 打开输出目录
explorer dist-electron

pause
