'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
  Terminal,
  Timer,
  Shield,
  Settings as SettingsIcon,
  Power,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { AppSettings } from '@/lib/types';

interface SettingsWithStatus extends AppSettings {
  ffmpegAvailable: boolean;
  ffmpegVersion: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsWithStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [autoStartLoading, setAutoStartLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAutoStartStatus();
  }, []);

  const fetchAutoStartStatus = async () => {
    // 检查是否为 Electron 环境
    if (typeof window !== 'undefined' && (window as any).electronAPI?.autoStart) {
      setIsElectron(true);
      try {
        const result = await (window as any).electronAPI.autoStart.get();
        if (result.success) {
          setAutoStartEnabled(result.data.enabled);
        }
      } catch (err) {
        console.error('获取自启动状态失败:', err);
      }
    } else {
      // Web 环境：通过 API 获取状态
      try {
        const res = await fetch('/api/autostart');
        const data = await res.json();
        if (data.success) {
          setAutoStartEnabled(data.data.enabled);
        }
      } catch (err) {
        console.error('获取自启动状态失败:', err);
      }
    }
  };

  const toggleAutoStart = async (enabled: boolean) => {
    setAutoStartLoading(true);
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.autoStart) {
        // Electron 环境
        const result = await (window as any).electronAPI.autoStart.set(enabled);
        if (result.success) {
          setAutoStartEnabled(enabled);
        }
      } else {
        // Web 环境：通过 API
        const res = await fetch('/api/autostart', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        });
        const data = await res.json();
        if (data.success) {
          setAutoStartEnabled(enabled);
        }
      }
    } catch (err) {
      console.error('设置自启动失败:', err);
    } finally {
      setAutoStartLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.error('获取设置失败:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaveMsg('');
    try {
      const { ffmpegAvailable, ffmpegVersion, ...toSave } = settings;
      void ffmpegAvailable;
      void ffmpegVersion;
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMsg('设置已保存');
        setIsDirty(false);
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        setSaveMsg(data.error || '保存失败');
      }
    } catch {
      setSaveMsg('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
    setIsDirty(true);
    setSaveMsg('');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-zinc-400">加载设置失败</p>
        <Button
          variant="outline"
          onClick={fetchSettings}
          className="border-zinc-700 text-zinc-300"
        >
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">设置</h1>
          <p className="mt-1 text-sm text-zinc-500">
            配置录制参数、FFmpeg 路径和监控选项
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={isSaving || !isDirty}
          className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存设置
        </Button>
      </div>

      {saveMsg && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            saveMsg.includes('已保存')
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
          }`}
        >
          {saveMsg.includes('已保存') ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {saveMsg}
        </div>
      )}

      {/* FFmpeg Status */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Terminal className="h-4 w-4 text-cyan-400" />
            FFmpeg 状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  settings.ffmpegAvailable
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-zinc-300">
                {settings.ffmpegAvailable ? '已检测到 FFmpeg' : 'FFmpeg 不可用'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {settings.ffmpegVersion && (
                <span className="font-mono text-xs text-zinc-500">
                  v{settings.ffmpegVersion}
                </span>
              )}
              <a href="/setup">
                <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-400 hover:text-zinc-200">
                  <SettingsIcon className="w-3 h-3 mr-1" />
                  一键检测
                </Button>
              </a>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              FFmpeg 路径
            </Label>
            <Input
              value={settings.ffmpegPath}
              onChange={(e) => updateField('ffmpegPath', e.target.value)}
              placeholder="ffmpeg 或完整路径"
              className="border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-600">
              默认为 ffmpeg，确保已安装并添加到系统 PATH 中
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auto Start */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Power className="h-4 w-4 text-cyan-400" />
            开机自启动
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">开机时自动启动 DyRec</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {isElectron
                  ? '启用后程序将在系统启动时自动运行（最小化到托盘）'
                  : 'Web 环境不支持自动设置，请手动将快捷方式添加到启动文件夹'}
              </p>
            </div>
            <Switch
              checked={autoStartEnabled}
              onCheckedChange={toggleAutoStart}
              disabled={autoStartLoading}
            />
          </div>
          {!isElectron && (
            <div className="rounded-md bg-zinc-800/50 p-3 space-y-1.5">
              <p className="text-xs font-medium text-zinc-400">手动设置步骤：</p>
              <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                <li>按 <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">Win + R</kbd> 打开运行</li>
                <li>输入 <code className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300 font-mono">shell:startup</code> 回车</li>
                <li>将 DyRec 快捷方式复制到打开的文件夹</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Settings */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <FolderOpen className="h-4 w-4 text-cyan-400" />
            录制设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">
                默认画质
              </Label>
              <Select
                value={settings.defaultQuality}
                onValueChange={(v) =>
                  updateField('defaultQuality', v as AppSettings['defaultQuality'])
                }
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
              <Label className="text-xs text-zinc-500">
                输出格式
              </Label>
              <Select
                value={settings.defaultFormat}
                onValueChange={(v) =>
                  updateField('defaultFormat', v as AppSettings['defaultFormat'])
                }
              >
                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-700 bg-zinc-900">
                  <SelectItem value="ts">TS (推荐)</SelectItem>
                  <SelectItem value="flv">FLV</SelectItem>
                  <SelectItem value="mkv">MKV</SelectItem>
                  <SelectItem value="mp4">MP4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              保存目录
            </Label>
            <Input
              value={settings.outputDir}
              onChange={(e) => updateField('outputDir', e.target.value)}
              placeholder="./recordings"
              className="border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-200 placeholder:text-zinc-600"
            />
          </div>

          <Separator className="bg-zinc-800" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">
                按时间分段 (分钟, 0=不分段)
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.segmentByTime}
                onChange={(e) =>
                  updateField('segmentByTime', parseInt(e.target.value) || 0)
                }
                className="border-zinc-700 bg-zinc-800 text-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">
                按大小分段 (MB, 0=不分段)
              </Label>
              <Input
                type="number"
                min={0}
                value={settings.segmentBySize}
                onChange={(e) =>
                  updateField('segmentBySize', parseInt(e.target.value) || 0)
                }
                className="border-zinc-700 bg-zinc-800 text-zinc-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              最大并发录制数
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.maxConcurrent}
              onChange={(e) =>
                updateField('maxConcurrent', parseInt(e.target.value) || 3)
              }
              className="border-zinc-700 bg-zinc-800 w-32 text-zinc-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Monitor Settings */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Timer className="h-4 w-4 text-cyan-400" />
            监控设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-zinc-300">
                自动录制
              </Label>
              <p className="text-xs text-zinc-500">
                检测到开播时自动开始录制
              </p>
            </div>
            <Switch
              checked={settings.autoRecord}
              onCheckedChange={(checked) =>
                updateField('autoRecord', checked)
              }
            />
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              检测间隔 (秒)
            </Label>
            <Input
              type="number"
              min={10}
              max={600}
              value={settings.checkInterval}
              onChange={(e) =>
                updateField('checkInterval', parseInt(e.target.value) || 60)
              }
              className="border-zinc-700 bg-zinc-800 w-32 text-zinc-200"
            />
            <p className="text-xs text-zinc-600">
              建议 60 秒以上，过于频繁可能触发平台限制
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Auth Settings */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <Shield className="h-4 w-4 text-cyan-400" />
            认证设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              抖音 Cookie
            </Label>
            <Input
              type="password"
              value={settings.cookie}
              onChange={(e) => updateField('cookie', e.target.value)}
              placeholder="可选，用于访问需要登录的直播间"
              className="border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-600">
              从浏览器开发者工具中复制 Cookie，用于获取更完整的直播信息
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              代理地址
            </Label>
            <Input
              value={settings.proxy}
              onChange={(e) => updateField('proxy', e.target.value)}
              placeholder="http://127.0.0.1:7890 (可选)"
              className="border-zinc-700 bg-zinc-800 font-mono text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-600">
              仅在需要代理访问时填写
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
