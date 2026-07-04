@echo off
chcp 65001 >nul
title DyRec - 抖音直播录制工具

echo ========================================
echo    DyRec - 抖音直播录制工具
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

:: 显示 Node.js 版本
echo [信息] Node.js 版本:
node -v
echo.

:: 检查 FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未检测到 FFmpeg，录制功能可能无法使用
    echo 可在程序内一键安装 FFmpeg
    echo.
) else (
    echo [信息] FFmpeg 已就绪
    echo.
)

:: 设置环境变量
set NODE_ENV=production
set PORT=5000
set HOSTNAME=0.0.0.0

echo [启动] 正在启动 DyRec 服务...
echo [信息] 服务地址: http://localhost:5000
echo.
echo 按 Ctrl+C 可停止服务
echo ========================================
echo.

:: 自动打开浏览器
start http://localhost:5000

:: 启动服务
node server.js

pause
