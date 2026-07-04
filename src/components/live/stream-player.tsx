'use client';

import { useRef, useEffect, useState } from 'react';
import { Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';

interface StreamPlayerProps {
  streamUrl: string | null;
  isLive: boolean;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export function StreamPlayer({
  streamUrl,
  isLive,
  muted = true,
  onMutedChange,
  videoRef: externalVideoRef,
}: StreamPlayerProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (streamUrl && isLive) {
      video.src = streamUrl;
      video.play().catch(() => {
        // 自动播放可能被阻止
      });
      setHasError(false);
    } else {
      video.src = '';
    }
  }, [streamUrl, isLive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onMutedChange?.(next);
  };

  const handleVideoError = () => {
    setHasError(true);
  };

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        muted={isMuted}
        onError={handleVideoError}
        onEnded={() => setHasError(true)}
      />

      {/* 无流或离线占位 */}
      {(!streamUrl || !isLive) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-black">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50">
            <WifiOff className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">
            {isLive ? '正在获取直播流...' : '主播未开播'}
          </p>
          {isLive && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="live-breathe h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span className="text-xs text-zinc-600">等待连接</span>
            </div>
          )}
        </div>
      )}

      {/* 流加载错误 */}
      {hasError && isLive && streamUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <Wifi className="mb-2 h-8 w-8 text-amber-500" />
          <p className="text-sm text-amber-400">直播流连接失败</p>
          <p className="mt-1 text-xs text-zinc-500">请检查网络或流地址</p>
        </div>
      )}

      {/* 音量控制 */}
      {isLive && streamUrl && (
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
