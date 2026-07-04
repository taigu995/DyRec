'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CircleDot,
  MessageSquare,
  Gift,
  Users,
  Radio,
  Wifi,
  WifiOff,
  Play,
  Square,
  Settings2,
  Monitor,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MobileFrame } from '@/components/live/mobile-frame';
import { StreamPlayer } from '@/components/live/stream-player';
import { DanmakuOverlay } from '@/components/live/danmaku-overlay';
import { GiftEffect } from '@/components/live/gift-effect';
import { useDanmaku } from '@/components/live/use-danmaku';
import { useCanvasRecorder } from '@/components/live/use-canvas-recorder';
import type {
  LiveRoom,
  RecordingTask,
  DanmakuMessage,
  GiftMessage,
} from '@/lib/types';

export default function LivePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showDanmaku, setShowDanmaku] = useState(true);
  const [showGifts, setShowGifts] = useState(true);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [isCanvasRecording, setIsCanvasRecording] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 弹幕 hook
  const { messages, status: danmakuStatus, stats } = useDanmaku({
    roomId,
    enabled: danmakuEnabled,
  });

  // Canvas 录制 hook (录制包含弹幕+礼物的画面)
  const canvasRecorder = useCanvasRecorder(720, 1280, 30);

  // 同步视频元素到 Canvas 录制器
  useEffect(() => {
    canvasRecorder.setVideoElement(videoRef.current);
  }, [canvasRecorder]);

  // 将弹幕和礼物数据传递给 Canvas 录制器
  useEffect(() => {
    if (isCanvasRecording) {
      canvasRecorder.processDanmaku(messages as DanmakuMessage[]);
      canvasRecorder.processGifts(messages as GiftMessage[]);
    }
  }, [messages, isCanvasRecording, canvasRecorder]);

  // 获取房间信息
  const fetchRoomInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success) {
        const found = data.data.find(
          (r: LiveRoom) => r.roomId === roomId
        );
        if (found) {
          setRoom(found);
          // 如果直播中，获取流地址
          if (found.status === 'live') {
            const monitorRes = await fetch('/api/monitor');
            const monitorData = await monitorRes.json();
            if (monitorData.success) {
              const roomStatus = monitorData.data.rooms?.find(
                (r: LiveRoom & { streamUrl?: string }) =>
                  r.roomId === roomId
              );
              if (roomStatus?.streamUrl) {
                setStreamUrl(roomStatus.streamUrl);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('获取房间信息失败:', err);
    }
  }, [roomId]);

  // 检查录制状态
  const checkRecordingStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/record');
      const data = await res.json();
      if (data.success) {
        const task = data.data.tasks?.find(
          (t: RecordingTask) =>
            t.roomId === roomId && t.status === 'recording'
        );
        setIsRecording(!!task);
      }
    } catch {
      // ignore
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomInfo();
    checkRecordingStatus();
    const timer = setInterval(() => {
      fetchRoomInfo();
      checkRecordingStatus();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchRoomInfo, checkRecordingStatus]);

  // 自动滚动弹幕列表
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRecording(true);
      } else {
        alert(data.error || '录制启动失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  const stopRecording = async () => {
    try {
      await fetch('/api/record', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      setIsRecording(false);
    } catch {
      // ignore
    }
  };

  // Canvas 录制 (包含弹幕+礼物)
  const startCanvasRecording = () => {
    canvasRecorder.startRecording();
    setIsCanvasRecording(true);
  };

  const stopCanvasRecording = () => {
    canvasRecorder.stopRecording();
    setIsCanvasRecording(false);
  };

  const chatMessages = messages.filter(
    (m) => m.type === 'chat'
  ) as DanmakuMessage[];
  const giftMessages = messages.filter(
    (m) => m.type === 'gift'
  ) as GiftMessage[];

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-zinc-500';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中';
      case 'error':
        return '连接错误';
      default:
        return '未连接';
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* 顶部导航 */}
      <header className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/rooms')}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Button>
          <div className="h-4 w-px bg-zinc-800" />
          <Radio className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-200">
            {room?.nickname || room?.name || `直播间 ${roomId}`}
          </span>
          {room?.status === 'live' && (
            <Badge className="bg-green-500/10 text-green-400 border-green-800/50">
              <span className="live-breathe mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              直播中
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Wifi
              className={`h-3.5 w-3.5 ${getStatusColor(danmakuStatus)}`}
            />
            <span
              className={`text-xs ${getStatusColor(danmakuStatus)}`}
            >
              {getStatusLabel(danmakuStatus)}
            </span>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧: 手机预览 */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-950/50 p-6">
          <MobileFrame
            nickname={room?.nickname || room?.name}
            viewerCount={room?.viewerCount || 0}
            isLive={room?.status === 'live'}
          >
            {/* 直播流播放器 */}
            <StreamPlayer
              streamUrl={streamUrl}
              isLive={room?.status === 'live'}
              videoRef={videoRef}
            />

            {/* 弹幕叠加层 */}
            <DanmakuOverlay
              messages={chatMessages}
              visible={showDanmaku}
            />

            {/* 礼物特效层 */}
            <GiftEffect
              messages={giftMessages}
              visible={showGifts}
            />
          </MobileFrame>
        </div>

        {/* 右侧: 控制面板 */}
        <div className="flex w-80 flex-col border-l border-zinc-800 bg-[#111113]">
          {/* 录制控制 */}
          <div className="border-b border-zinc-800 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              录制控制
            </h3>

            {/* Canvas 录制 (含弹幕+礼物) */}
            <div className="mb-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-zinc-300">
                  合成录制
                </span>
                <Badge className="ml-auto bg-cyan-500/10 text-cyan-400 border-cyan-800/50 text-[10px]">
                  弹幕+礼物
                </Badge>
              </div>
              {isCanvasRecording ? (
                <div>
                  <Button
                    onClick={stopCanvasRecording}
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    停止合成录制
                  </Button>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="rec-pulse h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-xs text-red-400">
                      录制中 {formatDuration(canvasRecorder.duration)}
                    </span>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={startCanvasRecording}
                  size="sm"
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  disabled={room?.status !== 'live'}
                >
                  <Video className="mr-1.5 h-3.5 w-3.5" />
                  开始合成录制
                </Button>
              )}
            </div>

            <div className="mb-2 h-px bg-zinc-800" />

            {/* FFmpeg 录制 (纯流) */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-medium text-zinc-300">
                  原始流录制
                </span>
                <Badge className="ml-auto bg-zinc-700/50 text-zinc-400 border-zinc-600/50 text-[10px]">
                  仅画面
                </Badge>
              </div>
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  停止录制
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  size="sm"
                  variant="outline"
                  className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  disabled={room?.status !== 'live'}
                >
                  <CircleDot className="mr-1.5 h-3.5 w-3.5" />
                  开始原始录制
                </Button>
              )}
              {isRecording && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rec-pulse h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs text-red-400">正在录制...</span>
                </div>
              )}
            </div>
          </div>

          {/* 显示设置 */}
          <div className="border-b border-zinc-800 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              显示设置
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-sm text-zinc-300">弹幕滚动</span>
                </div>
                <Switch
                  checked={showDanmaku}
                  onCheckedChange={setShowDanmaku}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm text-zinc-300">礼物特效</span>
                </div>
                <Switch
                  checked={showGifts}
                  onCheckedChange={setShowGifts}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-sm text-zinc-300">弹幕连接</span>
                </div>
                <Switch
                  checked={danmakuEnabled}
                  onCheckedChange={setDanmakuEnabled}
                />
              </div>
            </div>
          </div>

          {/* 数据统计 */}
          <div className="border-b border-zinc-800 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              实时数据
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-zinc-800/40 border-zinc-700/50">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-cyan-400" />
                    <span className="text-[10px] text-zinc-500">弹幕</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-200">
                    {stats.chatCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/40 border-zinc-700/50">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Gift className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] text-zinc-500">礼物</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-200">
                    {stats.giftCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/40 border-zinc-700/50">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-green-400" />
                    <span className="text-[10px] text-zinc-500">进场</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-200">
                    {stats.enterCount}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-800/40 border-zinc-700/50">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Monitor className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] text-zinc-500">点赞</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-200">
                    {stats.likeCount}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 弹幕列表 */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                弹幕列表
              </h3>
              <span className="text-[10px] text-zinc-600">
                {chatMessages.length} 条
              </span>
            </div>
            <div
              ref={chatListRef}
              className="flex-1 overflow-y-auto p-2"
            >
              {chatMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-zinc-600">
                    {danmakuEnabled
                      ? '等待弹幕...'
                      : '弹幕连接已关闭'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chatMessages.slice(-50).map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded px-2 py-1 text-xs transition-colors hover:bg-zinc-800/40"
                    >
                      <span className="text-cyan-400/80">
                        {msg.nickname}
                      </span>
                      <span className="text-zinc-500">: </span>
                      <span className="text-zinc-300">
                        {msg.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
