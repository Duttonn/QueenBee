import fs from 'fs';
import path from 'path';

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
  }
};

function log(level: string, message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
  const entry = `[${timestamp}] [${level}] ${message} ${formattedArgs}
`;
  
  console.log(entry.trim()); // Still show in terminal
  fs.appendFileSync(LOG_FILE, entry);
}
