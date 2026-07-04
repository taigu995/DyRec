'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CircleDot,
  Square,
  Clock,
  HardDrive,
  FileVideo,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RecordingTask } from '@/lib/types';

export default function RecordingsPage() {
  const [tasks, setTasks] = useState<RecordingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStopping, setIsStopping] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/record');
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks);
      }
    } catch (err) {
      console.error('获取录制任务失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    // 每 5 秒刷新一次
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const stopRecording = async (taskId: string) => {
    setIsStopping(taskId);
    try {
      const res = await fetch(`/api/record?taskId=${taskId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
      } else {
        alert(data.error || '停止录制失败');
      }
    } catch (err) {
      console.error('停止录制失败:', err);
    } finally {
      setIsStopping(null);
    }
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

  const formatDateTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusBadge = (status: RecordingTask['status']) => {
    switch (status) {
      case 'recording':
        return (
          <Badge className="bg-red-500/10 text-red-400 border-red-800/50">
            <span className="rec-pulse mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            录制中
          </Badge>
        );
      case 'stopped':
        return (
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-500"
          >
            已停止
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-800/50">
            <AlertCircle className="mr-1 h-3 w-3" />
            错误
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-800/50">
            已暂停
          </Badge>
        );
      default:
        return null;
    }
  };

  const recordingTasks = tasks.filter((t) => t.status === 'recording');
  const completedTasks = tasks.filter(
    (t) => t.status === 'stopped' || t.status === 'error'
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">录制管理</h1>
        <p className="mt-1 text-sm text-zinc-500">
          查看和管理正在进行的录制任务与历史记录
        </p>
      </div>

      {/* Active Recordings */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
          <CircleDot className="h-4 w-4 text-red-400" />
          活跃录制
          {recordingTasks.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-red-500/10 text-red-400"
            >
              {recordingTasks.length}
            </Badge>
          )}
        </h2>

        {recordingTasks.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center py-10">
              <FileVideo className="mb-3 h-10 w-10 text-zinc-700" />
              <p className="text-sm text-zinc-500">暂无活跃录制</p>
              <p className="mt-1 text-xs text-zinc-600">
                在直播间页面选择正在直播的房间开始录制
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {recordingTasks.map((task) => (
              <Card
                key={task.id}
                className="border-zinc-800 bg-zinc-900/50 border-l-2 border-l-red-500/50"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="rec-pulse flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                      <CircleDot className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">
                          {task.roomName}
                        </span>
                        {getStatusBadge(task.status)}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(task.startedAt, null)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(task.fileSize)}
                        </span>
                        <span className="uppercase">
                          {task.format}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopRecording(task.id)}
                    disabled={isStopping === task.id}
                    className="border-red-900/50 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                  >
                    {isStopping === task.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Square className="mr-1.5 h-3 w-3" />
                    )}
                    停止
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Recordings */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
          <FileVideo className="h-4 w-4 text-zinc-400" />
          录制历史
          {completedTasks.length > 0 && (
            <Badge
              variant="secondary"
              className="bg-zinc-800 text-zinc-400"
            >
              {completedTasks.length}
            </Badge>
          )}
        </h2>

        {completedTasks.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="py-8 text-center text-sm text-zinc-600">
              暂无录制历史
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="divide-y divide-zinc-800 p-0">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileVideo className="h-4 w-4 text-zinc-600" />
                    <div>
                      <p className="text-sm text-zinc-300">
                        {task.roomName}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {formatDateTime(task.startedAt)} |{' '}
                        {formatDuration(task.startedAt, task.endedAt)} |{' '}
                        {formatFileSize(task.fileSize)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
