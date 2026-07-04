'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  RefreshCw,
  ArrowRight,
  Shield,
  Film,
  Wifi,
  Server,
} from 'lucide-react';

// 类型定义
interface DepResult {
  name: string;
  status: 'installed' | 'not_installed' | 'installing' | 'failed' | 'checking';
  version: string | null;
  path: string | null;
  source: string | null;
  description: string;
  optional?: boolean;
}

interface InstallProgress {
  stage: string;
  percent: number;
  message: string;
}

// Electron API 类型
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      deps: {
        checkAll: () => Promise<{ success: boolean; data: DepResult[]; error?: string }>;
        checkFFmpeg: () => Promise<{ success: boolean; data: DepResult; error?: string }>;
        installFFmpeg: () => Promise<{ success: boolean; data?: { path: string; version: string }; error?: string }>;
        getFFmpegPath: () => Promise<{ success: boolean; data: string }>;
        onInstallProgress: (callback: (progress: InstallProgress) => void) => () => void;
      };
    };
  }
}

const statusConfig = {
  installed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', label: '已安装' },
  not_installed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: '未安装' },
  installing: { icon: Loader2, color: 'text-cyan-400', bg: 'bg-cyan-400/10', label: '安装中' },
  failed: { icon: XCircle, color: 'text-amber-400', bg: 'bg-amber-400/10', label: '失败' },
  checking: { icon: Loader2, color: 'text-zinc-400', bg: 'bg-zinc-400/10', label: '检测中' },
};

const depIcons: Record<string, typeof Film> = {
  FFmpeg: Film,
  'Node.js': Server,
  网络连接: Wifi,
};

export default function SetupPage() {
  const router = useRouter();
  const [dependencies, setDependencies] = useState<DepResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // 检测是否在 Electron 环境
  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
  }, []);

  // 监听安装进度
  useEffect(() => {
    if (!window.electronAPI?.deps?.onInstallProgress) return;
    const cleanup = window.electronAPI.deps.onInstallProgress((progress) => {
      setInstallProgress(progress);
    });
    return cleanup;
  }, []);

  // 执行检测
  const runCheck = useCallback(async () => {
    setIsChecking(true);
    setInstallError(null);

    if (window.electronAPI?.deps?.checkAll) {
      // Electron 环境：使用原生检测
      const result = await window.electronAPI.deps.checkAll();
      if (result.success) {
        setDependencies(result.data);
      }
    } else {
      // Web 环境：模拟检测（通过 API）
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        const ffmpegAvailable = data.data?.ffmpegAvailable ?? false;
        const ffmpegVersion = data.data?.ffmpegVersion ?? null;

        setDependencies([
          {
            name: 'FFmpeg',
            status: ffmpegAvailable ? 'installed' : 'not_installed',
            version: ffmpegVersion,
            path: ffmpegAvailable ? 'system' : null,
            source: ffmpegAvailable ? 'system' : null,
            description: ffmpegAvailable ? '录制功能已就绪' : '录制功能需要 FFmpeg',
          },
          {
            name: 'Node.js',
            status: 'installed',
            version: '内置于 Electron',
            path: null,
            source: 'bundled',
            description: '运行时环境正常',
            optional: true,
          },
          {
            name: '网络连接',
            status: 'installed',
            version: null,
            path: null,
            source: null,
            description: '网络正常',
            optional: true,
          },
        ]);
      } catch {
        setDependencies([
          {
            name: 'FFmpeg',
            status: 'not_installed',
            version: null,
            path: null,
            source: null,
            description: '无法检测',
          },
        ]);
      }
    }

    setIsChecking(false);
  }, []);

  // 首次加载自动检测
  useEffect(() => {
    runCheck();
  }, [runCheck]);

  // 安装 FFmpeg
  const handleInstallFFmpeg = async () => {
    if (!window.electronAPI?.deps?.installFFmpeg) {
      setInstallError('当前环境不支持自动安装，请手动安装 FFmpeg');
      return;
    }

    setIsInstalling(true);
    setInstallError(null);
    setInstallProgress({ stage: 'preparing', percent: 0, message: '准备安装...' });

    // 更新状态为安装中
    setDependencies((prev) =>
      prev.map((dep) => (dep.name === 'FFmpeg' ? { ...dep, status: 'installing' as const } : dep))
    );

    try {
      const result = await window.electronAPI.deps.installFFmpeg();
      if (result.success) {
        // 重新检测
        await runCheck();
      } else {
        setInstallError(result.error || '安装失败');
        setDependencies((prev) =>
          prev.map((dep) => (dep.name === 'FFmpeg' ? { ...dep, status: 'failed' as const } : dep))
        );
      }
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : '安装失败');
      setDependencies((prev) =>
        prev.map((dep) => (dep.name === 'FFmpeg' ? { ...dep, status: 'failed' as const } : dep))
      );
    }

    setIsInstalling(false);
    setInstallProgress(null);
  };

  // 判断是否可以进入主界面
  const ffmpegDep = dependencies.find((d) => d.name === 'FFmpeg');
  const canProceed = ffmpegDep?.status === 'installed';
  const allRequiredInstalled = dependencies
    .filter((d) => !d.optional)
    .every((d) => d.status === 'installed');

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">环境检测</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {isElectron ? 'DyRec 正在检测运行环境，确保所有依赖已就绪' : 'DyRec 正在检测运行环境'}
          </p>
        </div>

        {/* 检测结果 */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200">依赖状态</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  检测录制功能所需的前置依赖
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={runCheck}
                disabled={isChecking || isInstalling}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
                重新检测
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dependencies.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                正在检测...
              </div>
            ) : (
              dependencies.map((dep) => {
                const config = statusConfig[dep.status];
                const Icon = config.icon;
                const DepIcon = depIcons[dep.name] || Shield;

                return (
                  <div
                    key={dep.name}
                    className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <DepIcon className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200">{dep.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${config.color} border-current/20 ${config.bg}`}
                        >
                          {config.label}
                        </Badge>
                        {dep.optional && (
                          <span className="text-[10px] text-zinc-600">可选</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {dep.version ? `${dep.version}` : dep.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Icon
                        className={`w-5 h-5 ${config.color} ${dep.status === 'checking' || dep.status === 'installing' ? 'animate-spin' : ''}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* 安装区域 */}
        {ffmpegDep && ffmpegDep.status === 'not_installed' && (
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="pt-6">
              {isInstalling && installProgress ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{installProgress.message}</span>
                    <span className="text-sm text-cyan-400">{installProgress.percent}%</span>
                  </div>
                  <Progress value={installProgress.percent} className="h-2" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-zinc-200 mb-1">FFmpeg 未安装</h3>
                    <p className="text-xs text-zinc-500">
                      {isElectron
                        ? '点击下方按钮自动下载安装 FFmpeg（约 80MB），安装后即可使用录制功能。'
                        : '请手动安装 FFmpeg 并添加到系统 PATH，或下载 ffmpeg.exe 放到应用目录。'}
                    </p>
                  </div>
                  {installError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400">{installError}</p>
                    </div>
                  )}
                  {isElectron && (
                    <Button
                      onClick={handleInstallFFmpeg}
                      disabled={isInstalling}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                    >
                      {isInstalling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          安装中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          一键安装 FFmpeg
                        </>
                      )}
                    </Button>
                  )}
                  {!isElectron && (
                    <div className="p-3 rounded-lg bg-zinc-800 border border-zinc-700">
                      <p className="text-xs text-zinc-400 font-mono">
                        # Windows: 下载 ffmpeg.exe 放到应用目录<br />
                        # 或访问 https://ffmpeg.org/download.html
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-600">
            {allRequiredInstalled ? (
              <span className="text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                所有必需依赖已就绪
              </span>
            ) : (
              <span>请先安装所有必需依赖</span>
            )}
          </div>
          <Button
            onClick={() => router.push('/')}
            disabled={!canProceed && !allRequiredInstalled}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            进入 DyRec
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* 非 Electron 环境提示 */}
        {!isElectron && (
          <div className="mt-6 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-xs text-zinc-500 text-center">
              当前为 Web 模式运行。打包为桌面应用后可使用一键安装功能。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
