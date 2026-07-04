import { NextRequest, NextResponse } from 'next/server';
import { fetchRoomInfo } from '@/lib/douyin';
import logger from '@/lib/logger';

/**
 * 预览直播间信息（不添加到数据库）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url || !url.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入直播间 URL 或房间号' },
        { status: 400 }
      );
    }

    logger.info('preview', '预览直播间: ' + url);

    // 获取直播间信息
    const roomInfo = await fetchRoomInfo(url.trim());

    if (!roomInfo) {
      return NextResponse.json(
        { success: false, error: '无法获取直播间信息，请检查房间号是否正确' },
        { status: 404 }
      );
    }

    // 返回预览信息
    const roomData = roomInfo.roomData;
    if (!roomData) {
      return NextResponse.json({
        success: false,
        error: '无法获取直播间信息',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        roomId: roomData.id_str || url.trim(),
        nickname: roomData.owner?.nickname || '未知主播',
        title: roomData.title || '',
        avatar: roomData.owner?.avatar_thumb?.url_list?.[0] || '',
        isLive: roomInfo.isLive,
      },
    });
  } catch (error) {
    logger.error('preview', '预览直播间失败', error);
    return NextResponse.json(
      {
        success: false,
        error: '预览失败: ' + (error instanceof Error ? error.message : '未知错误'),
      },
      { status: 500 }
    );
  }
}
