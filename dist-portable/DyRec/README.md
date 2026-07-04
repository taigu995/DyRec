# DyRec - 抖音直播自动录制工具

## 快速开始

### 便携版使用

1. 解压 `DyRec.zip` 到任意目录
2. 双击运行 `start.bat`
3. 浏览器会自动打开 `http://localhost:5000`
4. 首次启动会自动检测并下载 FFmpeg

### 打包 EXE 安装程序

如果你需要打包成 Windows EXE 安装程序：

1. 确保已安装：
   - Node.js 20+：https://nodejs.org/
   - FFmpeg：https://www.gyan.dev/ffmpeg/builds/

2. 双击运行 `scripts/build-exe.bat`

3. 等待构建完成（约 5-10 分钟）

4. 生成的 EXE 文件在 `dist-electron` 目录

## 功能特性

- 自动监控抖音直播间开播状态
- 支持原始流录制（最高画质）
- 支持合成录制（画面+弹幕+礼物）
- 支持录制结束自动转换格式（MP4/MKV/FLV）
- 手机端视角预览
- 弹幕滚动和礼物特效叠加
- 录制文件按主播名称分文件夹存储
- 支持开机自启动

## 系统要求

- Windows 10/11
- Node.js 20+（便携版已内置）
- FFmpeg（可自动下载）

## 问题反馈

如有问题，请检查：
1. FFmpeg 是否已安装（在设置页面或 /setup 页面检测）
2. 网络连接是否正常
3. 抖音直播间是否正在直播
