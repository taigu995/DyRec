import { NextRequest, NextResponse } from 'next/server';
import { getRooms, updateRoom, getSettings } from '@/lib/store';
import { checkLiveStatus, fetchRoomInfo, getBestStreamUrl } from '@/lib/douyin';
import type { ApiResponse, LiveRoom } from '@/lib/types';

/** GET - 检测所有直播间状态 */
export async function GET(): Promise<
  NextResponse<ApiResponse<{ rooms: LiveRoom[]; liveCount: number }>>
> {
  try {
    const rooms = getRooms();
    const settings = getSettings();
    let liveCount = 0;

    // 并发检测所有直播间
    const results = await Promise.allSettled(
      rooms.map(async (room) => {
        try {
          const status = await checkLiveStatus(room.roomId, settings.cookie);
          return { room, status };
        } catch {
          return { room, status: null };
        }
      })
    );

    // 更新每个房间的状态
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.status) {
        const { room, status } = result.value;
        const newStatus = status.isLive ? 'live' : 'offline';
        if (newStatus !== room.status) {
          updateRoom(room.roomId, {
            status: newStatus,
            lastCheckedAt: Date.now(),
            title: status.title,
            nickname: status.nickname || room.nickname,
            viewerCount: status.viewerCount,
            avatar: status.avatar || room.avatar,
          });
        } else {
          updateRoom(room.roomId, {
            lastCheckedAt: Date.now(),
            viewerCount: status.viewerCount,
          });
        }
        if (status.isLive) liveCount++;
      }
    }

    const updatedRooms = getRooms();
    return NextResponse.json({
      success: true,
      data: { rooms: updatedRooms, liveCount },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '检测失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** POST - 获取指定直播间的流地址 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ streamUrl: string | null; quality: string }>>> {
  try {
    const body = await request.json();
    const { roomId, quality } = body as {
      roomId: string;
      quality?: string;
    };

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: '请提供直播间 ID' },
        { status: 400 }
      );
    }

    const settings = getSettings();
    const result = await fetchRoomInfo(roomId, settings.cookie);

    if (!result.isLive) {
      return NextResponse.json({
        success: true,
        data: { streamUrl: null, quality: '' },
        message: '直播间未开播',
      });
    }

    const streamUrl = getBestStreamUrl(
      result.streamUrls.flv,
      (quality as 'origin' | 'uhd' | 'hd' | 'sd') || 'origin'
    );

    return NextResponse.json({
      success: true,
      data: { streamUrl, quality: quality || 'origin' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取流地址失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
