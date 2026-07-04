'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Radio,
  RefreshCw,
  Play,
  Wifi,
  WifiOff,
  Smartphone,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LiveRoom } from '@/lib/types';

export default function LivePreviewListPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (err) {
      console.error('获取直播间列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const checkAll = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      if (data.success) {
        setRooms(data.data.rooms);
      }
    } catch (err) {
      console.error('检测失败:', err);
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  const liveRooms = rooms.filter((r) => r.status === 'live');
  const offlineRooms = rooms.filter((r) => r.status !== 'live');

  return (
    <div className="flex h-full flex-col">
      {/* 顶部 */}
      <header className="flex h-12 items-center justify-between border-b border-zinc-800 px-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-cyan-400" />
          <h1 className="text-sm font-semibold text-zinc-100">
            直播预览
          </h1>
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-500 text-[10px]"
          >
            手机端视角
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAll}
          disabled={isChecking}
          className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`}
          />
          刷新状态
        </Button>
      </header>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {rooms.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Smartphone className="mb-3 h-12 w-12 text-zinc-700" />
            <p className="text-sm text-zinc-500">暂无直播间</p>
            <p className="mt-1 text-xs text-zinc-600">
              请先在「直播间」页面添加直播间
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-zinc-700 text-zinc-400"
              onClick={() => router.push('/rooms')}
            >
              添加直播间
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 直播中 */}
            {liveRooms.length > 0 && (
              <div>
                <h2 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <span className="live-breathe h-1.5 w-1.5 rounded-full bg-green-500" />
                  直播中 ({liveRooms.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {liveRooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            )}

            {/* 未开播 */}
            {offlineRooms.length > 0 && (
              <div>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  未开播 ({offlineRooms.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {offlineRooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room }: { room: LiveRoom }) {
  const isLive = room.status === 'live';

  return (
    <Card className="group overflow-hidden border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700">
      <CardContent className="p-0">
        {/* 预览区域 */}
        <div className="relative aspect-[9/16] max-h-48 overflow-hidden bg-zinc-900">
          {room.cover?.url_list?.[0] ? (
            <img
              src={room.cover.url_list[0]}
              alt={room.title}
              className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Radio className="h-8 w-8 text-zinc-700" />
            </div>
          )}

          {/* 状态标签 */}
          <div className="absolute left-2 top-2">
            {isLive ? (
              <Badge className="bg-green-500/80 text-white border-0 text-[10px]">
                <span className="live-breathe mr-1 h-1.5 w-1.5 rounded-full bg-white" />
                直播中
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-zinc-600 bg-black/50 text-zinc-400 text-[10px]"
              >
                未开播
              </Badge>
            )}
          </div>

          {/* 预览按钮 */}
          {isLive && (
            <Link
              href={`/live/${room.roomId}`}
              className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/80 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Eye className="h-5 w-5" />
              </div>
            </Link>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-[9px] font-bold text-white">
              {(room.nickname || room.name || '?')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-zinc-200">
                {room.nickname || room.name || `直播间 ${room.roomId}`}
              </p>
              {room.title && (
                <p className="truncate text-[10px] text-zinc-500">
                  {room.title}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              {room.viewerCount > 0
                ? `${room.viewerCount.toLocaleString()} 观看`
                : ''}
            </span>
            <Link href={`/live/${room.roomId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 px-2"
              >
                <Smartphone className="mr-1 h-3 w-3" />
                预览
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
