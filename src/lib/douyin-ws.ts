// ============================================================
// 抖音直播 WebSocket 弹幕/礼物 连接服务
// 通过 WebSocket 连接抖音直播间，实时获取弹幕、礼物等消息
// ============================================================

import { EventEmitter } from 'events';
import crypto from 'crypto';

// 消息类型常量
const MSG_METHODS = {
  CHAT: 'WebcastChatMessage',
  GIFT: 'WebcastGiftMessage',
  MEMBER: 'WebcastMemberMessage',
  LIKE: 'WebcastLikeMessage',
  SOCIAL: 'WebcastSocialMessage',
  ROOM_USER: 'WebcastRoomUserSeqMessage',
  CONTROL: 'WebcastControlMessage',
} as const;

/** 解析后的消息 */
export interface ParsedMessage {
  method: string;
  data: Record<string, unknown>;
}

/**
 * 抖音直播 WebSocket 客户端
 * 连接抖音直播间 WebSocket 获取实时弹幕、礼物等消息
 */
export class DouyinWebSocketClient extends EventEmitter {
  private roomId: string;
  private ws: import('ws').WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectCount = 0;
  private maxReconnect = 5;
  private _isConnected = false;
  private cookie: string;
  private roomIdInternal: string = '';

  constructor(roomId: string, cookie: string = '') {
    super();
    this.roomId = roomId;
    this.cookie = cookie;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 连接 WebSocket
   */
  async connect(): Promise<void> {
    if (this._isConnected) return;

    try {
      // 先获取内部 room_id
      await this.fetchInternalRoomId();

      const wsUrl = this.buildWsUrl();
      this.emit('status', 'connecting');

      const { default: WebSocket } = await import('ws');
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Cookie: this.cookie || '',
          Referer: 'https://live.douyin.com/',
        },
        handshakeTimeout: 10000,
      });

      this.ws.on('open', () => {
        this._isConnected = true;
        this.reconnectCount = 0;
        this.emit('status', 'connected');
        this.startHeartbeat();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this._isConnected = false;
        this.stopHeartbeat();
        this.emit('status', 'disconnected');
        this.emit('close', code, reason.toString());
        this.tryReconnect();
      });

      this.ws.on('error', (err: Error) => {
        this.emit('error', err.message);
        this._isConnected = false;
        this.stopHeartbeat();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      this.emit('error', `连接失败: ${msg}`);
      this.tryReconnect();
    }
  }

  /**
   * 获取内部 room_id (用于 WebSocket 连接)
   */
  private async fetchInternalRoomId(): Promise<void> {
    try {
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
        web_rid: this.roomId,
      });

      const response = await fetch(
        `https://live.douyin.com/webcast/room/web/enter/?${params.toString()}`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Cookie: this.cookie || '',
            Referer: 'https://live.douyin.com/',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      const json = (await response.json()) as {
        data?: { data?: Array<{ id_str: string; status: number }> };
        status_code: number;
      };

      if (json.data?.data?.[0]?.id_str) {
        this.roomIdInternal = json.data.data[0].id_str;
      } else {
        // 使用 web_rid 作为 fallback
        this.roomIdInternal = this.roomId;
      }
    } catch {
      this.roomIdInternal = this.roomId;
    }
  }

  /**
   * 构建 WebSocket URL
   */
  private buildWsUrl(): string {
    const signature = this.generateSignature(this.roomIdInternal);

    const params = new URLSearchParams({
      app_name: 'douyin_web',
      live_id: '1',
      device_platform: 'web',
      language: 'zh-CN',
      browser_language: 'zh-CN',
      browser_platform: 'Win32',
      browser_name: 'Chrome',
      browser_version: '120.0.0.0',
      aid: '6383',
      host: 'https://live.douyin.com',
      endpoint: 'live_pc',
      support_wrds: '1',
      user_unique_id: '',
      im_path: '/webcast/im/fetch/',
      identity: 'audience',
      room_id: this.roomIdInternal,
      signature,
      heartbeatDuration: '0',
      cursor: '',
      history: '',
      is_first_req: 'true',
      resp_content_type: 'protobuf',
    });

    return `wss://webcast5-ws-web-lf.douyin.com/webcast/im/push/v2/?${params.toString()}`;
  }

  /**
   * 生成签名 (MD5 of room_id)
   */
  private generateSignature(roomId: string): string {
    return crypto.createHash('md5').update(roomId).digest('hex');
  }

  /**
   * 处理 WebSocket 消息
   * 抖音使用 Protobuf 格式，这里尝试解析简化格式
   */
  private handleMessage(data: Buffer): void {
    try {
      // 尝试解析 protobuf 消息
      // PushFrame 结构: seqId(1), logId(2), service(3), method(4), headers(5), payloadEncoding(6), payloadType(7), payload(8)
      const parsed = this.parseProtobuf(data);
      if (parsed) {
        this.processMessages(parsed);
      }
    } catch {
      // 解析失败时忽略，可能是心跳响应
    }
  }

  /**
   * 简化版 Protobuf 解析
   * 提取关键字段用于消息分发
   */
  private parseProtobuf(data: Buffer): ParsedMessage | null {
    try {
      // 简单的 protobuf wire format 解析
      let offset = 0;
      const fields: Map<number, { wireType: number; value: Buffer | number }> =
        new Map();

      while (offset < data.length) {
        const tagByte = data[offset];
        const fieldNumber = tagByte >> 3;
        const wireType = tagByte & 0x7;
        offset++;

        if (wireType === 0) {
          // Varint
          let value = 0;
          let shift = 0;
          while (offset < data.length) {
            const byte = data[offset];
            offset++;
            value |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
          }
          fields.set(fieldNumber, { wireType, value });
        } else if (wireType === 2) {
          // Length-delimited
          let length = 0;
          let shift = 0;
          while (offset < data.length) {
            const byte = data[offset];
            offset++;
            length |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
          }
          const value = data.subarray(offset, offset + length);
          offset += length;
          fields.set(fieldNumber, { wireType, value });
        } else {
          break;
        }
      }

      // 提取 payload (field 8)
      const payloadField = fields.get(8);
      if (!payloadField || !Buffer.isBuffer(payloadField.value)) return null;

      const payload = payloadField.value as Buffer;

      // 解析 Response 结构
      // messagesList(1), cursor(2), fetchInterval(3), now(4), needAck(9)
      const messages = this.parseResponseMessages(payload);
      if (messages.length > 0) {
        return messages[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 解析 Response 中的消息列表
   */
  private parseResponseMessages(payload: Buffer): ParsedMessage[] {
    const messages: ParsedMessage[] = [];
    let offset = 0;

    while (offset < payload.length) {
      if (offset >= payload.length) break;

      const tagByte = payload[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2 && fieldNumber === 1) {
        // Message 结构
        let length = 0;
        let shift = 0;
        while (offset < payload.length) {
          const byte = payload[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }

        const msgData = payload.subarray(offset, offset + length);
        offset += length;

        const parsed = this.parseInnerMessage(msgData);
        if (parsed) {
          messages.push(parsed);
        }
      } else if (wireType === 0) {
        // Varint - skip
        while (offset < payload.length) {
          const byte = payload[offset];
          offset++;
          if ((byte & 0x80) === 0) break;
        }
      } else if (wireType === 2) {
        // Length-delimited - skip
        let length = 0;
        let shift = 0;
        while (offset < payload.length) {
          const byte = payload[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        offset += length;
      } else {
        break;
      }
    }

    return messages;
  }

  /**
   * 解析内部 Message 结构
   */
  private parseInnerMessage(data: Buffer): ParsedMessage | null {
    try {
      let offset = 0;
      let method = '';
      let msgPayload: Buffer | null = null;

      while (offset < data.length) {
        const tagByte = data[offset];
        const fieldNumber = tagByte >> 3;
        const wireType = tagByte & 0x7;
        offset++;

        if (wireType === 2) {
          let length = 0;
          let shift = 0;
          while (offset < data.length) {
            const byte = data[offset];
            offset++;
            length |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
          }
          const value = data.subarray(offset, offset + length);
          offset += length;

          if (fieldNumber === 1) {
            // method (string)
            method = value.toString('utf-8');
          } else if (fieldNumber === 2) {
            // payload (bytes)
            msgPayload = value;
          }
        } else if (wireType === 0) {
          while (offset < data.length) {
            const byte = data[offset];
            offset++;
            if ((byte & 0x80) === 0) break;
          }
        } else {
          break;
        }
      }

      if (method && msgPayload) {
        const parsedData = this.parseMessagePayload(method, msgPayload);
        return { method, data: parsedData };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 解析具体消息的 payload
   */
  private parseMessagePayload(
    method: string,
    data: Buffer
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    try {
      switch (method) {
        case MSG_METHODS.CHAT:
          this.parseChatMessage(data, result);
          break;
        case MSG_METHODS.GIFT:
          this.parseGiftMessage(data, result);
          break;
        case MSG_METHODS.MEMBER:
          this.parseMemberMessage(data, result);
          break;
        case MSG_METHODS.LIKE:
          this.parseLikeMessage(data, result);
          break;
        default:
          break;
      }
    } catch {
      // 解析失败
    }

    return result;
  }

  /**
   * 解析弹幕消息
   */
  private parseChatMessage(
    data: Buffer,
    result: Record<string, unknown>
  ): void {
    let offset = 0;
    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 2) {
          // User 结构
          const user = this.parseUser(value);
          result.user = user;
        } else if (fieldNumber === 3) {
          // content
          result.content = value.toString('utf-8');
        }
      } else if (wireType === 0) {
        let value = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          value |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
      } else {
        break;
      }
    }
  }

  /**
   * 解析礼物消息
   */
  private parseGiftMessage(
    data: Buffer,
    result: Record<string, unknown>
  ): void {
    let offset = 0;
    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 7) {
          result.user = this.parseUser(value);
        } else if (fieldNumber === 15) {
          result.gift = this.parseGift(value);
        }
      } else if (wireType === 0) {
        let value = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          value |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        if (fieldNumber === 6) result.comboCount = value;
        if (fieldNumber === 8) result.repeatCount = value;
      } else {
        break;
      }
    }
  }

  /**
   * 解析进场消息
   */
  private parseMemberMessage(
    data: Buffer,
    result: Record<string, unknown>
  ): void {
    let offset = 0;
    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 2) {
          result.user = this.parseUser(value);
        }
      } else if (wireType === 0) {
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          if ((byte & 0x80) === 0) break;
        }
      } else {
        break;
      }
    }
  }

  /**
   * 解析点赞消息
   */
  private parseLikeMessage(
    data: Buffer,
    result: Record<string, unknown>
  ): void {
    let offset = 0;
    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 5) {
          result.user = this.parseUser(value);
        }
      } else if (wireType === 0) {
        let value = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          value |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        if (fieldNumber === 1) result.count = value;
      } else {
        break;
      }
    }
  }

  /**
   * 解析 User 结构
   */
  private parseUser(data: Buffer): Record<string, unknown> {
    const user: Record<string, unknown> = {};
    let offset = 0;

    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 0) {
        let value = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          value |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        if (fieldNumber === 1) user.id = value;
        if (fieldNumber === 3) user.gender = value;
      } else if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 2 || fieldNumber === 4) {
          // shortId or displayId
          const str = value.toString('utf-8');
          if (str) user[fieldNumber === 2 ? 'shortId' : 'displayId'] = str;
        } else if (fieldNumber === 3) {
          user.nickname = value.toString('utf-8');
        } else if (fieldNumber === 9) {
          // avatar_thumb
          user.avatar = this.parseAvatarUrl(value);
        }
      } else {
        break;
      }
    }

    return user;
  }

  /**
   * 解析头像 URL
   */
  private parseAvatarUrl(data: Buffer): string {
    let offset = 0;
    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 1) {
          // url_list 的第一个
          const url = value.toString('utf-8');
          if (url) return url;
        }
      } else if (wireType === 0) {
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          if ((byte & 0x80) === 0) break;
        }
      } else {
        break;
      }
    }
    return '';
  }

  /**
   * 解析 Gift 结构
   */
  private parseGift(data: Buffer): Record<string, unknown> {
    const gift: Record<string, unknown> = {};
    let offset = 0;

    while (offset < data.length) {
      const tagByte = data[offset];
      const fieldNumber = tagByte >> 3;
      const wireType = tagByte & 0x7;
      offset++;

      if (wireType === 0) {
        let value = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          value |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        if (fieldNumber === 5) gift.diamondCount = value;
      } else if (wireType === 2) {
        let length = 0;
        let shift = 0;
        while (offset < data.length) {
          const byte = data[offset];
          offset++;
          length |= (byte & 0x7f) << shift;
          if ((byte & 0x80) === 0) break;
          shift += 7;
        }
        const value = data.subarray(offset, offset + length);
        offset += length;

        if (fieldNumber === 1) gift.name = value.toString('utf-8');
        if (fieldNumber === 2) gift.icon = this.parseAvatarUrl(value);
      } else {
        break;
      }
    }

    return gift;
  }

  /**
   * 处理解析后的消息
   */
  private processMessages(msg: ParsedMessage): void {
    const { method, data } = msg;

    switch (method) {
      case MSG_METHODS.CHAT: {
        const user = data.user as Record<string, unknown> | undefined;
        this.emit('message', {
          type: 'chat',
          nickname: (user?.nickname as string) || '未知用户',
          avatar: (user?.avatar as string) || '',
          content: (data.content as string) || '',
          timestamp: Date.now(),
        });
        break;
      }
      case MSG_METHODS.GIFT: {
        const user = data.user as Record<string, unknown> | undefined;
        const gift = data.gift as Record<string, unknown> | undefined;
        this.emit('message', {
          type: 'gift',
          nickname: (user?.nickname as string) || '未知用户',
          avatar: (user?.avatar as string) || '',
          giftName: (gift?.name as string) || '礼物',
          giftIcon: (gift?.icon as string) || '',
          count: (data.repeatCount as number) || (data.comboCount as number) || 1,
          diamondCount: (gift?.diamondCount as number) || 0,
          combo: ((data.comboCount as number) || 0) > 1,
          timestamp: Date.now(),
        });
        break;
      }
      case MSG_METHODS.MEMBER: {
        const user = data.user as Record<string, unknown> | undefined;
        this.emit('message', {
          type: 'enter',
          nickname: (user?.nickname as string) || '未知用户',
          avatar: (user?.avatar as string) || '',
          timestamp: Date.now(),
        });
        break;
      }
      case MSG_METHODS.LIKE: {
        const user = data.user as Record<string, unknown> | undefined;
        this.emit('message', {
          type: 'like',
          nickname: (user?.nickname as string) || '未知用户',
          count: (data.count as number) || 1,
          timestamp: Date.now(),
        });
        break;
      }
      default:
        break;
    }
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this._isConnected) {
        // 发送 ping 帧 (protobuf 编码的简单心跳)
        const ping = Buffer.from([0x3a, 0x02, 0x68, 0x62]); // "hb" in protobuf
        try {
          this.ws.send(ping);
        } catch {
          // ignore
        }
      }
    }, 10000);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 尝试重连
   */
  private tryReconnect(): void {
    if (this.reconnectCount >= this.maxReconnect) {
      this.emit('status', 'error');
      return;
    }

    this.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000);

    this.reconnectTimer = setTimeout(() => {
      this.emit('reconnecting', this.reconnectCount);
      this.connect();
    }, delay);
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this._isConnected = false;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.maxReconnect = 0; // 阻止重连

    if (this.ws) {
      try {
        this.ws.close(1000, 'client disconnect');
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.emit('status', 'disconnected');
  }
}

// 全局连接管理器
const clients = new Map<string, DouyinWebSocketClient>();

/**
 * 获取或创建 WebSocket 客户端
 */
export function getOrCreateClient(
  roomId: string,
  cookie: string = ''
): DouyinWebSocketClient {
  const existing = clients.get(roomId);
  if (existing && existing.isConnected) {
    return existing;
  }

  const client = new DouyinWebSocketClient(roomId, cookie);
  clients.set(roomId, client);
  return client;
}

/**
 * 移除客户端
 */
export function removeClient(roomId: string): void {
  const client = clients.get(roomId);
  if (client) {
    client.disconnect();
    clients.delete(roomId);
  }
}

/**
 * 获取所有客户端状态
 */
export function getAllClientStatus(): Record<
  string,
  { connected: boolean }
> {
  const status: Record<string, { connected: boolean }> = {};
  for (const [roomId, client] of clients) {
    status[roomId] = { connected: client.isConnected };
  }
  return status;
}
