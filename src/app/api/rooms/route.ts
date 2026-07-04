import { NextRequest, NextResponse } from 'next/server';
import {
  getRooms,
  addRoom,
  removeRoom,
  updateRoom,
} from '@/lib/store';
import {
  extractRoomId,
  resolveShortUrl,
  checkLiveStatus,
} from '@/lib/douyin';
import type { LiveRoom, ApiResponse } from '@/lib/types';

/** GET - 获取所有直播间列表 */
export async function GET(): Promise<NextResponse<ApiResponse<LiveRoom[]>>> {
  try {
    const rooms = getRooms();
    return NextResponse.json({ success: true, data: rooms });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取直播间列表失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** POST - 添加直播间 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LiveRoom[]>>> {
  try {
    const body = await request.json();
    const { url, quality } = body as { url?: string; quality?: string };

    if (!url) {
      return NextResponse.json(
        { success: false, error: '请提供直播间 URL 或房间号' },
        { status: 400 }
      );
    }

    let roomId = extractRoomId(url);

    // 处理短链接
    if (roomId.includes('v.douyin.com')) {
      roomId = await resolveShortUrl(roomId);
    }

    // 检查直播间信息
    let roomInfo;
    try {
      roomInfo = await checkLiveStatus(roomId);
    } catch {
      // 即使获取失败也允许添加
      roomInfo = {
        isLive: false,
        title: '',
        nickname: '',
        viewerCount: 0,
        avatar: '',
      };
    }

    const room: LiveRoom = {
      id: `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId,
      name: roomInfo.nickname || `直播间 ${roomId}`,
      avatar: roomInfo.avatar,
      url: `https://live.douyin.com/${roomId}`,
      status: roomInfo.isLive ? 'live' : 'offline',
      autoRecord: true,
      quality: (quality as LiveRoom['quality']) || 'origin',
      recordMode: (body.recordMode as LiveRoom['recordMode']) || 'original',
      autoConvert: false,
      convertFormat: 'mp4',
      createdAt: Date.now(),
      lastCheckedAt: Date.now(),
      title: roomInfo.title,
      nickname: roomInfo.nickname,
      viewerCount: roomInfo.viewerCount,
    };

    const rooms = addRoom(room);
    return NextResponse.json({ success: true, data: rooms, message: '添加成功' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '添加直播间失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** DELETE - 删除直播间 */
export async function DELETE(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LiveRoom[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: '请提供直播间 ID' },
        { status: 400 }
      );
    }

    const rooms = removeRoom(roomId);
    return NextResponse.json({ success: true, data: rooms, message: '删除成功' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '删除直播间失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** PUT - 更新直播间设置 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<LiveRoom>>> {
  try {
    const body = await request.json();
    const { roomId, updates } = body as {
      roomId: string;
      updates: Partial<LiveRoom>;
    };

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: '请提供直播间 ID' },
        { status: 400 }
      );
    }

    const room = updateRoom(roomId, updates);
    if (!room) {
      return NextResponse.json(
        { success: false, error: '直播间不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: room });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '更新直播间失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
