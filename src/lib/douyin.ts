import type { DouyinApiResponse, DouyinRoomData } from './types';
import logger from './logger';

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
 * 生成随机的 msToken
 * 参考 biliLive-tools: 182 位随机字符
 */
function generateMsToken(length = 182): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 获取 ttwid cookie
 * 通过访问抖音直播首页自动获取，不需要用户登录
 * 参考 biliLive-tools 和 DouyinLiveWebFetcher 的实现
 */
async function getTtwid(): Promise<string | null> {
  try {
    const response = await fetch(DOUYIN_LIVE_URL, {
      method: 'GET',
      headers: {
        'User-Agent': DEFAULT_HEADERS['User-Agent'],
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    // 从 Set-Cookie 头中提取 ttwid
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/ttwid=([^;]+)/);
      if (match) {
        logger.debug('douyin', 'Got ttwid from response');
        return match[1];
      }
    }

    // 某些环境下 set-cookie 可能不可访问，尝试从 cookies 属性获取
    // @ts-expect-error - cookies 属性在某些 fetch 实现中存在
    if (response.cookies) {
      // @ts-expect-error - cookies 属性在某些 fetch 实现中存在
      const ttwid = response.cookies.get?.('ttwid');
      if (ttwid) {
        logger.debug('douyin', 'Got ttwid from cookies');
        return ttwid;
      }
    }

    logger.warn('douyin', 'Failed to get ttwid from response');
    return null;
  } catch (error) {
    logger.error('douyin', 'Error getting ttwid:', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}

/**
 * 从 URL 中提取直播间 ID
 * 支持格式:
 * - https://live.douyin.com/745964462470
 * - https://v.douyin.com/iQFeBnt/ (短链接)
 * - https://www.douyin.com/user/xxx (用户主页)
 * - 纯数字房间号
 * - 抖音分享文本（包含短链接的完整分享信息）
 */
export function extractRoomId(input: string): string {
  const trimmed = input.trim();

  // 纯数字
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  // 标准直播间 URL: https://live.douyin.com/745964462470 或 https://live.douyin.com/XYQYH2026
  const standardMatch = trimmed.match(/live\.douyin\.com\/([A-Za-z0-9_]+)/);
  if (standardMatch) {
    return standardMatch[1];
  }

  // 从分享文本中提取短链接
  // 格式: https://v.douyin.com/xxxxx/
  const shortUrlMatch = trimmed.match(/https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/);
  if (shortUrlMatch) {
    return shortUrlMatch[0];
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
    // 1. live.douyin.com/数字或字母数字混合
    let match = finalUrl.match(/live\.douyin\.com\/([A-Za-z0-9_]+)/);
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

    // 4. 路径中的字母数字 (如 /XYQYH2026 或 /number)
    const pathMatch = finalUrl.match(/\/([A-Za-z0-9_]{6,})(?:[?/]|$)/);
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
 * 参考 biliLive-tools: 不需要用户 Cookie，自动获取 ttwid
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
    cookie_enabled: 'true',
    screen_width: '1920',
    screen_height: '1080',
    web_rid: webRid,
  });

  const headers: Record<string, string> = { ...DEFAULT_HEADERS };

  // 构建 Cookie
  // 优先使用用户提供的 Cookie，否则自动获取 ttwid
  let cookieStr = '';
  if (cookie) {
    cookieStr = cookie;
  } else {
    // 自动获取 ttwid（参考 biliLive-tools）
    const ttwid = await getTtwid();
    const msToken = generateMsToken();
    if (ttwid) {
      cookieStr = `ttwid=${ttwid}; msToken=${msToken}; __ac_nonce=${generateMsToken(21)}`;
    } else {
      // 即使获取不到 ttwid，也尝试发送请求（可能成功）
      cookieStr = `msToken=${msToken}; __ac_nonce=${generateMsToken(21)}`;
    }
  }
  headers['Cookie'] = cookieStr;

  const url = `${DOUYIN_API_URL}?${params.toString()}`;

  try {
    logger.info('douyin', `Fetching room info for webRid: ${webRid}`);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      logger.error('douyin', `HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      logger.error('douyin', 'Empty response body');
      throw new Error('Empty response - API may require valid cookies');
    }

    let json: DouyinApiResponse;
    try {
      json = JSON.parse(text) as DouyinApiResponse;
    } catch {
      logger.error('douyin', 'Failed to parse JSON response:', text.substring(0, 200));
      throw new Error('Invalid JSON response');
    }

    // 调试日志
    logger.debug('douyin', 'API response', { status_code: json.status_code, data: JSON.stringify(json).substring(0, 500) });

    if (json.status_code !== 0) {
      console.log('[Douyin API] Non-zero status_code:', json.status_code);
      return {
        isLive: false,
        roomData: null,
        streamUrls: { flv: {}, hls: {} },
      };
    }

    if (!json.data?.data?.length) {
      console.log('[Douyin API] No room data found');
      return {
        isLive: false,
        roomData: null,
        streamUrls: { flv: {}, hls: {} },
      };
    }

    const roomData = json.data.data[0];
    const isLive = roomData.status === 2;

    console.log('[Douyin API] Room status:', roomData.status, 'isLive:', isLive);

    const streamUrls = {
      flv: roomData.stream_url?.flv_pull_url ?? {},
      hls: roomData.stream_url?.hls_pull_url_map ?? {},
    };

    return { isLive, roomData, streamUrls };
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误';
    console.error('[Douyin API] Error:', msg);
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
  try {
    const result = await fetchRoomInfo(webRid, cookie);
    return {
      isLive: result.isLive,
      title: result.roomData?.title ?? '',
      nickname: result.roomData?.owner?.nickname ?? '',
      viewerCount: result.roomData?.user_count ?? 0,
      avatar:
        result.roomData?.owner?.avatar_thumb?.url_list?.[0] ?? '',
    };
  } catch (error) {
    console.error('[checkLiveStatus] API failed, trying fallback:', error);
    // 尝试备用方法：直接访问直播页面
    return await checkLiveStatusFallback(webRid);
  }
}

/**
 * 备用方法：通过访问直播页面检测状态
 */
async function checkLiveStatusFallback(webRid: string): Promise<{
  isLive: boolean;
  title: string;
  nickname: string;
  viewerCount: number;
  avatar: string;
}> {
  try {
    const url = `${DOUYIN_LIVE_URL}/${webRid}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { isLive: false, title: '', nickname: '', viewerCount: 0, avatar: '' };
    }

    const html = await response.text();

    // 尝试从页面中提取房间信息
    // 查找 __NEXT_DATA__ 或 RENDER_DATA
    const renderDataMatch = html.match(/<script id="RENDER_DATA" type="application\/json">([^<]+)<\/script>/);
    if (renderDataMatch) {
      try {
        const decoded = decodeURIComponent(renderDataMatch[1]);
        const data = JSON.parse(decoded);
        // 遍历查找房间数据
        for (const key of Object.keys(data)) {
          const value = data[key];
          if (value?.roomInfo?.room) {
            const room = value.roomInfo.room;
            return {
              isLive: room.status === 2,
              title: room.title || '',
              nickname: room.owner?.nickname || '',
              viewerCount: room.user_count || 0,
              avatar: room.owner?.avatar_thumb?.url_list?.[0] || '',
            };
          }
        }
      } catch {
        // JSON 解析失败
      }
    }

    // 简单检测：页面中是否有 "直播中" 或 "replay" 相关标记
    const isLive = html.includes('"status":2') || html.includes('"isLive":true');
    return { isLive, title: '', nickname: '', viewerCount: 0, avatar: '' };
  } catch {
    return { isLive: false, title: '', nickname: '', viewerCount: 0, avatar: '' };
  }
}
