import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

export const logContext = new AsyncLocalStorage<{ requestId?: string }>();

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    log('INFO', message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    log('ERROR', message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    log('WARN', message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    log('DEBUG', message, ...args);
  },
  verbose: (message: string, ...args: any[]) => {
    log('VERBOSE', message, ...args);
  }
};

const REDACT_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /AKIA[0-9A-Z]{16}/g,
  /Bearer\s+[a-zA-Z0-9._\-]+/gi,
  /password\s*[=:]\s*\S+/gi,
  /secret\s*[=:]\s*\S+/gi,
  /token\s*[=:]\s*\S+/gi,
  /sk_live_[a-zA-Z0-9]{24,}/g,
  /GOCSPX-[a-zA-Z0-9_\-]+/g,
];

function redact(text: string): string {
  let result = text;
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

function log(level: string, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const context = logContext.getStore();
  const requestId = context?.requestId ? ` [${context.requestId}]` : '';
  
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Circular Object]';
      }
    }
    return String(arg);
  }).join(' ');

  const entry = redact(`[${timestamp}] [${level}]${requestId} ${message}\n${formattedArgs ? formattedArgs + '\n' : ''}`);
  
  // Terminal Colors
  const colors: Record<string, string> = {
    'INFO': '\x1b[36m', // Cyan
    'ERROR': '\x1b[31m', // Red
    'WARN': '\x1b[33m', // Yellow
    'DEBUG': '\x1b[90m', // Gray
    'VERBOSE': '\x1b[35m', // Magenta
  };
  const reset = '\x1b[0m';
  const color = colors[level] || reset;

  console.log(`${color}${entry.trim()}${reset}`); 
  fs.appendFileSync(LOG_FILE, entry + '---\n');
}
