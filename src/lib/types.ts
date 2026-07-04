// ============================================================
// 抖音直播录制工具 - 类型定义
// ============================================================

/** 直播间信息 */
export interface LiveRoom {
  id: string;
  roomId: string;
  name: string;
  avatar: string;
  url: string;
  /** 直播状态 */
  status: 'live' | 'offline' | 'unknown';
  /** 是否启用自动录制 */
  autoRecord: boolean;
  /** 画质偏好 */
  quality: 'origin' | 'uhd' | 'hd' | 'sd';
  /** 添加时间 */
  createdAt: number;
  /** 最后检测时间 */
  lastCheckedAt: number | null;
  /** 直播标题 */
  title: string;
  /** 主播昵称 */
  nickname: string;
  /** 在线人数 */
  viewerCount: number;
}

/** 录制任务 */
export interface RecordingTask {
  id: string;
  roomId: string;
  roomName: string;
  /** 录制状态 */
  status: 'recording' | 'stopped' | 'error' | 'paused';
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  endedAt: number | null;
  /** 文件大小 (bytes) */
  fileSize: number;
  /** 输出文件路径 */
  outputPath: string;
  /** 输出格式 */
  format: 'ts' | 'flv' | 'mkv' | 'mp4';
  /** 画质 */
  quality: string;
  /** 错误信息 */
  errorMessage: string | null;
  /** 流地址 */
  streamUrl: string | null;
  /** 分段序号 */
  segmentIndex: number;
}

/** 录制历史 */
export interface RecordingHistory {
  id: string;
  roomId: string;
  roomName: string;
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  endedAt: number;
  /** 文件大小 */
  fileSize: number;
  /** 文件路径 */
  filePath: string;
  /** 时长 (秒) */
  duration: number;
  /** 格式 */
  format: string;
}

/** 应用设置 */
export interface AppSettings {
  /** 录制文件保存目录 */
  outputDir: string;
  /** FFmpeg 路径 */
  ffmpegPath: string;
  /** 默认画质 */
  defaultQuality: 'origin' | 'uhd' | 'hd' | 'sd';
  /** 默认格式 */
  defaultFormat: 'ts' | 'flv' | 'mkv' | 'mp4';
  /** 检测间隔 (秒) */
  checkInterval: number;
  /** 是否自动录制 */
  autoRecord: boolean;
  /** 分段录制 - 按时间(分钟), 0表示不分段 */
  segmentByTime: number;
  /** 分段录制 - 按大小(MB), 0表示不分段 */
  segmentBySize: number;
  /** Cookie 字符串 */
  cookie: string;
  /** 最大并发录制数 */
  maxConcurrent: number;
  /** 代理地址 */
  proxy: string;
}

/** 监控状态 */
export interface MonitorStatus {
  isRunning: boolean;
  lastCheckAt: number | null;
  totalRooms: number;
  liveRooms: number;
  recordingTasks: number;
}

/** API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 抖音直播间 API 数据 */
export interface DouyinRoomData {
  id_str: string;
  title: string;
  status: number;
  owner: {
    nickname: string;
    avatar_thumb: {
      url_list: string[];
    };
  };
  stream_url: {
    flv_pull_url: Record<string, string>;
    hls_pull_url_map: Record<string, string>;
    stream_orientation: number;
  } | null;
  user_count: number;
  cover: {
    url_list: string[];
  };
}

/** 抖音 API 响应 */
export interface DouyinApiResponse {
  data: {
    data: DouyinRoomData[];
  };
  status_code: number;
}
