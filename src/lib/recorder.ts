import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import type { RecordingTask, AppSettings } from './types';

// ============================================================
// FFmpeg 录制管理器
// 管理录制进程的启动、停止、状态监控
// ============================================================

/** 活跃的录制进程 */
const activeProcesses = new Map<string, ChildProcess>();

/**
 * 生成 FFmpeg 录制命令参数
 */
export function buildFFmpegArgs(
  streamUrl: string,
  outputPath: string,
  settings: AppSettings,
  task: RecordingTask
): string[] {
  const args: string[] = [
    '-y', // 覆盖输出
    '-hide_banner',
    '-loglevel',
    'warning',
    '-stats',
  ];

  // 代理设置
  if (settings.proxy) {
    args.push('-http_proxy', settings.proxy);
  }

  // 输入选项
  args.push(
    '-rw_timeout',
    '15000000', // 读写超时 15s
    '-i',
    streamUrl
  );

  // 分段录制
  if (settings.segmentByTime > 0) {
    args.push(
      '-f',
    'segment',
      '-segment_time',
      String(settings.segmentByTime * 60),
      '-reset_timestamps',
      '1'
    );
    // 修改输出路径以支持分段
    const ext = path.extname(outputPath);
    outputPath = outputPath.replace(ext, `_%03d${ext}`);
  }

  // 视频编码 - 直接复制流
  args.push('-c', 'copy');

  // 输出格式
  const format = task.format || settings.defaultFormat;
  if (format === 'ts') {
    args.push('-f', 'mpegts');
  } else if (format === 'flv') {
    args.push('-f', 'flv');
  } else if (format === 'mkv') {
    args.push('-f', 'matroska');
  }

  args.push(outputPath);

  return args;
}

/**
 * 启动录制任务
 */
export function startRecording(
  task: RecordingTask,
  streamUrl: string,
  settings: AppSettings
): { success: boolean; error?: string } {
  if (activeProcesses.has(task.id)) {
    return { success: false, error: '录制任务已在运行中' };
  }

  // 确保输出目录存在
  const outputDir = path.dirname(task.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpegPath = settings.ffmpegPath || 'ffmpeg';
  const args = buildFFmpegArgs(streamUrl, task.outputPath, settings, task);

  try {
    const proc = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    activeProcesses.set(task.id, proc);

    proc.on('error', (err: Error) => {
      console.error(`[Recorder] FFmpeg 进程错误 [${task.id}]:`, err.message);
      activeProcesses.delete(task.id);
    });

    proc.on('close', (code: number | null) => {
      console.log(`[Recorder] 录制结束 [${task.id}], 退出码: ${code}`);
      activeProcesses.delete(task.id);
    });

    // 捕获 stderr 用于日志
    proc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log(`[FFmpeg:${task.id}] ${msg}`);
      }
    });

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `启动 FFmpeg 失败: ${msg}` };
  }
}

/**
 * 停止录制任务
 */
export function stopRecording(taskId: string): boolean {
  const proc = activeProcesses.get(taskId);
  if (!proc) {
    return false;
  }

  try {
    // 发送 SIGINT 让 FFmpeg 正常结束并写入文件头
    proc.kill('SIGINT');

    // 5秒后强制杀死
    setTimeout(() => {
      if (activeProcesses.has(taskId)) {
        proc.kill('SIGKILL');
        activeProcesses.delete(taskId);
      }
    }, 5000);

    return true;
  } catch {
    activeProcesses.delete(taskId);
    return false;
  }
}

/**
 * 停止所有录制任务
 */
export function stopAllRecordings(): void {
  for (const [taskId] of activeProcesses) {
    stopRecording(taskId);
  }
}

/**
 * 获取活跃录制数量
 */
export function getActiveRecordingCount(): number {
  return activeProcesses.size;
}

/**
 * 检查 FFmpeg 是否可用
 */
export async function checkFFmpeg(
  ffmpegPath: string = 'ffmpeg'
): Promise<{ available: boolean; version: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(ffmpegPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      proc.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      proc.on('close', (code: number | null) => {
        if (code === 0 && output) {
          const versionMatch = output.match(
            /ffmpeg version\s+(\S+)/
          );
          resolve({
            available: true,
            version: versionMatch?.[1] ?? 'unknown',
          });
        } else {
          resolve({ available: false, version: '' });
        }
      });

      proc.on('error', () => {
        resolve({ available: false, version: '' });
      });
    } catch {
      resolve({ available: false, version: '' });
    }
  });
}

/**
 * 生成输出文件路径
 */
export function generateOutputPath(
  outputDir: string,
  roomName: string,
  format: string
): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const safeRoomName = roomName.replace(/[<>:"/\\|?*]/g, '_');
  const filename = `${safeRoomName}_${dateStr}.${format}`;
  return path.join(outputDir, safeRoomName, filename);
}
