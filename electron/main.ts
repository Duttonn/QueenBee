const { app, BrowserWindow, ipcMain, Notification, Menu, shell: electronShell, globalShortcut } = require('electron');
const path = require('path');
const { NativeFSManager } = require('./NativeFSManager');

const nativeFS = new NativeFSManager();
let mainWindow;

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
        { role: 'togglefullscreen' }
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
  nativeFS.setupHandlers();
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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // In development, load from Vite dev server
  // In production, load from build/index.html
  const startUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

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

export {}; // Treat as module
