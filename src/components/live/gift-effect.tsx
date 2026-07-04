'use client';

import { useEffect, useState, useRef } from 'react';
import type { GiftMessage as GiftMessageType } from '@/lib/types';
import { Gift } from 'lucide-react';

interface GiftEffectProps {
  messages: GiftMessageType[];
  visible: boolean;
}

interface ActiveGift {
  id: string;
  nickname: string;
  giftName: string;
  count: number;
  diamondCount: number;
  startTime: number;
  combo: boolean;
}

// 礼物特效颜色映射 (根据价值)
function getGiftGradient(diamondCount: number): string {
  if (diamondCount >= 1000) return 'from-amber-500/90 to-red-500/90';
  if (diamondCount >= 100) return 'from-purple-500/90 to-pink-500/90';
  if (diamondCount >= 10) return 'from-cyan-500/90 to-blue-500/90';
  return 'from-green-500/90 to-emerald-500/90';
}

function getGiftSize(diamondCount: number): string {
  if (diamondCount >= 1000) return 'scale-110';
  if (diamondCount >= 100) return 'scale-105';
  return '';
}

export function GiftEffect({ messages, visible }: GiftEffectProps) {
  const [activeGifts, setActiveGifts] = useState<ActiveGift[]>([]);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) return;

    const newGifts: ActiveGift[] = [];
    for (const msg of messages) {
      if (msg.type !== 'gift') continue;
      if (processedIdsRef.current.has(msg.id)) continue;
      processedIdsRef.current.add(msg.id);

      newGifts.push({
        id: msg.id,
        nickname: msg.nickname,
        giftName: msg.giftName,
        count: msg.count,
        diamondCount: msg.diamondCount,
        startTime: Date.now(),
        combo: msg.combo,
      });
    }

    if (newGifts.length > 0) {
      setActiveGifts((prev) => [...prev, ...newGifts].slice(-5));
    }
  }, [messages, visible]);

  // 自动清理
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveGifts((prev) =>
        prev.filter((g) => now - g.startTime < 5000)
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 礼物通知 - 从右侧滑入 */}
      <div className="absolute right-2 top-1/4 flex flex-col gap-2">
        {activeGifts.map((gift) => (
          <div
            key={gift.id}
            className={`gift-slide flex items-center gap-2 rounded-lg bg-gradient-to-r ${getGiftGradient(gift.diamondCount)} px-3 py-2 shadow-lg ${getGiftSize(gift.diamondCount)}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">
                {gift.nickname}
              </p>
              <p className="text-[10px] text-white/80">
                送出 {gift.giftName}
                {gift.count > 1 && (
                  <span className="ml-1 font-bold text-yellow-200">
                    x{gift.count}
                  </span>
                )}
              </p>
            </div>
            {gift.diamondCount > 0 && (
              <div className="ml-1 text-[10px] font-bold text-yellow-200">
                {gift.diamondCount}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 大礼物全屏特效 */}
      {activeGifts
        .filter((g) => g.diamondCount >= 1000)
        .map((gift) => (
          <div
            key={`effect-${gift.id}`}
            className="gift-flash absolute inset-0 flex items-center justify-center"
          >
            <div className="relative">
              <div className="absolute -inset-8 animate-ping rounded-full bg-amber-400/20" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 shadow-2xl">
                <Gift className="h-10 w-10 text-white" />
              </div>
              <p className="mt-2 text-center text-sm font-bold text-amber-300 drop-shadow-lg">
                {gift.giftName} x{gift.count}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
