import type { DouyinApiResponse, DouyinRoomData } from './types';

// ============================================================
// 抖音直播 API - 获取直播间信息与流地址
// ============================================================

const DOUYIN_LIVE_URL = 'https://live.douyin.com';
const DOUYIN_API_URL = `${DOUYIN_LIVE_URL}/webcast/room/web/enter/`;

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: 'https://live.douyin.com/',
  Origin: 'https://live.douyin.com',
};

/**
 * 从 URL 中提取直播间 ID
 * 支持格式:
 * - https://live.douyin.com/745964462470
 * - https://v.douyin.com/iQFeBnt/ (短链接)
 * - https://www.douyin.com/user/xxx (用户主页)
 * - 纯数字房间号
 */
export function extractRoomId(input: string): string {
  const trimmed = input.trim();

  // 纯数字
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // 标准直播间 URL: https://live.douyin.com/745964462470
  const standardMatch = trimmed.match(/live\.douyin\.com\/(\d+)/);
  if (standardMatch) {
    return standardMatch[1];
  }

  // 短链接需要重定向解析 (此处返回原始输入，由调用方处理)
  if (trimmed.includes('v.douyin.com')) {
    return trimmed;
  }

  // 用户主页
  const userMatch = trimmed.match(/douyin\.com\/user\/([^?/]+)/);
  if (userMatch) {
    return userMatch[1];
  }

  return trimmed;
}

/**
 * 解析短链接获取真实房间号
 */
export async function resolveShortUrl(shortUrl: string): Promise<string> {
  try {
    // 确保 URL 有协议
    let url = shortUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    // 尝试 HEAD 请求获取重定向后的 URL
    let finalUrl = '';
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: DEFAULT_HEADERS,
      });
      finalUrl = response.url;
    } catch {
      // HEAD 请求失败，尝试 GET 请求
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: DEFAULT_HEADERS,
      });
      finalUrl = response.url;
    }

    // 尝试多种模式匹配房间号
    // 1. live.douyin.com/数字
    let match = finalUrl.match(/live\.douyin\.com\/(\d+)/);
    if (match) {
      return match[1];
    }

    // 2. web_room_id 参数
    try {
      const urlObj = new URL(finalUrl);
      const webRoomId = urlObj.searchParams.get('web_room_id');
      if (webRoomId && /^\d+$/.test(webRoomId)) {
        return webRoomId;
      }

      // 3. room_id 参数
      const roomId = urlObj.searchParams.get('room_id');
      if (roomId && /^\d+$/.test(roomId)) {
        return roomId;
      }
    } catch {
      // URL 解析失败，继续尝试其他方法
    }

    // 4. 路径中的数字 (如 /number)
    const pathMatch = finalUrl.match(/\/(\d{6,})(?:[?/]|$)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    throw new Error(`无法从短链接中解析出房间号，最终URL: ${finalUrl}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    throw new Error(`解析短链接失败: ${msg}`);
  }
}

/**
 * 获取直播间信息与流地址
 */
export async function fetchRoomInfo(
  webRid: string,
  cookie?: string
): Promise<{
  isLive: boolean;
  roomData: DouyinRoomData | null;
  streamUrls: {
    flv: Record<string, string>;
    hls: Record<string, string>;
  };
}> {
  const params = new URLSearchParams({
    aid: '6383',
    app_name: 'douyin_web',
    live_id: '1',
    device_platform: 'web',
    language: 'zh-CN',
    browser_language: 'zh-CN',
    browser_platform: 'Win32',
    browser_name: 'Chrome',
    browser_version: '120.0.0.0',
    web_rid: webRid,
  });

  const headers: Record<string, string> = { ...DEFAULT_HEADERS };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const url = `${DOUYIN_API_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as DouyinApiResponse;

    if (json.status_code !== 0 || !json.data?.data?.length) {
      return {
        isLive: false,
        roomData: null,
        streamUrls: { flv: {}, hls: {} },
      };
    }

    const roomData = json.data.data[0];
    const isLive = roomData.status === 2;

    const streamUrls = {
      flv: roomData.stream_url?.flv_pull_url ?? {},
      hls: roomData.stream_url?.hls_pull_url_map ?? {},
    };

    return { isLive, roomData, streamUrls };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    throw new Error(`获取直播间信息失败: ${msg}`);
  }
}

/**
 * 获取最佳流地址
 * 画质优先级: 原画 > 蓝光 > 超清 > 高清 > 标清 > 流畅
 */
export function getBestStreamUrl(
  urls: Record<string, string>,
  quality: 'origin' | 'uhd' | 'hd' | 'sd' = 'origin'
): string | null {
  if (!urls || Object.keys(urls).length === 0) return null;

  const qualityOrder: Record<string, string[]> = {
    origin: [
      'FULL_HD1',
      'ORIGIN',
      '蓝光4M',
      '蓝光',
      '原画',
      'FULL_SD1',
      'HD1',
      '超清',
      '高清',
      'SD1',
      '标清',
      'SD2',
      '流畅',
    ],
    uhd: ['FULL_SD1', '超清', 'HD1', 'SD1', 'SD2'],
    hd: ['HD1', '高清', 'SD1', 'SD2'],
    sd: ['SD1', '标清', 'SD2'],
  };

  const priorities = qualityOrder[quality] || qualityOrder.origin;

  // 按优先级查找
  for (const key of priorities) {
    const foundKey = Object.keys(urls).find(
      (k) => k.toUpperCase() === key.toUpperCase()
    );
    if (foundKey && urls[foundKey]) {
      return urls[foundKey];
    }
  }

  // 返回第一个可用的
  const firstKey = Object.keys(urls)[0];
  return firstKey ? urls[firstKey] : null;
}

/**
 * 检查直播间状态 (轻量级)
 */
export async function checkLiveStatus(
  webRid: string,
  cookie?: string
): Promise<{
  isLive: boolean;
  title: string;
  nickname: string;
  viewerCount: number;
  avatar: string;
}> {
  const result = await fetchRoomInfo(webRid, cookie);

  return {
    isLive: result.isLive,
    title: result.roomData?.title ?? '',
    nickname: result.roomData?.owner?.nickname ?? '',
    viewerCount: result.roomData?.user_count ?? 0,
    avatar:
      result.roomData?.owner?.avatar_thumb?.url_list?.[0] ?? '',
  };
}
