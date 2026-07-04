# DyRec 打包为 Windows EXE 指南

## 快速开始（Windows 机器上操作）

### 方法一：一键打包（推荐）

1. 将整个项目文件夹复制到 Windows 电脑
2. 双击运行 `scripts/build-exe.bat`
3. 等待打包完成（约 5-10 分钟）
4. 生成的文件在 `dist-electron/` 目录

### 方法二：手动打包

```bash
# 1. 安装依赖
pnpm install

# 2. 构建 Next.js
pnpm build

# 3. 打包 Electron（便携版，无需安装）
npx @electron/packager . DyRec --platform=win32 --arch=x64 --out=dist-electron --overwrite --asar

# 4. 或打包为安装程序（需要管理员权限安装）
npx electron-builder --win nsis --x64
```

## 输出文件说明

| 文件 | 说明 |
|------|------|
| `dist-electron/DyRec-win32-x64/` | 便携版，直接运行 `DyRec.exe` |
| `dist-electron/DyRec-1.0.0-Setup.exe` | 安装版，双击安装到系统 |

## 前置要求

- **Node.js** 20+ ([下载](https://nodejs.org/))
- **pnpm** (`npm install -g pnpm`)
- **FFmpeg** - 录制功能需要 ([下载](https://ffmpeg.org/download.html))
  - 将 `ffmpeg.exe` 放到系统 PATH 中，或放在 DyRec 运行目录下

## FFmpeg 安装

录制功能依赖 FFmpeg。下载后：

1. 解压 `ffmpeg.exe` 
2. 放到 DyRec 运行目录，或
3. 添加到系统环境变量 PATH

验证：打开命令行输入 `ffmpeg -version`

## 开发模式

```bash
# 启动 Electron 开发模式（热更新）
pnpm electron:dev
```

## 常见问题

### Q: 打包后启动黑屏？
A: 已在配置中禁用硬件加速，如仍有问题尝试更新显卡驱动。

### Q: 录制功能不可用？
A: 确保 FFmpeg 已安装且在 PATH 中。

### Q: 杀毒软件报毒？
A: Electron 打包的程序可能被误报，添加信任即可。

### Q: 端口被占用？
A: 设置环境变量 `PORT=其他端口` 后启动。
