'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import type { DanmakuMessage, GiftMessage } from '@/lib/types';

interface ActiveDanmaku {
  id: string;
  content: string;
  nickname: string;
  color: string;
  top: number;
  startTime: number;
  duration: number;
}

interface ActiveGift {
  id: string;
  nickname: string;
  giftName: string;
  count: number;
  diamondCount: number;
  startTime: number;
}

const TRACK_HEIGHT = 36;
const MAX_TRACKS = 8;

function getGiftColor(diamondCount: number): string {
  if (diamondCount >= 1000) return '#f59e0b';
  if (diamondCount >= 100) return '#a855f7';
  if (diamondCount >= 10) return '#06b6d4';
  return '#22c55e';
}

export function useCanvasRecorder(width = 720, height = 1280, fps = 30) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const trackEndTimesRef = useRef<number[]>(new Array(MAX_TRACKS).fill(0));
  const activeDanmakuRef = useRef<ActiveDanmaku[]>([]);
  const activeGiftsRef = useRef<ActiveGift[]>([]);
  const processedDanmakuIds = useRef<Set<string>>(new Set());
  const processedGiftIds = useRef<Set<string>>(new Set());
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  // 设置视频元素引用
  const setVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  // 处理新弹幕
  const processDanmaku = useCallback((messages: DanmakuMessage[]) => {
    const now = Date.now();
    for (const msg of messages) {
      if (msg.type !== 'chat') continue;
      if (processedDanmakuIds.current.has(msg.id)) continue;
      processedDanmakuIds.current.add(msg.id);

      let trackIndex = -1;
      for (let i = 0; i < MAX_TRACKS; i++) {
        if (trackEndTimesRef.current[i] <= now) {
          trackIndex = i;
          break;
        }
      }
      if (trackIndex === -1) {
        let minTime = Infinity;
        for (let i = 0; i < MAX_TRACKS; i++) {
          if (trackEndTimesRef.current[i] < minTime) {
            minTime = trackEndTimesRef.current[i];
            trackIndex = i;
          }
        }
      }

      const dur = 8000 + Math.random() * 3000;
      trackEndTimesRef.current[trackIndex] = now + dur * 0.6;

      activeDanmakuRef.current.push({
        id: msg.id,
        content: msg.content,
        nickname: msg.nickname,
        color: msg.color || '#ffffff',
        top: trackIndex * TRACK_HEIGHT + 20,
        startTime: now,
        duration: dur,
      });
    }

    activeDanmakuRef.current = activeDanmakuRef.current.filter(
      (d) => now - d.startTime < d.duration
    );
  }, []);

  // 处理新礼物
  const processGifts = useCallback((messages: GiftMessage[]) => {
    const now = Date.now();
    for (const msg of messages) {
      if (msg.type !== 'gift') continue;
      if (processedGiftIds.current.has(msg.id)) continue;
      processedGiftIds.current.add(msg.id);

      activeGiftsRef.current.push({
        id: msg.id,
        nickname: msg.nickname,
        giftName: msg.giftName,
        count: msg.count,
        diamondCount: msg.diamondCount,
        startTime: now,
      });
    }

    activeGiftsRef.current = activeGiftsRef.current.filter(
      (g) => now - g.startTime < 5000
    );
  }, []);

  // 绘制弹幕
  const drawDanmaku = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    now: number
  ) => {
    for (const d of activeDanmakuRef.current) {
      const progress = (now - d.startTime) / d.duration;
      if (progress > 1) continue;

      ctx.font =
        'bold 14px "PingFang SC", "Microsoft YaHei", sans-serif';
      const nickW = ctx.measureText(`${d.nickname}: `).width;
      const contentW = ctx.measureText(d.content).width;
      const textWidth = nickW + contentW;
      const startX = canvasWidth + 20;
      const endX = -textWidth - 20;
      const x = startX + (endX - startX) * progress;
      const y = d.top;

      // 背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      const padding = 6;
      const bgWidth = textWidth + padding * 2;
      ctx.beginPath();
      ctx.roundRect(x - padding, y - 14, bgWidth, 28, 14);
      ctx.fill();

      // 昵称
      ctx.fillStyle = '#06b6d4';
      ctx.fillText(`${d.nickname}: `, x, y + 5);

      // 内容
      ctx.fillStyle = d.color;
      ctx.fillText(d.content, x + nickW, y + 5);
    }
  };

  // 绘制礼物
  const drawGifts = (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    now: number
  ) => {
    let giftIndex = 0;
    for (const gift of activeGiftsRef.current) {
      const elapsed = now - gift.startTime;
      if (elapsed > 5000) continue;

      let opacity = 1;
      let xOffset = 0;
      if (elapsed < 300) {
        xOffset = (1 - elapsed / 300) * 100;
        opacity = elapsed / 300;
      } else if (elapsed > 4000) {
        opacity = 1 - (elapsed - 4000) / 1000;
      }

      const x = canvasWidth - 200 - xOffset;
      const y = 200 + giftIndex * 60;

      ctx.save();
      ctx.globalAlpha = opacity;

      const gradient = ctx.createLinearGradient(x, y, x + 180, y + 44);
      const color = getGiftColor(gift.diamondCount);
      gradient.addColorStop(0, color + 'e6');
      gradient.addColorStop(1, color + '99');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, 180, 44, 8);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(x + 22, y + 22, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('\u{1F381}', x + 14, y + 28);

      ctx.font =
        'bold 12px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(gift.nickname, x + 46, y + 18);

      ctx.font =
        '11px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const giftText = `送出 ${gift.giftName}`;
      ctx.fillText(giftText, x + 46, y + 34);

      if (gift.count > 1) {
        const textW = ctx.measureText(giftText).width;
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(` x${gift.count}`, x + 46 + textW, y + 34);
      }

      ctx.restore();
      giftIndex++;
    }
  };

  // 渲染循环 (使用 ref 避免 useCallback 循环引用)
  const renderLoopRef = useRef<(() => void) | undefined>(undefined);

  // 在 effect 中设置渲染循环函数
  useEffect(() => {
    renderLoopRef.current = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = Date.now();

      // 清空
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 绘制视频
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = width / height;
        let drawW: number, drawH: number, drawX: number, drawY: number;

        if (videoAspect > canvasAspect) {
          drawW = width;
          drawH = width / videoAspect;
          drawX = 0;
          drawY = (height - drawH) / 2;
        } else {
          drawH = height;
          drawW = height * videoAspect;
          drawX = (width - drawW) / 2;
          drawY = 0;
        }
        ctx.drawImage(video, drawX, drawY, drawW, drawH);
      }

      // 绘制弹幕 + 礼物
      drawDanmaku(ctx, width, now);
      drawGifts(ctx, width, now);

      animFrameRef.current = requestAnimationFrame(() => {
        renderLoopRef.current?.();
      });
    };
  }, [width, height]);

  // 开始录制
  const startRecording = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    activeDanmakuRef.current = [];
    activeGiftsRef.current = [];
    processedDanmakuIds.current.clear();
    processedGiftIds.current.clear();
    trackEndTimesRef.current = new Array(MAX_TRACKS).fill(0);
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    // 启动渲染
    renderLoopRef.current?.();

    // MediaRecorder
    const stream = canvas.captureStream(fps);

    const mimeType = MediaRecorder.isTypeSupported(
      'video/webm;codecs=vp9,opus'
    )
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm;codecs=vp8,opus';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      a.href = url;
      a.download = `dyrec_${timestamp}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);

    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [width, height, fps]);

  // 停止录制
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    setIsRecording(false);
    setDuration(0);
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    processDanmaku,
    processGifts,
    setVideoElement,
  };
}
