import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

/**
 * 依赖检测 API（Web 环境使用）
 * Electron 环境通过 IPC 直接调用原生模块，不经过此 API
 */

function checkFFmpeg(): {
  name: string;
  status: string;
  version: string | null;
  path: string | null;
  source: string | null;
  description: string;
  optional: boolean;
} {
  try {
    const result = execSync('ffmpeg -version', {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const version = result.split('\n')[0].trim();
    return {
      name: 'FFmpeg',
      status: 'installed',
      version,
      path: 'system',
      source: 'system',
      description: '录制功能已就绪',
      optional: false,
    };
  } catch {
    return {
      name: 'FFmpeg',
      status: 'not_installed',
      version: null,
      path: null,
      source: null,
      description: '录制功能需要 FFmpeg，请安装后重试',
      optional: false,
    };
  }
}

function checkNodeJS(): {
  name: string;
  status: string;
  version: string | null;
  path: string | null;
  source: string | null;
  description: string;
  optional: boolean;
} {
  try {
    const result = execSync('node --version', {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return {
      name: 'Node.js',
      status: 'installed',
      version: result.trim(),
      path: 'system',
      source: 'system',
      description: '运行时环境正常',
      optional: true,
    };
  } catch {
    return {
      name: 'Node.js',
      status: 'installed',
      version: '内置于 Next.js 运行时',
      path: null,
      source: 'bundled',
      description: '运行时环境正常（内置）',
      optional: true,
    };
  }
}

export async function GET() {
  try {
    const ffmpeg = checkFFmpeg();
    const nodejs = checkNodeJS();

    return NextResponse.json({
      success: true,
      data: [ffmpeg, nodejs],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '检测失败' },
      { status: 500 }
    );
  }
}
