import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/browse - 浏览文件夹
 * Electron 环境：打开系统文件夹选择对话框
 * Web 环境：返回提示信息
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { initialPath } = await request.json().catch(() => ({ initialPath: '' }));

    // 检查是否在 Electron 环境中
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      // Electron 环境：使用系统对话框
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: initialPath || undefined,
        title: '选择保存目录',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return NextResponse.json({
          success: false,
          error: '用户取消选择',
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          path: result.filePaths[0],
        },
      });
    }

    // Web 环境：返回提示
    return NextResponse.json({
      success: false,
      error: '当前为 Web 模式，请手动输入保存目录路径（如 ./recordings 或 D:/recordings）',
      isElectron: false,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '浏览文件夹失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
