const { app, BrowserWindow, ipcMain, Notification, Menu, shell: electronShell, globalShortcut } = require('electron');
const path = require('path');
const { spawn, execFile } = require('child_process');
import { NativeFSManager } from './NativeFSManager';

const nativeFS = new NativeFSManager();
nativeFS.setupHandlers();

let mainWindow: any; 
let lastUrl: string | null = null; 
let authCache: any = null; // Store auth data if renderer isn't ready
let nextProcess: any = null;
let socketProcess: any = null;

function pipeProcessLogs(proc: any, label: string) {
  if (!proc) return;
  proc.stdout?.on('data', (data: any) => console.log(`[${label}]`, data.toString().trim()));
  proc.stderr?.on('data', (data: any) => console.error(`[${label} Error]`, data.toString().trim()));
  proc.on('error', (err: any) => console.error(`[${label}] Failed to start:`, err));
}

// Copy bundled proxy-bridge to a writable location so Next.js can write cache/trace files.
// The app bundle (especially on a DMG mount or in /Applications) is read-only.
async function ensureWritableBackend(): Promise<string> {
  const fs = require('fs-extra');
  const bundledPath = path.join(process.resourcesPath, 'proxy-bridge');
  const writablePath = path.join(app.getPath('userData'), 'proxy-bridge');
  const versionFile = path.join(writablePath, '.version');
  const appVersion = app.getVersion();

  // Only re-copy when the app version changes (or on first run)
  let needsCopy = true;
  try {
    const existing = await fs.readFile(versionFile, 'utf-8');
    if (existing.trim() === appVersion) needsCopy = false;
  } catch { /* first run or missing */ }

  if (needsCopy) {
    console.log('[Main] Copying proxy-bridge to writable location:', writablePath);
    await fs.remove(writablePath);
    await fs.copy(bundledPath, writablePath, { overwrite: true });
    await fs.writeFile(versionFile, appVersion);
    console.log('[Main] Proxy-bridge copied successfully');
  } else {
    console.log('[Main] Proxy-bridge already up to date at:', writablePath);
  }

  return writablePath;
}

// Start bundled proxy-bridge backend
function startBackend(): Promise<void> {
  if (!app.isPackaged) {
    console.log('[Main] Development mode - expecting external backend');
    return Promise.resolve();
  }
  
  return ensureWritableBackend().then((backendPath) => {
    const nextCli = path.join(backendPath, 'node_modules', 'next', 'dist', 'bin', 'next');
    const tsxCli = path.join(backendPath, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    
    console.log('[Main] Starting bundled backend from:', backendPath);
    
    const homeDir = app.getPath('home');

    // Find a node binary for child processes.
    // On macOS: avoid using Electron binary inside .app bundle (causes extra Dock icon).
    // On Windows/Linux: system node avoids needing ELECTRON_RUN_AS_NODE.
    const childNodeExec = (() => {
      const fs = require('fs');
      const isWin = process.platform === 'win32';

      // 1. Try system node first
      if (isWin) {
        // On Windows, try common node locations
        const winCandidates = [
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
        ];
        for (const p of winCandidates) {
          try { fs.accessSync(p, fs.constants.X_OK); return { exec: p, env: {} as Record<string, string> }; } catch {}
        }
        try {
          const { execSync } = require('child_process');
          const p = execSync('where node', { encoding: 'utf-8' }).trim().split('\n')[0].trim();
          if (p) { fs.accessSync(p, fs.constants.X_OK); return { exec: p, env: {} as Record<string, string> }; }
        } catch {}
      } else {
        // macOS / Linux
        const candidates = ['/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node'];
        for (const p of candidates) {
          try { fs.accessSync(p, fs.constants.X_OK); return { exec: p, env: {} as Record<string, string> }; } catch {}
        }
        try {
          const { execSync } = require('child_process');
          const p = execSync('which node', { encoding: 'utf-8' }).trim();
          if (p) { fs.accessSync(p, fs.constants.X_OK); return { exec: p, env: {} as Record<string, string> }; }
        } catch {}
      }

      // 2. macOS only: symlink Electron binary outside .app bundle to hide Dock icon
      if (process.platform === 'darwin') {
        const symlinkPath = path.join(app.getPath('userData'), 'node');
        try {
          try { fs.unlinkSync(symlinkPath); } catch {}
          fs.symlinkSync(process.execPath, symlinkPath);
          fs.accessSync(symlinkPath, fs.constants.X_OK);
          return { exec: symlinkPath, env: { ELECTRON_RUN_AS_NODE: '1' } };
        } catch {}
      }

      // 3. Fallback to Electron binary as node
      return { exec: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' } };
    })();
    console.log('[Main] Child node binary:', childNodeExec.exec);

    // Load .env.local from the config dir (user may have placed secrets there)
    const configDir = path.join(homeDir, '.queenbee');
    const envLocalPath = path.join(configDir, '.env');
    let userEnv: Record<string, string> = {};
    try {
      const envContent = require('fs').readFileSync(envLocalPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          userEnv[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
        }
      }
      console.log('[Main] Loaded user env from:', envLocalPath, Object.keys(userEnv));
    } catch { /* no user env file, that's fine */ }

      const env: Record<string, string> = {
          ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)) as Record<string, string>,
          ...childNodeExec.env,
        HOME: homeDir,
        PORT: '3000',
        SOCKET_PORT: '3001',
        NODE_ENV: 'production',
        QUEENBEE_CONFIG_DIR: configDir,
        PROJECTS_ROOT: path.join(homeDir, 'QueenBee'),
        ELECTRON_NO_ATTACH_CONSOLE: '1',
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
        // User-provided secrets override everything
        ...userEnv,
      };
    
    const spawnOpts = {
      cwd: backendPath,
      stdio: ['ignore', 'pipe', 'pipe'] as any,
      env,
      windowsHide: true,  // Windows: don't show console window
    };

      // detached: true gives each child its own process group for clean shutdown (Unix only).
      // On Windows, detached opens a visible console; taskkill handles tree-kill instead.
      const isWin = process.platform === 'win32';
      const shellSpawn = (args: string[], label: string) => {
        const proc = spawn(childNodeExec.exec, args, { ...spawnOpts, ...(isWin ? {} : { detached: true }) });
      pipeProcessLogs(proc, label);
      return proc;
    };

    // 1. Start Next.js API server (port 3000)
    nextProcess = shellSpawn([nextCli, 'start', '-p', '3000'], 'Next.js');
    
    // 2. Start Socket.io server (port 3001)
    socketProcess = shellSpawn([tsxCli, 'server.ts'], 'Socket');
    
    console.log('[Main] Backend processes spawned, waiting for Next.js to be ready...');
    
    // Wait for Next.js to be ready (up to 15s)
    return new Promise<void>((resolve) => {
      const http = require('http');
      let attempts = 0;
      const maxAttempts = 30;
      const check = () => {
        attempts++;
        const req = http.get('http://127.0.0.1:3000/api/health', (res: any) => {
          if (res.statusCode === 200) {
            console.log('[Main] Backend ready after', attempts, 'checks');
            resolve();
          } else {
            retry();
          }
          res.resume();
        });
        req.on('error', retry);
        req.setTimeout(1000, () => { req.destroy(); retry(); });
      };
      const retry = () => {
        if (attempts >= maxAttempts) {
          console.warn('[Main] Backend did not become ready in time, continuing anyway');
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  });
}

// Stop backend when app quits
function stopBackend() {
  const killProc = (proc: any, label: string) => {
    if (!proc || proc.killed) return;
    try {
      if (process.platform === 'win32') {
        // Windows: use taskkill to kill process tree
        spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        // Unix: kill entire process group via negative PID
        process.kill(-proc.pid, 'SIGTERM');
      }
    } catch {
      try { proc.kill('SIGTERM'); } catch {}
    }
    console.log(`[Main] ${label} server stopped`);
  };
  killProc(nextProcess, 'Next.js');
  killProc(socketProcess, 'Socket');
}

function handleDeepLink(url: string) {
  if (!url) return;
  console.log('[Main] Handling deep link:', url);
  
  if (!mainWindow) {
    lastUrl = url;
    return;
  }

  // Parse URL: queenbee://auth/callback?auth_data=...
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.host === 'auth' && parsedUrl.pathname === '/callback') {
      const authDataParam = parsedUrl.searchParams.get('auth_data');
      if (authDataParam) {
        const data = JSON.parse(decodeURIComponent(authDataParam));
        
        // Basic validation: Ensure it looks like auth data
        if (!data.accessToken && !data.token && !data.code) {
          console.error('[Main] Malformed auth data in deep link');
          return;
        }

        authCache = data; // Cache it
        
        console.log('[Main] Sending auth success to renderer (with delay)');
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.webContents.send('GITHUB_AUTH_SUCCESS', data);
            mainWindow.show();
            mainWindow.focus();
          }
        }, 500);
      }
    }
  } catch (e) {
    console.error('[Main] Failed to parse deep link:', e);
  }
}

// macOS deep link listener
app.on('open-url', (event: any, url: string) => {
  event.preventDefault();
  handleDeepLink(url);
});

function createMenu() {
    const isMac = process.platform === 'darwin';

    const macAppMenu = isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : [];

    const template = [
      ...macAppMenu,
      {
        label: 'File',
        submenu: [
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
          { type: 'separator' },
          {
            label: 'Clear App Data & Restart',
            click: async () => {
              if (mainWindow) {
                await mainWindow.webContents.session.clearStorageData();
                app.relaunch();
                app.exit();
              }
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ] : [
            { role: 'close' }
          ])
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: async () => {
              await electronShell.openExternal('https://github.com/Duttonn/QueenBee');
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

function createWindow() {
  createMenu();

  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000',
    } : {
      backgroundColor: '#1a1a2e',
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // DEVELOPER SOLUTION: Mirror Renderer logs to Terminal
  mainWindow.webContents.on('console-message', (event: any, level: any, message: string, line: any, sourceId: any) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    console.log(`[Renderer-${levels[level] || 'LOG'}] ${message}`);
  });

  // Use app.isPackaged to determine the correct URL
  // In production, load from extraResources (not asar)
  const isPackaged = app.isPackaged;
  const startUrl = isPackaged
    ? `file://${path.join(process.resourcesPath, 'dashboard/dist/index.html')}`
    : 'http://localhost:5173';

  console.log('[Main] Loading URL:', startUrl, 'isPackaged:', isPackaged);

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    if (lastUrl) {
      handleDeepLink(lastUrl);
      lastUrl = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register Custom Protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('queenbee', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('queenbee');
}

// Windows / Linux: enforce single instance and handle deep links via argv
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event: any, argv: string[]) => {
    // On Windows, the deep link URL is passed as the last argv entry
    if (process.platform === 'win32' || process.platform === 'linux') {
      const url = argv.find((a: string) => a.startsWith('queenbee://'));
      if (url) handleDeepLink(url);
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  // Start bundled backend in production (when packaged)
  await startBackend();
  
  createWindow();

  // Windows/Linux: check initial argv for deep link
  if (process.platform !== 'darwin') {
    const url = process.argv.find((a: string) => a.startsWith('queenbee://'));
    if (url) handleDeepLink(url);
  }

  // Register Global Shortcut: Cmd+Option+B to toggle window
  globalShortcut.register('CommandOrControl+Alt+B', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  stopBackend();
});

// IPC Bridge for Native Features
ipcMain.on('get-native-context', (event: any) => {
  // Logic to get focused app on macOS for "Auto Context"
  event.reply('native-context-reply', { focusedApp: 'Xcode' });
});

// Native Notification Handler
ipcMain.on('notification:show', (event: any, { title, body }: { title: string, body: string }) => {
  new Notification({ title, body }).show();
});

// Native Direct Logger
const logPath = path.join(app.getPath('userData'), 'app.log');
const fs = require('fs-extra');
ipcMain.on('app:log', (event: any, { level, message }: { level: string, message: string }) => {
  const entry = `[${new Date().toISOString()}] [RENDERER-${level.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(logPath, entry);
});

// Auth Cache Pull Handler
ipcMain.handle('auth:get-cached', () => {
  const data = authCache;
  authCache = null; // Clear after pull
  return data;
});
