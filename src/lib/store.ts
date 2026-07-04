import fs from 'node:fs';
import path from 'node:path';
import type {
  LiveRoom,
  RecordingTask,
  RecordingHistory,
  AppSettings,
} from './types';

// ============================================================
// JSON 文件存储 - 管理直播间、录制任务、设置等数据
// ============================================================

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch {
    // 文件损坏时返回默认值
  }
  return defaultValue;
}

function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---- 直播间管理 ----

const ROOMS_FILE = 'rooms.json';

export function getRooms(): LiveRoom[] {
  return readJsonFile<LiveRoom[]>(ROOMS_FILE, []);
}

export function saveRooms(rooms: LiveRoom[]): void {
  writeJsonFile(ROOMS_FILE, rooms);
}

export function addRoom(room: LiveRoom): LiveRoom[] {
  const rooms = getRooms();
  const exists = rooms.find((r) => r.roomId === room.roomId);
  if (exists) {
    throw new Error(`直播间 ${room.roomId} 已存在`);
  }
  rooms.push(room);
  saveRooms(rooms);
  return rooms;
}

export function removeRoom(roomId: string): LiveRoom[] {
  const rooms = getRooms();
  const filtered = rooms.filter((r) => r.roomId !== roomId);
  saveRooms(filtered);
  return filtered;
}

export function updateRoom(
  roomId: string,
  updates: Partial<LiveRoom>
): LiveRoom | null {
  const rooms = getRooms();
  const index = rooms.findIndex((r) => r.roomId === roomId);
  if (index === -1) return null;
  rooms[index] = { ...rooms[index], ...updates };
  saveRooms(rooms);
  return rooms[index];
}

// ---- 录制任务管理 ----

const TASKS_FILE = 'tasks.json';

export function getTasks(): RecordingTask[] {
  return readJsonFile<RecordingTask[]>(TASKS_FILE, []);
}

export function saveTasks(tasks: RecordingTask[]): void {
  writeJsonFile(TASKS_FILE, tasks);
}

export function addTask(task: RecordingTask): RecordingTask[] {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
  return tasks;
}

export function updateTask(
  taskId: string,
  updates: Partial<RecordingTask>
): RecordingTask | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates };
  saveTasks(tasks);
  return tasks[index];
}

export function removeTask(taskId: string): RecordingTask[] {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== taskId);
  saveTasks(filtered);
  return filtered;
}

// ---- 录制历史 ----

const HISTORY_FILE = 'history.json';

export function getHistory(): RecordingHistory[] {
  return readJsonFile<RecordingHistory[]>(HISTORY_FILE, []);
}

export function addHistory(record: RecordingHistory): RecordingHistory[] {
  const history = getHistory();
  history.unshift(record);
  // 只保留最近 500 条
  const trimmed = history.slice(0, 500);
  writeJsonFile(HISTORY_FILE, trimmed);
  return trimmed;
}

// ---- 设置 ----

const SETTINGS_FILE = 'settings.json';

export const DEFAULT_SETTINGS: AppSettings = {
  outputDir: './recordings',
  ffmpegPath: 'ffmpeg',
  defaultQuality: 'origin',
  defaultFormat: 'ts',
  checkInterval: 60,
  autoRecord: true,
  segmentByTime: 0,
  segmentBySize: 0,
  cookie: '',
  maxConcurrent: 3,
  proxy: '',
};

export function getSettings(): AppSettings {
  return readJsonFile<AppSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  writeJsonFile(SETTINGS_FILE, settings);
}

export function updateSettings(
  updates: Partial<AppSettings>
): AppSettings {
  const settings = { ...getSettings(), ...updates };
  saveSettings(settings);
  return settings;
}
