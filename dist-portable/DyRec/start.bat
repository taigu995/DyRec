@echo off
chcp 65001 >nul
title DyRec - 抖音直播录制工具

echo ========================================
echo   DyRec - 抖音直播录制管理工具
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js 20 或更高版本
    echo 下载地址: https://nodejs.org/zh-cn
    echo.
    pause
    exit /b 1
)

:: 检查 FFmpeg
set FFMPEG_PATH=
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] FFmpeg 已检测到
    set FFMPEG_PATH=ffmpeg
) else (
    if exist "%~dp0ffmpeg\ffmpeg.exe" (
        echo [OK] FFmpeg 已检测到 (本地)
        set FFMPEG_PATH=%~dp0ffmpeg\ffmpeg.exe
    ) else (
        echo [警告] 未检测到 FFmpeg
        echo 录制功能将不可用
        echo.
        echo 安装方法:
        echo   1. 从 https://ffmpeg.org/download.html 下载 FFmpeg
        echo   2. 将 ffmpeg.exe 放到 %~dp0ffmpeg\ 目录
        echo   3. 或者添加到系统 PATH 环境变量
        echo.
    )
)

:: 设置环境变量
set DEPLOY_RUN_PORT=5000
set COZE_PROJECT_ENV=PROD
set NODE_ENV=production
if defined FFMPEG_PATH (
    set FFMPEG_PATH=%FFMPEG_PATH%
)

echo.
echo 正在启动 DyRec 服务...
echo 启动后请在浏览器中访问: http://localhost:5000
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

:: 启动 Next.js 服务器
cd /d "%~dp0"
start http://localhost:5000
node server.js

pause
