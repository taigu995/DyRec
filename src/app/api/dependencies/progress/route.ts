import { NextRequest } from 'next/server';
import { installFFmpeg, checkFFmpeg, DepStatus } from '@/lib/dependency-installer';

/**
 * GET /api/dependencies/progress - SSE 进度流
 * 用于实时显示 FFmpeg 安装进度
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'install-ffmpeg';

  // 创建 SSE 流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 检查 FFmpeg 是否已安装
        const ffmpegCheck = await checkFFmpeg();
        if (ffmpegCheck.status === DepStatus.INSTALLED) {
          sendEvent({ type: 'complete', percent: 100, message: 'FFmpeg 已安装' });
          controller.close();
          return;
        }

        sendEvent({ type: 'start', percent: 0, message: '开始安装 FFmpeg...' });

        // 安装 FFmpeg，带进度回调
        const ffmpegPath = await installFFmpeg((progress) => {
          sendEvent({
            type: 'progress',
            stage: progress.stage,
            percent: progress.percent,
            message: progress.message,
          });
        });

        sendEvent({
          type: 'complete',
          percent: 100,
          message: 'FFmpeg 安装成功',
          path: ffmpegPath,
        });
      } catch (error) {
        sendEvent({
          type: 'error',
          percent: 0,
          message: `安装失败: ${(error as Error).message}`,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
