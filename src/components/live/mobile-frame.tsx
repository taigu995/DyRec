'use client';

import { useState, useRef, useEffect } from 'react';
import { Smartphone, Wifi, WifiOff, Battery, Signal } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  nickname?: string;
  viewerCount?: number;
  isLive?: boolean;
}

export function MobileFrame({
  children,
  nickname = '',
  viewerCount = 0,
  isLive = false,
}: MobileFrameProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto" style={{ width: '375px', maxWidth: '100%' }}>
      {/* 手机外框 */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-700 bg-black shadow-2xl shadow-black/50">
        {/* 状态栏 */}
        <div className="relative z-50 flex items-center justify-between bg-black/40 px-6 py-1.5 backdrop-blur-sm">
          <span className="text-[11px] font-medium text-white">{time}</span>
          {/* 刘海 */}
          <div className="absolute left-1/2 top-0 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-black" />
          <div className="flex items-center gap-1">
            <Signal className="h-3 w-3 text-white" />
            <Wifi className="h-3 w-3 text-white" />
            <Battery className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        {/* 直播内容区域 (9:16) */}
        <div
          className="relative bg-zinc-900"
          style={{ aspectRatio: '9/16' }}
        >
          {children}

          {/* 顶部主播信息 */}
          <div className="absolute left-0 right-0 top-0 z-40 bg-gradient-to-b from-black/60 to-transparent p-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-[10px] font-bold text-white">
                  {nickname ? nickname[0] : 'D'}
                </div>
                <div>
                  <p className="text-xs font-medium text-white drop-shadow">
                    {nickname || '直播间'}
                  </p>
                  {viewerCount > 0 && (
                    <p className="text-[10px] text-white/70">
                      {viewerCount.toLocaleString()} 观看
                    </p>
                  )}
                </div>
              </div>
              {isLive && (
                <div className="flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-0.5">
                  <span className="live-breathe h-1.5 w-1.5 rounded-full bg-white" />
                  <span className="text-[10px] font-medium text-white">
                    直播中
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部手势条 */}
        <div className="flex justify-center bg-black pb-2 pt-1.5">
          <div className="h-1 w-28 rounded-full bg-zinc-600" />
        </div>
      </div>

      {/* 手机品牌标识 */}
      <div className="mt-2 text-center">
        <Smartphone className="mx-auto h-3 w-3 text-zinc-600" />
      </div>
    </div>
  );
}
