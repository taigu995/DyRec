import { NextRequest, NextResponse } from 'next/server';
import { saveCustomFFmpegPath, checkFFmpeg, DepStatus } from '@/lib/dependency-installer';

/**
 * POST /api/dependencies/ffmpeg-path - 设置自定义 FFmpeg 路径
 * Body: { path: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: ffmpegPath } = body as { path?: string };

    if (!ffmpegPath) {
      return NextResponse.json(
        { success: false, error: '请提供 FFmpeg 路径' },
        { status: 400 }
      );
    }

    const saved = saveCustomFFmpegPath(ffmpegPath);
    
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '路径无效或 FFmpeg 文件不存在' },
        { status: 400 }
      );
    }

    // 重新检测 FFmpeg 状态
    const checkResult = checkFFmpeg();
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'FFmpeg 路径已保存',
        path: ffmpegPath,
        check: checkResult,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
