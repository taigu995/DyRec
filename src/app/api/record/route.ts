import { NextRequest, NextResponse } from 'next/server';
import {
  getTasks,
  addTask,
  updateTask,
  removeTask,
  getRooms,
  getSettings,
  addHistory,
} from '@/lib/store';
import {
  startRecording,
  stopRecording,
  generateOutputPath,
  getActiveRecordingCount,
  checkFFmpeg,
} from '@/lib/recorder';
import { fetchRoomInfo, getBestStreamUrl } from '@/lib/douyin';
import type { ApiResponse, RecordingTask } from '@/lib/types';

/** GET - 获取所有录制任务 */
export async function GET(): Promise<
  NextResponse<ApiResponse<{ tasks: RecordingTask[]; activeCount: number }>>
> {
  try {
    const tasks = getTasks();
    const activeCount = getActiveRecordingCount();
    return NextResponse.json({
      success: true,
      data: { tasks, activeCount },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取任务列表失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** POST - 开始录制 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RecordingTask>>> {
  try {
    const body = await request.json();
    const { roomId } = body as { roomId: string };

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: '请提供直播间 ID' },
        { status: 400 }
      );
    }

    const settings = getSettings();

    // 检查 FFmpeg
    const ffmpegCheck = await checkFFmpeg(settings.ffmpegPath);
    if (!ffmpegCheck.available) {
      return NextResponse.json(
        {
          success: false,
          error:
            'FFmpeg 不可用，请确认 FFmpeg 已安装并配置正确路径。当前路径: ' +
            settings.ffmpegPath,
        },
        { status: 500 }
      );
    }

    // 获取房间信息
    const rooms = getRooms();
    const room = rooms.find((r) => r.roomId === roomId);
    const roomName = room?.nickname || room?.name || roomId;

    // 获取流地址
    const roomInfo = await fetchRoomInfo(roomId, settings.cookie);
    if (!roomInfo.isLive) {
      return NextResponse.json(
        { success: false, error: '直播间未开播，无法录制' },
        { status: 400 }
      );
    }

    const streamUrl = getBestStreamUrl(roomInfo.streamUrls.flv, room?.quality || 'origin');
    if (!streamUrl) {
      return NextResponse.json(
        { success: false, error: '无法获取直播流地址' },
        { status: 500 }
      );
    }

    // 创建录制任务
    const format = settings.defaultFormat;
    const outputPath = generateOutputPath(
      settings.outputDir,
      roomName,
      format
    );

    const task: RecordingTask = {
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId,
      roomName,
      status: 'recording',
      startedAt: Date.now(),
      endedAt: null,
      fileSize: 0,
      outputPath,
      format,
      quality: room?.quality || settings.defaultQuality,
      errorMessage: null,
      streamUrl,
      segmentIndex: 0,
    };

    // 启动录制
    const result = startRecording(task, streamUrl, settings);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    addTask(task);

    return NextResponse.json({
      success: true,
      data: task,
      message: '开始录制',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '启动录制失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** DELETE - 停止录制 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '请提供任务 ID' },
        { status: 400 }
      );
    }

    const stopped = stopRecording(taskId);
    if (!stopped) {
      return NextResponse.json(
        { success: false, error: '录制任务不存在或已停止' },
        { status: 404 }
      );
    }

    // 更新任务状态
    const tasks = getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      updateTask(taskId, {
        status: 'stopped',
        endedAt: Date.now(),
      });

      // 添加到历史记录
      addHistory({
        id: `hist_${Date.now()}`,
        roomId: task.roomId,
        roomName: task.roomName,
        startedAt: task.startedAt,
        endedAt: Date.now(),
        fileSize: task.fileSize,
        filePath: task.outputPath,
        duration: Math.floor((Date.now() - task.startedAt) / 1000),
        format: task.format,
      });
    }

    return NextResponse.json({
      success: true,
      message: '录制已停止',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '停止录制失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
