declare module 'douyin-danma-listener' {
  import { EventEmitter } from 'events';

  export interface ChatMessage {
    type: 'chat';
    data: {
      msgId: string;
      userId: string;
      nickname: string;
      content: string;
      timestamp: number;
    };
  }

  export interface GiftMessage {
    type: 'gift';
    data: {
      msgId: string;
      userId: string;
      nickname: string;
      giftId: number;
      giftName: string;
      giftCount: number;
      diamondCount: number;
      timestamp: number;
    };
  }

  export interface MemberMessage {
    type: 'member';
    data: {
      msgId: string;
      userId: string;
      nickname: string;
      timestamp: number;
    };
  }

  export interface LikeMessage {
    type: 'like';
    data: {
      msgId: string;
      userId: string;
      nickname: string;
      count: number;
      timestamp: number;
    };
  }

  export interface SocialMessage {
    type: 'social';
    data: {
      msgId: string;
      userId: string;
      nickname: string;
      timestamp: number;
    };
  }

  export type DanmaMessage = ChatMessage | GiftMessage | MemberMessage | LikeMessage | SocialMessage;

  export interface DouYinDanmaClientOptions {
    autoStart?: boolean;
    autoReconnect?: number;
    heartbeatInterval?: number;
    cookie?: string;
    timeoutInterval?: number;
    reconnectInterval?: number;
    host?: string;
  }

  export default class DouYinDanmaClient extends EventEmitter {
    constructor(roomId: string, options?: DouYinDanmaClientOptions);
    connect(): void;
    disconnect(): void;
    on(event: 'open', listener: () => void): this;
    on(event: 'close', listener: () => void): this;
    on(event: 'reconnect', listener: (count: number) => void): this;
    on(event: 'heartbeat', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'chat', listener: (message: ChatMessage) => void): this;
    on(event: 'member', listener: (message: MemberMessage) => void): this;
    on(event: 'like', listener: (message: LikeMessage) => void): this;
    on(event: 'social', listener: (message: SocialMessage) => void): this;
    on(event: 'gift', listener: (message: GiftMessage) => void): this;
    on(event: 'message', listener: (message: DanmaMessage) => void): this;
  }
}
