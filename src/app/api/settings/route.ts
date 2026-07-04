import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/store';
import { checkFFmpeg } from '@/lib/recorder';
import type { ApiResponse, AppSettings } from '@/lib/types';

/** GET - 获取设置 */
export async function GET(): Promise<
  NextResponse<ApiResponse<AppSettings & { ffmpegAvailable: boolean; ffmpegVersion: string }>>
> {
  try {
    const settings = getSettings();
    const ffmpegCheck = await checkFFmpeg(settings.ffmpegPath);

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        ffmpegAvailable: ffmpegCheck.available,
        ffmpegVersion: ffmpegCheck.version,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '获取设置失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

/** PUT - 更新设置 */
export async function PUT(
  request: NextRequest
): Promise<NextResponse<ApiResponse<AppSettings>>> {
  try {
    const body = await request.json();
    const updates = body as Partial<AppSettings>;
    const settings = updateSettings(updates);

    return NextResponse.json({
      success: true,
      data: settings,
      message: '设置已保存',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '更新设置失败';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
