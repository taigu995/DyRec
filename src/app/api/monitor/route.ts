import { NextRequest, NextResponse } from 'next/server';
import { getRooms, updateRoom, getSettings } from '@/lib/store';
import { checkLiveStatus, fetchRoomInfo, getBestStreamUrl } from '@/lib/douyin';
import type { ApiResponse, LiveRoom } from '@/lib/types';

/** 扩展 LiveRoom 带 streamUrl */
interface LiveRoomWithStream extends LiveRoom {
  streamUrl?: string | null;
}

/** GET - 检测所有直播间状态 */
export async function GET(): Promise<
  NextResponse<ApiResponse<{ rooms: LiveRoomWithStream[]; liveCount: number }>>
> {
  try {
    const rooms = getRooms();
    const settings = getSettings();
    let liveCount = 0;

    // 并发检测所有直播间
    const results = await Promise.allSettled(
      rooms.map(async (room) => {
        try {
          const info = await fetchRoomInfo(room.roomId, settings.cookie);
          return { room, info };
        } catch {
          return { room, info: null };
        }
      })
    );

    // 更新每个房间的状态
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.info) {
        const { room, info } = result.value;
        const newStatus = info.isLive ? 'live' : 'offline';
        const streamUrl = info.isLive
          ? getBestStreamUrl(info.streamUrls.flv, room.quality)
          : null;

        updateRoom(room.roomId, {
          status: newStatus,
          lastCheckedAt: Date.now(),
          title: info.roomData?.title || room.title,
          nickname: info.roomData?.owner?.nickname || room.nickname,
          viewerCount: info.roomData?.user_count || room.viewerCount,
          avatar:
            info.roomData?.owner?.avatar_thumb?.url_list?.[0] ||
            room.avatar,
        });
        if (info.isLive) liveCount++;

        // 将 streamUrl 附加到 room 对象上用于返回
        (room as LiveRoomWithStream).streamUrl = streamUrl;
      }
    }

    const updatedRooms = getRooms() as LiveRoomWithStream[];
    // 为直播中的房间附加 streamUrl
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.info?.isLive) {
        const { room, info } = result.value;
        const streamUrl = getBestStreamUrl(
          info.streamUrls.flv,
          room.quality
        );
        const updated = updatedRooms.find(
          (r) => r.roomId === room.roomId
        );
        if (updated) {
          updated.streamUrl = streamUrl;
        }
      }
    }

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
