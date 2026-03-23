const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 600,
    minHeight: 500,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Start maximized per TZ requirement (максимальный размер окна)
    show: false,
    frame: false, // Custom titlebar — we handle minimize/close/always-on-top ourselves
  });

  // Maximize on start
  mainWindow.maximize();
  mainWindow.show();

  // In production, load the built files; in dev, load from Vite dev server
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for window controls
ipcMain.handle('minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('set-always-on-top', (_event, value) => {
  if (mainWindow) mainWindow.setAlwaysOnTop(value);
});

ipcMain.handle('is-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : false;
});

// Desktop shortcut creation (A000 / menu item)
ipcMain.handle('create-desktop-shortcut', async () => {
  if (process.platform !== 'win32') {
    return { success: false, reason: 'Только для Windows' };
  }

  try {
    const desktopPath = path.join(app.getPath('desktop'), 'ГИ chess-T1.lnk');

    // Check if shortcut already exists
    if (fs.existsSync(desktopPath)) {
      return { success: false, reason: 'Ярлык уже существует' };
    }

    const success = shell.writeShortcutLink(desktopPath, 'create', {
      target: process.execPath,
      args: app.isPackaged ? '' : path.join(__dirname, '..'),
      description: 'ГИ chess-T1 — Графический интерфейс игры chess-T1',
      icon: process.execPath,
      iconIndex: 0,
    });

    return { success, reason: success ? '' : 'Не удалось создать ярлык' };
  } catch (err) {
    return { success: false, reason: String(err) };
  }
});

ipcMain.handle('check-desktop-shortcut', () => {
  if (process.platform !== 'win32') return false;
  const desktopPath = path.join(app.getPath('desktop'), 'ГИ chess-T1.lnk');
  return fs.existsSync(desktopPath);
});

// Resize window
ipcMain.handle('resize-window', (_event, width, height) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
});
