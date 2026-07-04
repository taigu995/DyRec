import { NextResponse } from 'next/server';

/**
 * 开机自启动 API (Web 环境)
 * 
 * 在 Web 环境中无法直接设置开机自启动，
 * 但可以提供状态查询和设置指引。
 * 
 * 在 Electron 环境中，通过 window.electronAPI.autoStart 调用。
 */

// 检查是否为 Electron 环境（通过 User-Agent 判断）
function isElectronRequest(userAgent: string | null): boolean {
  return userAgent?.toLowerCase().includes('electron') ?? false;
}

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent');
  
  // Web 环境：返回提示信息和设置指引
  return NextResponse.json({
    success: true,
    data: {
      enabled: false,
      isElectron: isElectronRequest(userAgent),
      message: 'Web 环境不支持开机自启动',
      guide: [
        '按 Win + R 打开运行对话框',
        '输入 shell:startup 回车打开启动文件夹',
        '将 DyRec 的快捷方式复制到该文件夹',
        '下次开机时 DyRec 将自动启动',
      ],
    },
  });
}

export async function PUT(request: Request) {
  const userAgent = request.headers.get('user-agent');
  
  if (isElectronRequest(userAgent)) {
    // Electron 环境应通过 IPC 调用，此处返回错误
    return NextResponse.json({
      success: false,
      error: 'Electron 环境请使用 window.electronAPI.autoStart.set()',
    }, { status: 400 });
  }
  
  // Web 环境：返回提示信息
  return NextResponse.json({
    success: false,
    error: 'Web 环境不支持开机自启动，请使用桌面版或按照指引手动设置',
    data: {
      guide: [
        '按 Win + R 打开运行对话框',
        '输入 shell:startup 回车打开启动文件夹',
        '将 DyRec 的快捷方式复制到该文件夹',
        '下次开机时 DyRec 将自动启动',
      ],
    },
  });
}
