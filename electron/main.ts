import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import path from 'path';
import { NativeFSManager } from './NativeFSManager';

const nativeFS = new NativeFSManager();

function createWindow() {
  nativeFS.setupHandlers();

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset', // Apple Native Aesthetic
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
    : `file://${path.join(__dirname, '../dashboard/dist/index.html')}`;

  win.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Bridge for Native Features
ipcMain.on('get-native-context', (event) => {
  // Logic to get focused app on macOS for "Auto Context"
  event.reply('native-context-reply', { focusedApp: 'Xcode' });
});

// Native Notification Handler
ipcMain.on('notification:show', (event, { title, body }) => {
  new Notification({ title, body }).show();
});
