import { NextRequest, NextResponse } from 'next/server';
import { autoInstall, checkAll, installFFmpeg, checkFFmpeg, DepStatus } from '@/lib/dependency-installer';

/**
 * GET /api/dependencies - 检测依赖状态
 */
export async function GET() {
  try {
    const results = await checkAll();
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dependencies - 自动安装缺失依赖
 * Body: { action: 'auto' | 'install-ffmpeg' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action === 'install-ffmpeg') {
      // 只安装 FFmpeg
      const ffmpegPath = await installFFmpeg();
      return NextResponse.json({ 
        success: true, 
        data: { 
          message: 'FFmpeg 安装成功',
          path: ffmpegPath 
        } 
      });
    }

    // 默认：自动检测并安装所有缺失依赖
    const results = await autoInstall();
    
    // 检查是否有失败的
    const failed = results.filter(r => r.status === DepStatus.FAILED);
    const installed = results.filter(r => r.status === DepStatus.INSTALLED);
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        results,
        summary: {
          total: results.length,
          installed: installed.length,
          failed: failed.length,
        }
      } 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
