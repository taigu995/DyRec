#!/bin/bash
# DyRec Electron 打包脚本
# 用于将 Next.js Web 应用打包为 Windows EXE 桌面程序

set -e

echo "=========================================="
echo "  DyRec - 抖音直播录制工具 打包脚本"
echo "=========================================="

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# 1. 构建 Next.js 应用
echo ""
echo "[1/4] 构建 Next.js 应用..."
pnpm build

# 2. 检查 Electron 依赖
echo ""
echo "[2/4] 检查 Electron 依赖..."
if ! command -v npx &> /dev/null; then
    echo "错误: 未找到 npx，请确保 Node.js 已安装"
    exit 1
fi

# 3. 打包 Electron 应用
echo ""
echo "[3/4] 打包 Electron 应用 (Windows x64)..."
npx electron-builder --win --x64

# 4. 输出结果
echo ""
echo "[4/4] 打包完成!"
echo ""
echo "输出目录: $PROJECT_ROOT/dist-electron/"
echo ""
echo "生成的文件:"
ls -la "$PROJECT_ROOT/dist-electron/" 2>/dev/null || echo "  (无文件)"
echo ""
echo "=========================================="
echo "  安装说明:"
echo "  1. 将 dist-electron/ 中的 DyRec-*.exe"
echo "     复制到 Windows 电脑"
echo "  2. 双击运行安装程序"
echo "  3. 安装完成后启动 DyRec"
echo "  4. 确保 ffmpeg.exe 在系统 PATH 中"
echo "     或放在 DyRec 安装目录下"
echo "=========================================="
