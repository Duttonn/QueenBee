const { app, BrowserWindow, ipcMain, Notification, Menu, shell: electronShell, globalShortcut } = require('electron');
const path = require('path');
import { NativeFSManager } from './NativeFSManager';

const nativeFS = new NativeFSManager();
nativeFS.setupHandlers();

let mainWindow: any; 
let lastUrl: string | null = null; 
let authCache: any = null; // Store auth data if renderer isn't ready

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
  const template = [
    {
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
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
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

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', // Apple Native Aesthetic
    vibrancy: 'under-window', // Better macOS vibrancy
    visualEffectState: 'active',
    backgroundColor: '#00000000', // Transparent for vibrancy
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

  // Open DevTools automatically in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // In development, load from Vite dev server
  // In production, load from build/index.html
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

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

app.whenReady().then(() => {
  createWindow();

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
const logPath = path.resolve(__dirname, '..', '..', 'app.log');
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
