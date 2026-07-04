'use client';

import { useEffect, useRef, useState } from 'react';
import type { DanmakuMessage } from '@/lib/types';

interface DanmakuOverlayProps {
  messages: DanmakuMessage[];
  visible: boolean;
}

interface ActiveDanmaku {
  id: string;
  content: string;
  nickname: string;
  color: string;
  top: number;
  startTime: number;
  duration: number;
}

const TRACK_HEIGHT = 36;
const MAX_TRACKS = 8;

export function DanmakuOverlay({ messages, visible }: DanmakuOverlayProps) {
  const [activeDanmaku, setActiveDanmaku] = useState<ActiveDanmaku[]>([]);
  const trackEndTimes = useRef<number[]>(new Array(MAX_TRACKS).fill(0));
  const processedIds = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || messages.length === 0) return;

    const newDanmaku: ActiveDanmaku[] = [];

    for (const msg of messages) {
      if (msg.type !== 'chat') continue;
      if (processedIds.current.has(msg.id)) continue;
      processedIds.current.add(msg.id);

      const now = Date.now();

      // 找到可用的轨道
      let trackIndex = -1;
      for (let i = 0; i < MAX_TRACKS; i++) {
        if (trackEndTimes.current[i] <= now) {
          trackIndex = i;
          break;
        }
      }

      // 如果没有空轨道，使用最早结束的
      if (trackIndex === -1) {
        let minTime = Infinity;
        for (let i = 0; i < MAX_TRACKS; i++) {
          if (trackEndTimes.current[i] < minTime) {
            minTime = trackEndTimes.current[i];
            trackIndex = i;
          }
        }
      }

      const duration = 8000 + Math.random() * 3000;
      trackEndTimes.current[trackIndex] = now + duration * 0.6;

      newDanmaku.push({
        id: msg.id,
        content: msg.content,
        nickname: msg.nickname,
        color: msg.color || '#ffffff',
        top: trackIndex * TRACK_HEIGHT + 8,
        startTime: now,
        duration,
      });
    }

    if (newDanmaku.length > 0) {
      setActiveDanmaku((prev) => {
        const now = Date.now();
        // 清理过期的弹幕
        const active = prev.filter((d) => now - d.startTime < d.duration);
        return [...active, ...newDanmaku].slice(-50);
      });
    }
  }, [messages, visible]);

  // 定时清理过期弹幕
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveDanmaku((prev) =>
        prev.filter((d) => now - d.startTime < d.duration)
      );
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {activeDanmaku.map((d) => (
        <div
          key={d.id}
          className="danmaku-scroll absolute whitespace-nowrap"
          style={{
            top: `${d.top}px`,
            color: d.color,
            animationDuration: `${d.duration}ms`,
          }}
        >
          <span className="inline-block rounded bg-black/50 px-2 py-0.5 text-xs backdrop-blur-sm">
            <span className="text-cyan-300/80">{d.nickname}:</span>{' '}
            {d.content}
          </span>
        </div>
      ))}
    </div>
  );
}
