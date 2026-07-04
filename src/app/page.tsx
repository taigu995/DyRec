'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Radio,
  CircleDot,
  HardDrive,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { LiveRoom, RecordingTask } from '@/lib/types';

export default function DashboardPage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, tasksRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/record'),
      ]);
      const roomsData = await roomsRes.json();
      const tasksData = await tasksRes.json();
      if (roomsData.success) setRooms(roomsData.data);
      if (tasksData.success) setTasks(tasksData.data.tasks);
    } catch (err) {
      console.error('获取数据失败:', err);
    }
  }, []);

  const checkAllRooms = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/monitor');
      const data = await res.json();
      if (data.success) {
        setRooms(data.data.rooms);
        setLastCheck(Date.now());
      }
    } catch (err) {
      console.error('检测失败:', err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const liveCount = rooms.filter((r) => r.status === 'live').length;
  const recordingCount = tasks.filter((t) => t.status === 'recording').length;
  const totalRooms = rooms.length;

  const formatTime = (ts: number | null) => {
    if (!ts) return '--';
    return new Date(ts).toLocaleTimeString('zh-CN');
  };

  const formatDuration = (start: number, end: number | null) => {
    const duration = Math.floor(((end || Date.now()) - start) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">仪表盘</h1>
          <p className="mt-1 text-sm text-zinc-500">
            直播间监控概览与录制状态
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={checkAllRooms}
          disabled={isChecking}
          className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`}
          />
          {isChecking ? '检测中...' : '检测全部'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="监控直播间"
          value={totalRooms}
          icon={<Radio className="h-4 w-4 text-cyan-400" />}
          accent="cyan"
        />
        <StatCard
          title="正在直播"
          value={liveCount}
          icon={<Activity className="h-4 w-4 text-green-400" />}
          accent="green"
        />
        <StatCard
          title="录制中"
          value={recordingCount}
          icon={<CircleDot className="h-4 w-4 text-red-400" />}
          accent="red"
        />
        <StatCard
          title="磁盘占用"
          value={formatFileSize(
            tasks.reduce((sum, t) => sum + t.fileSize, 0)
          )}
          icon={<HardDrive className="h-4 w-4 text-amber-400" />}
          accent="amber"
        />
      </div>

      {/* Live Rooms */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 直播中的房间 */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Wifi className="h-4 w-4 text-green-400" />
                正在直播
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-400"
              >
                {liveCount} 个
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rooms.filter((r) => r.status === 'live').length === 0 ? (
              <div className="flex flex-col items-center py-6 text-zinc-600">
                <WifiOff className="mb-2 h-8 w-8" />
                <p className="text-sm">暂无直播间在直播</p>
              </div>
            ) : (
              rooms
                .filter((r) => r.status === 'live')
                .map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-800/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="live-breathe h-2 w-2 rounded-full bg-green-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {room.nickname || room.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {room.title || `房间号: ${room.roomId}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-400">
                        {room.viewerCount > 0
                          ? `${(room.viewerCount / 10000).toFixed(1)}万人`
                          : ''}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {formatTime(room.lastCheckedAt)}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        {/* 活跃录制 */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <CircleDot className="h-4 w-4 text-red-400" />
                录制任务
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-red-500/10 text-red-400"
              >
                {recordingCount} 个
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.filter((t) => t.status === 'recording').length === 0 ? (
              <div className="flex flex-col items-center py-6 text-zinc-600">
                <CircleDot className="mb-2 h-8 w-8" />
                <p className="text-sm">暂无录制任务</p>
              </div>
            ) : (
              tasks
                .filter((t) => t.status === 'recording')
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-800/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="rec-pulse h-2 w-2 rounded-full bg-red-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {task.roomName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {task.format.toUpperCase()} | {task.quality}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-zinc-300">
                        {formatDuration(task.startedAt, null)}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {formatFileSize(task.fileSize)}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-300">
            最近动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.slice(0, 5).map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-md px-3 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      room.status === 'live'
                        ? 'bg-green-500'
                        : 'bg-zinc-600'
                    }`}
                  />
                  <span className="text-sm text-zinc-300">
                    {room.nickname || room.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      room.status === 'live'
                        ? 'border-green-800 text-green-400'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {room.status === 'live' ? '直播中' : '未开播'}
                  </Badge>
                  <span className="text-[11px] text-zinc-600">
                    {formatTime(room.lastCheckedAt)}
                  </span>
                </div>
              </div>
            ))}
            {rooms.length === 0 && (
              <p className="py-4 text-center text-sm text-zinc-600">
                暂无监控的直播间，请先添加直播间
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last check info */}
      {lastCheck && (
        <p className="text-center text-xs text-zinc-600">
          上次检测: {new Date(lastCheck).toLocaleString('zh-CN')}
        </p>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accent: string;
}) {
  const accentColors: Record<string, string> = {
    cyan: 'border-cyan-900/50 bg-cyan-500/5',
    green: 'border-green-900/50 bg-green-500/5',
    red: 'border-red-900/50 bg-red-500/5',
    amber: 'border-amber-900/50 bg-amber-500/5',
  };

  return (
    <Card
      className={`border ${accentColors[accent] || accentColors.cyan}`}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/80">
          {icon}
        </div>
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-xl font-bold text-zinc-100">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
