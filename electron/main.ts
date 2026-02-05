import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset', // Apple Native Aesthetic
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
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
