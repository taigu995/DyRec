// ============================================================
// 抖音直播 WebSocket 弹幕/礼物 连接服务
// 使用 douyin-danma-listener 库实现稳定的弹幕连接
// ============================================================

import { EventEmitter } from 'events';
import DouYinDanmaClient from 'douyin-danma-listener';

// 定义消息类型（与 douyin-danma-listener 的类型兼容）
interface ChatMessage {
  content: string;
  user: {
    nickname: string;
    id: string;
    displayId: string;
    secUserId: string;
    avatarThumb: { urlListList: string[] };
  };
  msgId: string;
  roomId: string;
  createTime: string;
}

interface GiftMessage {
  gift: {
    id: string;
    name: string;
    diamondCount: string;
    image: { urlListList: string[] };
  };
  comboCount: string;
  repeatCount: string;
  groupCount: string;
  totalCount: string;
  describe: string;
  toUser: unknown;
  user: {
    nickname: string;
    id: string;
    displayId: string;
    secUserId: string;
    avatarThumb: { urlListList: string[] };
  };
  msgId: string;
  roomId: string;
  createTime: string;
}

interface MemberMessage {
  user: {
    nickname: string;
    id: string;
    displayId: string;
    secUserId: string;
    avatarThumb: { urlListList: string[] };
  };
  memberCount: string;
  action: string;
  msgId: string;
  roomId: string;
  createTime: string;
}

interface LikeMessage {
  user: {
    nickname: string;
    id: string;
    displayId: string;
    secUserId: string;
    avatarThumb: { urlListList: string[] };
  };
  count: string;
  total: string;
  msgId: string;
  roomId: string;
  createTime: string;
}

interface SocialMessage {
  user: {
    nickname: string;
    id: string;
    displayId: string;
    secUserId: string;
    avatarThumb: { urlListList: string[] };
  };
  shareTarget: string;
  action: string;
  followCount: string;
  msgId: string;
  roomId: string;
  createTime: string;
}

/** 解析后的消息 */
export interface ParsedMessage {
  method: string;
  data: Record<string, unknown>;
}

/**
 * 抖音直播 WebSocket 客户端
 * 使用 douyin-danma-listener 库连接抖音直播间获取实时弹幕、礼物等消息
 */
export class DouyinWebSocketClient extends EventEmitter {
  private roomId: string;
  private client: DouYinDanmaClient | null = null;
  private _isConnected = false;
  private cookie: string;

  constructor(roomId: string, cookie = '') {
    super();
    this.roomId = roomId;
    this.cookie = cookie;
  }

  /**
   * 连接到抖音直播间 WebSocket
   */
  async connect(): Promise<void> {
    if (this.client) {
      this.disconnect();
    }

    try {
      // 获取内部房间 ID（douyin-danma-listener 需要 id_str 而非 web_rid）
      const internalRoomId = await this.fetchInternalRoomId(this.roomId);
      if (!internalRoomId) {
        throw new Error('无法获取房间 ID');
      }

      // 创建 douyin-danma-listener 客户端
      this.client = new DouYinDanmaClient(internalRoomId, {
        cookie: this.cookie || undefined,
        autoStart: false,
        autoReconnect: 3,
        heartbeatInterval: 10000,
        timeoutInterval: 30,
      });

      // 绑定事件
      this.setupEventHandlers();

      // 连接
      this.client.connect();
      this._isConnected = true;
    } catch (error) {
      this._isConnected = false;
      throw error;
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // 使用 any 类型绕过类型检查
    const client = this.client as any;

    // 连接成功
    client.on('open', () => {
      this._isConnected = true;
      this.emit('open');
    });

    // 连接关闭
    client.on('close', () => {
      this._isConnected = false;
      this.emit('close');
    });

    // 错误处理
    client.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // 重连
    client.on('reconnect', (count: number) => {
      this.emit('reconnect', count);
    });

    // 弹幕消息
    client.on('chat', (message: ChatMessage) => {
      this.emit('message', {
        method: 'WebcastChatMessage',
        data: {
          user: {
            id: message.user.id,
            nickname: message.user.nickname,
          },
          content: message.content,
        },
      });
    });

    // 礼物消息
    client.on('gift', (message: GiftMessage) => {
      this.emit('message', {
        method: 'WebcastGiftMessage',
        data: {
          user: {
            id: message.user.id,
            nickname: message.user.nickname,
          },
          gift: {
            name: message.gift?.name || '未知礼物',
            count: parseInt(String(message.totalCount)) || 1,
          },
        },
      });
    });

    // 进入房间消息
    client.on('member', (message: MemberMessage) => {
      this.emit('message', {
        method: 'WebcastMemberMessage',
        data: {
          user: {
            id: message.user.id,
            nickname: message.user.nickname,
          },
          action: message.action,
        },
      });
    });

    // 点赞消息
    client.on('like', (message: LikeMessage) => {
      this.emit('message', {
        method: 'WebcastLikeMessage',
        data: {
          user: {
            id: message.user.id,
            nickname: message.user.nickname,
          },
          count: message.count,
        },
      });
    });

    // 社交消息（关注等）
    client.on('social', (message: SocialMessage) => {
      this.emit('message', {
        method: 'WebcastSocialMessage',
        data: {
          user: {
            id: message.user.id,
            nickname: message.user.nickname,
          },
        },
      });
    });
  }

  /**
   * 获取内部房间 ID（id_str）
   * douyin-danma-listener 需要 id_str 而非 web_rid
   */
  private async fetchInternalRoomId(webRid: string): Promise<string | null> {
    try {
      const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&app_name=douyin_web&live_id=1&device_platform=web&language=zh-CN&enter_from=web_live&cookie_enabled=true&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=120.0.0.0&web_rid=${webRid}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      const data = await response.json() as {
        data?: { data?: Array<{ id_str?: string }> };
      };

      if (data.data?.data?.[0]?.id_str) {
        return data.data.data[0].id_str;
      }

      return null;
    } catch (error) {
      console.error('[DouyinWS] 获取房间 ID 失败:', error);
      return null;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.client) {
      this.client.removeAllListeners();
      this.client = null;
    }
    this._isConnected = false;
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this._isConnected;
  }
}

// ============================================================
// 客户端管理
// ============================================================

const clients = new Map<string, DouyinWebSocketClient>();

/**
 * 获取或创建 WebSocket 客户端
 */
export function getOrCreateDouyinWSClient(
  roomId: string,
  cookie = ''
): DouyinWebSocketClient {
  let client = clients.get(roomId);
  if (!client) {
    client = new DouyinWebSocketClient(roomId, cookie);
    clients.set(roomId, client);
  }
  return client;
}

/**
 * 移除 WebSocket 客户端
 */
export function removeDouyinWSClient(roomId: string): void {
  const client = clients.get(roomId);
  if (client) {
    client.disconnect();
    clients.delete(roomId);
  }
}

/**
 * 获取所有客户端
 */
export function getAllDouyinWSClients(): Map<string, DouyinWebSocketClient> {
  return clients;
}

export default DouyinWebSocketClient;
