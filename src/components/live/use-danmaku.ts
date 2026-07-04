'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { LiveMessage, DanmakuConnectionStatus } from '@/lib/types';

interface UseDanmakuOptions {
  roomId: string;
  enabled: boolean;
}

interface UseDanmakuReturn {
  messages: LiveMessage[];
  status: DanmakuConnectionStatus;
  clearMessages: () => void;
  stats: {
    chatCount: number;
    giftCount: number;
    enterCount: number;
    likeCount: number;
  };
}

export function useDanmaku({
  roomId,
  enabled,
}: UseDanmakuOptions): UseDanmakuReturn {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<DanmakuConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const maxMessages = 200;

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStatus('disconnected');
      return;
    }

    // 创建 SSE 连接
    const es = new EventSource(`/api/danmaku?roomId=${encodeURIComponent(roomId)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        if (data.type === 'status' && typeof data.status === 'string') {
          setStatus(data.status as DanmakuConnectionStatus);
          return;
        }

        if (data.type && data.type !== 'status') {
          setMessages((prev) => {
            const next = [...prev, data as unknown as LiveMessage];
            // 限制消息数量
            if (next.length > maxMessages) {
              return next.slice(-maxMessages);
            }
            return next;
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setStatus('error');
    };

    es.onopen = () => {
      setStatus('connected');
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setStatus('disconnected');
    };
  }, [roomId, enabled]);

  const stats = {
    chatCount: messages.filter((m) => m.type === 'chat').length,
    giftCount: messages.filter((m) => m.type === 'gift').length,
    enterCount: messages.filter((m) => m.type === 'enter').length,
    likeCount: messages.filter((m) => m.type === 'like').length,
  };

  return { messages, status, clearMessages, stats };
}
