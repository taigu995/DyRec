'use client';

import { useState, useEffect } from 'react';
import { Globe, Cookie, Save, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function BrowserPage() {
  const [cookie, setCookie] = useState('');
  const [savedCookie, setSavedCookie] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载当前 Cookie
  useEffect(() => {
    const loadCookie = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.data) {
          setSavedCookie(data.data.douyinCookie || '');
          setCookie(data.data.douyinCookie || '');
        }
      } catch (err) {
        console.error('加载 Cookie 失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCookie();
  }, []);

  // 保存 Cookie
  const saveCookie = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ douyinCookie: cookie }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedCookie(cookie);
        setMessage({ type: 'success', text: 'Cookie 保存成功' });
      } else {
        setMessage({ type: 'error', text: '保存失败: ' + (data.error || '未知错误') });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败: ' + (err instanceof Error ? err.message : '未知错误') });
    } finally {
      setIsSaving(false);
    }
  };

  // 获取 Cookie 的说明
  const getCookieInstructions = () => {
    return (
      <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-medium text-zinc-200">如何获取抖音 Cookie：</h3>
        <ol className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/20 text-xs text-cyan-400">1</span>
            <span>点击下方按钮打开抖音直播网页</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/20 text-xs text-cyan-400">2</span>
            <span>登录你的抖音账号</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/20 text-xs text-cyan-400">3</span>
            <span>按 F12 打开开发者工具，切换到 Network（网络）标签</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/20 text-xs text-cyan-400">4</span>
            <span>刷新页面，点击任意请求，找到 Request Headers 中的 Cookie</span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/20 text-xs text-cyan-400">5</span>
            <span>复制完整的 Cookie 值，粘贴到下方输入框</span>
          </li>
        </ol>
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => window.open('https://live.douyin.com', '_blank')}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            打开抖音直播
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => window.open('https://www.douyin.com', '_blank')}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            打开抖音网页版
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Cookie 管理</h1>
        <p className="mt-1 text-sm text-zinc-500">
          配置抖音 Cookie，用于获取更完整的直播间信息和录制
        </p>
      </div>

      {/* Cookie 状态 */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="flex items-center gap-3 py-4">
          {savedCookie ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Cookie 已配置</p>
                <p className="text-xs text-zinc-500">
                  已设置抖音 Cookie，可以使用 Cookie 录制功能
                </p>
              </div>
              <Badge variant="outline" className="ml-auto border-green-600/30 text-green-400">
                已启用
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Cookie 未配置</p>
                <p className="text-xs text-zinc-500">
                  未设置抖音 Cookie，部分功能可能受限
                </p>
              </div>
              <Badge variant="outline" className="ml-auto border-amber-600/30 text-amber-400">
                未配置
              </Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cookie 输入 */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Cookie className="h-4 w-4 text-cyan-400" />
            抖音 Cookie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Cookie 值</label>
            <textarea
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="粘贴从抖音网页获取的 Cookie..."
              className="min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={saveCookie}
              disabled={isSaving || !cookie.trim()}
              className="bg-cyan-600 text-zinc-950 hover:bg-cyan-500"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  保存 Cookie
                </>
              )}
            </Button>
            {savedCookie && (
              <Button
                variant="outline"
                onClick={() => {
                  setCookie('');
                  saveCookie();
                }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                清除 Cookie
              </Button>
            )}
          </div>
          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 获取 Cookie 说明 */}
      {getCookieInstructions()}

      {/* Cookie 的作用 */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-zinc-100">
            <Globe className="h-4 w-4 text-cyan-400" />
            Cookie 的作用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-400">
          <p>• 获取更完整的直播间信息（主播名称、头像等）</p>
          <p>• 获取更高清的直播流地址</p>
          <p>• 使用 Cookie 录制模式，录制更稳定的直播流</p>
          <p>• 避免被抖音限流或封禁</p>
        </CardContent>
      </Card>
    </div>
  );
}
