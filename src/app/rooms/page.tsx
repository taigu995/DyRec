'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  Radio,
  CircleDot,
  Circle,
  Settings2,
  Play,
  Loader2,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LiveRoom, RecordingMode, VideoFormat } from '@/lib/types';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newQuality, setNewQuality] = useState<string>('origin');
  const [newRecordMode, setNewRecordMode] = useState<RecordingMode>('original');
  const [newCompositeAutoConvert, setNewCompositeAutoConvert] = useState(false);
  const [newOriginalAutoConvert, setNewOriginalAutoConvert] = useState(false);
  const [newConvertFormat, setNewConvertFormat] = useState<VideoFormat>('mp4');
  const [newDeleteSource, setNewDeleteSource] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<LiveRoom | null>(null);
  const [editRecordMode, setEditRecordMode] = useState<RecordingMode>('original');
  const [editQuality, setEditQuality] = useState<string>('origin');
  const [editAutoRecord, setEditAutoRecord] = useState(false);
  const [editCompositeAutoConvert, setEditCompositeAutoConvert] = useState(false);
  const [editOriginalAutoConvert, setEditOriginalAutoConvert] = useState(false);
  const [editConvertFormat, setEditConvertFormat] = useState<VideoFormat>('mp4');
  const [editDeleteSource, setEditDeleteSource] = useState(true);

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

  const addRoom = async () => {
    if (!newUrl.trim()) {
      setError('请输入直播间 URL 或房间号');
      return;
    }
    setIsAdding(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          quality: newQuality,
          recordMode: newRecordMode,
          convertSettings: {
            compositeAutoConvert: newCompositeAutoConvert,
            originalAutoConvert: newOriginalAutoConvert,
            convertFormat: newConvertFormat,
            deleteSourceAfterConvert: newDeleteSource,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
        setDialogOpen(false);
        setNewUrl('');
        setNewQuality('origin');
        setNewRecordMode('original');
        setNewCompositeAutoConvert(false);
        setNewOriginalAutoConvert(false);
        setNewConvertFormat('mp4');
        setNewDeleteSource(true);
      } else {
        setError(data.error || '添加失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsAdding(false);
    }
  };

  const removeRoom = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms?roomId=${roomId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const toggleAutoRecord = async (room: LiveRoom) => {
    try {
      await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: room.roomId,
          updates: { autoRecord: !room.autoRecord },
        }),
      });
      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === room.roomId
            ? { ...r, autoRecord: !r.autoRecord }
            : r
        )
      );
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  const checkAllRooms = async () => {
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

  const startRecording = async (roomId: string) => {
    try {
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || '录制启动失败');
      }
    } catch (err) {
      console.error('录制失败:', err);
    }
  };

  const openEditDialog = (room: LiveRoom) => {
    setEditRoom(room);
    setEditRecordMode(room.recordMode || 'original');
    setEditQuality(room.quality || 'origin');
    setEditAutoRecord(room.autoRecord || false);
    setEditCompositeAutoConvert(room.convertSettings?.compositeAutoConvert || false);
    setEditOriginalAutoConvert(room.convertSettings?.originalAutoConvert || false);
    setEditConvertFormat(room.convertSettings?.convertFormat || 'mp4');
    setEditDeleteSource(room.convertSettings?.deleteSourceAfterConvert ?? true);
    setEditDialogOpen(true);
  };

  const saveRoomSettings = async () => {
    if (!editRoom) return;
    try {
      const res = await fetch('/api/rooms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: editRoom.roomId,
          updates: {
            recordMode: editRecordMode,
            quality: editQuality,
            autoRecord: editAutoRecord,
            convertSettings: {
              compositeAutoConvert: editCompositeAutoConvert,
              originalAutoConvert: editOriginalAutoConvert,
              convertFormat: editConvertFormat,
              deleteSourceAfterConvert: editDeleteSource,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
        setEditDialogOpen(false);
        setEditRoom(null);
      } else {
        alert(data.error || '保存失败');
      }
    } catch {
      alert('网络错误，请重试');
    }
  };

  const getStatusBadge = (status: LiveRoom['status']) => {
    switch (status) {
      case 'live':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-800/50">
            <span className="live-breathe mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            直播中
          </Badge>
        );
      case 'offline':
        return (
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-500"
          >
            未开播
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-zinc-700 text-zinc-600"
          >
            未知
          </Badge>
        );
    }
  };

  const getRecordModeBadge = (mode?: RecordingMode) => {
    switch (mode) {
      case 'composite':
        return (
          <Badge
            variant="outline"
            className="border-purple-800/50 text-[10px] text-purple-400"
          >
            合成录制
          </Badge>
        );
      case 'both':
        return (
          <Badge
            variant="outline"
            className="border-amber-800/50 text-[10px] text-amber-400"
          >
            同步录制
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-zinc-700 text-[10px] text-zinc-500"
          >
            原始流
          </Badge>
        );
    }
  };

  const getQualityLabel = (quality: string) => {
    const labels: Record<string, string> = {
      origin: '原画',
      uhd: '超清',
      hd: '高清',
      sd: '标清',
    };
    return labels[quality] || quality;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">直播间管理</h1>
          <p className="mt-1 text-sm text-zinc-500">
            管理要监控的抖音直播间，支持自动检测开播状态
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkAllRooms}
            disabled={isChecking}
            className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`}
            />
            检测状态
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                添加直播间
              </Button>
            </DialogTrigger>
            <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">
                  添加直播间
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">
                    直播间 URL 或房间号
                  </label>
                  <Input
                    placeholder="https://live.douyin.com/xxx 或 纯数字房间号"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="border-zinc-700 bg-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                    onKeyDown={(e) => e.key === 'Enter' && addRoom()}
                  />
                  <p className="text-xs text-zinc-600">
                    支持标准链接、短链接、纯数字房间号
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">画质</label>
                  <Select
                    value={newQuality}
                    onValueChange={setNewQuality}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      <SelectItem value="origin">原画</SelectItem>
                      <SelectItem value="uhd">超清</SelectItem>
                      <SelectItem value="hd">高清</SelectItem>
                      <SelectItem value="sd">标清</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">录制模式</label>
                  <Select
                    value={newRecordMode}
                    onValueChange={(v) => setNewRecordMode(v as RecordingMode)}
                  >
                    <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-zinc-700 bg-zinc-900">
                      <SelectItem value="original">原始流录制</SelectItem>
                      <SelectItem value="composite">合成录制 (画面+弹幕+礼物)</SelectItem>
                      <SelectItem value="both">两者同步录制</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-zinc-600">
                    {newRecordMode === 'original' && '直接录制直播流，画质最高，不含弹幕礼物'}
                    {newRecordMode === 'composite' && '录制画面+弹幕滚动+礼物特效，如不满足条件自动切换为原始流录制'}
                    {newRecordMode === 'both' && '同时录制原始流和合成视频，生成两个文件'}
                  </p>
                </div>
                <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
                  <p className="text-sm font-medium text-zinc-300">录制结束自动转换</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={newCompositeAutoConvert}
                        onChange={(e) => setNewCompositeAutoConvert(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800"
                      />
                      合成录制自动转换
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-400">
                      <input
                        type="checkbox"
                        checked={newOriginalAutoConvert}
                        onChange={(e) => setNewOriginalAutoConvert(e.target.checked)}
                        className="rounded border-zinc-700 bg-zinc-800"
                      />
                      原始流录制自动转换
                    </label>
                  </div>
                  {(newCompositeAutoConvert || newOriginalAutoConvert) && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-500">转换格式</label>
                        <Select
                          value={newConvertFormat}
                          onValueChange={(v) => setNewConvertFormat(v as VideoFormat)}
                        >
                          <SelectTrigger className="h-8 border-zinc-700 bg-zinc-800 text-zinc-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-zinc-700 bg-zinc-900">
                            <SelectItem value="mp4">MP4 (推荐)</SelectItem>
                            <SelectItem value="mkv">MKV</SelectItem>
                            <SelectItem value="flv">FLV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-zinc-400">
                        <input
                          type="checkbox"
                          checked={newDeleteSource}
                          onChange={(e) => setNewDeleteSource(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-800"
                        />
                        转换后删除源文件
                      </label>
                    </>
                  )}
                </div>
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                <Button
                  onClick={addRoom}
                  disabled={isAdding}
                  className="w-full bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    '添加'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Room List */}
      {rooms.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="flex flex-col items-center py-16">
            <Radio className="mb-3 h-12 w-12 text-zinc-700" />
            <p className="text-lg font-medium text-zinc-400">
              暂无监控的直播间
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              点击「添加直播间」开始监控抖音直播间
            </p>
            <Button
              variant="outline"
              className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              添加直播间
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="border-zinc-800 bg-zinc-900/50 transition-colors hover:border-zinc-700"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
                    {room.avatar ? (
                      <img
                        src={room.avatar}
                        alt={room.nickname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Radio className="h-5 w-5 text-zinc-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-zinc-100">
                        {room.nickname || room.name || `直播间 ${room.roomId}`}
                      </span>
                      {getStatusBadge(room.status)}
                      {getRecordModeBadge(room.recordMode)}
                      {room.autoRecord && (
                        <Badge
                          variant="outline"
                          className="border-cyan-800/50 text-[10px] text-cyan-400"
                        >
                          自动录制
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span className="font-mono">房间号: {room.roomId}</span>
                      {room.title && (
                        <span className="truncate max-w-48">
                          {room.title}
                        </span>
                      )}
                      {room.viewerCount > 0 && (
                        <span>
                          {(room.viewerCount / 10000).toFixed(1)}
                          万人观看
                        </span>
                      )}
                      <span>{getQualityLabel(room.quality)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/live/${room.roomId}`, '_blank')}
                    className="text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                    title="手机视角预览"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {room.status === 'live' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startRecording(room.roomId)}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      title="开始录制"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAutoRecord(room)}
                    className={`h-8 w-8 p-0 ${
                      room.autoRecord
                        ? 'text-cyan-400 hover:bg-cyan-500/10'
                        : 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400'
                    }`}
                    title={
                      room.autoRecord ? '关闭自动录制' : '开启自动录制'
                    }
                  >
                    {room.autoRecord ? (
                      <CircleDot className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(room)}
                    className="h-8 w-8 p-0 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400"
                    title="设置"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRoom(room.roomId)}
                    className="h-8 w-8 p-0 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
                    title="删除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Room Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">
              直播间设置 - {editRoom?.nickname || editRoom?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">房间号</label>
              <Input
                value={editRoom?.roomId || ''}
                disabled
                className="border-zinc-700 bg-zinc-800 text-zinc-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">录制模式</label>
              <Select
                value={editRecordMode}
                onValueChange={(v) => setEditRecordMode(v as RecordingMode)}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="original">原始流录制</SelectItem>
                  <SelectItem value="composite">合成录制</SelectItem>
                  <SelectItem value="both">两者同步录制</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                {editRecordMode === 'original' && '直接录制直播流，画质最高，文件为 .ts 格式'}
                {editRecordMode === 'composite' && '录制画面+弹幕+礼物，文件为 .webm 格式（需在预览页面录制）'}
                {editRecordMode === 'both' && '同时启动原始流录制和合成录制'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">录制画质</label>
              <Select
                value={editQuality}
                onValueChange={setEditQuality}
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-800">
                  <SelectItem value="origin">原画</SelectItem>
                  <SelectItem value="uhd">超清</SelectItem>
                  <SelectItem value="hd">高清</SelectItem>
                  <SelectItem value="sd">标清</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3">
              <div>
                <p className="text-sm text-zinc-200">自动录制</p>
                <p className="text-xs text-zinc-500">开播时自动开始录制</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditAutoRecord(!editAutoRecord)}
                className={editAutoRecord ? 'text-cyan-400' : 'text-zinc-500'}
              >
                {editAutoRecord ? <CircleDot className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </Button>
            </div>
            <div className="space-y-3 rounded-lg border border-zinc-800 p-3">
              <p className="text-sm font-medium text-zinc-300">录制结束自动转换</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={editCompositeAutoConvert}
                    onChange={(e) => setEditCompositeAutoConvert(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800"
                  />
                  合成录制自动转换
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={editOriginalAutoConvert}
                    onChange={(e) => setEditOriginalAutoConvert(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-800"
                  />
                  原始流录制自动转换
                </label>
              </div>
              {(editCompositeAutoConvert || editOriginalAutoConvert) && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">转换格式</label>
                    <Select
                      value={editConvertFormat}
                      onValueChange={(v) => setEditConvertFormat(v as VideoFormat)}
                    >
                      <SelectTrigger className="h-8 border-zinc-700 bg-zinc-800 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-700 bg-zinc-900">
                        <SelectItem value="mp4">MP4 (推荐)</SelectItem>
                        <SelectItem value="mkv">MKV</SelectItem>
                        <SelectItem value="flv">FLV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-400">
                    <input
                      type="checkbox"
                      checked={editDeleteSource}
                      onChange={(e) => setEditDeleteSource(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-800"
                    />
                    转换后删除源文件
                  </label>
                </>
              )}
            </div>
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={saveRoomSettings}
            >
              保存设置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
