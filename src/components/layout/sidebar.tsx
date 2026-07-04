'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Radio,
  CircleDot,
  Settings,
  Monitor,
  Eye,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/rooms', label: '直播间', icon: Radio },
  { href: '/recordings', label: '录制管理', icon: CircleDot },
  { href: '/live', label: '直播预览', icon: Eye },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-zinc-800 bg-[#111113]">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
          <Monitor className="h-4.5 w-4.5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">
            DyRec
          </h1>
          <p className="text-[10px] text-zinc-500">直播录制工具</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  isActive ? 'text-cyan-400' : 'text-zinc-500'
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-3">
        <div className="rounded-md bg-zinc-800/40 px-3 py-2">
          <p className="text-[11px] text-zinc-500">DyRec v1.0.0</p>
          <p className="text-[10px] text-zinc-600">
            抖音直播自动录制
          </p>
        </div>
      </div>
    </aside>
  );
}
