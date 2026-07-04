// ============================================================
// SSE 弹幕流 API - 将抖音 WebSocket 消息转发给前端
// ============================================================

import { NextRequest } from 'next/server';
import { getOrCreateClient, removeClient } from '@/lib/douyin-ws';
import { getRooms } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get('roomId');
  if (!roomId) {
    return new Response(JSON.stringify({ error: '缺少 roomId 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 获取 cookie
  const rooms = getRooms();
  const room = rooms.find((r) => r.roomId === roomId);
  const settings = (() => {
    try {
      return JSON.parse(
        require('fs').readFileSync(
          require('path').join(process.cwd(), 'data', 'settings.json'),
          'utf-8'
        )
      );
    } catch {
      return { cookie: '' };
    }
  })();
  const cookie = settings?.cookie || '';

  // 创建 SSE 流
  const encoder = new TextEncoder();
  let clientClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // 获取或创建 WebSocket 客户端
      const client = getOrCreateClient(roomId, cookie);

      // 监听消息并转发
      const onMessage = (msg: Record<string, unknown>) => {
        if (clientClosed) return;
        try {
          const data = JSON.stringify({
            ...msg,
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          });
          controller.enqueue(
            encoder.encode(`data: ${data}\n\n`)
          );
        } catch {
          // ignore
        }
      };

      const onStatus = (status: string) => {
        if (clientClosed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'status', status })}\n\n`
            )
          );
        } catch {
          // ignore
        }
      };

      client.on('message', onMessage);
      client.on('status', onStatus);

      // 连接 WebSocket
      client.connect().catch(() => {
        // ignore
      });

      // 发送初始状态
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'status', status: client.isConnected ? 'connected' : 'connecting' })}\n\n`
        )
      );

      // 心跳保持连接
      const heartbeat = setInterval(() => {
        if (clientClosed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // 清理函数
      const cleanup = () => {
        clientClosed = true;
        clearInterval(heartbeat);
        client.off('message', onMessage);
        client.off('status', onStatus);
        // 如果没有其他监听器，断开连接
        if (client.listenerCount('message') === 0) {
          removeClient(roomId);
        }
      };

      // 监听请求中断
      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
