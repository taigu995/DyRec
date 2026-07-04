import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}${dataStr}\n`;
}

function writeToFile(filePath: string, content: string): void {
  try {
    fs.appendFileSync(filePath, content, 'utf-8');
  } catch (err) {
    console.error('Failed to write log:', err);
  }
}

function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    module,
    message,
    data,
  };

  const formatted = formatLogEntry(entry);

  // Write to console
  switch (level) {
    case 'debug':
      console.debug(formatted.trim());
      break;
    case 'info':
      console.log(formatted.trim());
      break;
    case 'warn':
      console.warn(formatted.trim());
      break;
    case 'error':
      console.error(formatted.trim());
      break;
  }

  // Write to file
  writeToFile(LOG_FILE, formatted);

  // Write errors to separate error log
  if (level === 'error') {
    writeToFile(ERROR_LOG_FILE, formatted);
  }
}

export const logger = {
  debug: (module: string, message: string, data?: unknown) => {
    log('debug', module, message, data);
  },

  info: (module: string, message: string, data?: unknown) => {
    log('info', module, message, data);
  },

  warn: (module: string, message: string, data?: unknown) => {
    log('warn', module, message, data);
  },

  error: (module: string, message: string, data?: unknown) => {
    log('error', module, message, data);
  },

  // Get log file path
  getLogPath: (): string => LOG_FILE,
  getErrorLogPath: (): string => ERROR_LOG_FILE,

  // Read logs
  readLogs: (lines: number = 100, type: 'app' | 'error' = 'app'): string[] => {
    const filePath = type === 'error' ? ERROR_LOG_FILE : LOG_FILE;
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (err) {
      return [`Failed to read log file: ${err}`];
    }
  },

  // Clear logs
  clearLogs: (type: 'app' | 'error' | 'all' = 'all'): void => {
    try {
      if (type === 'app' || type === 'all') {
        fs.writeFileSync(LOG_FILE, '', 'utf-8');
      }
      if (type === 'error' || type === 'all') {
        fs.writeFileSync(ERROR_LOG_FILE, '', 'utf-8');
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  },

  // Get log file size
  getLogSize: (type: 'app' | 'error' = 'app'): number => {
    const filePath = type === 'error' ? ERROR_LOG_FILE : LOG_FILE;
    try {
      if (!fs.existsSync(filePath)) {
        return 0;
      }
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (err) {
      return 0;
    }
  },
};

// Global error handlers
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err: Error) => {
    logger.error('system', 'Uncaught exception', {
      message: err.message,
      stack: err.stack,
    });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('system', 'Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}

export default logger;
