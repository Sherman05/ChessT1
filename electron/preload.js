const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.invoke('minimize'),
  close: () => ipcRenderer.invoke('close'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('set-always-on-top', value),
  isAlwaysOnTop: () => ipcRenderer.invoke('is-always-on-top'),
  createDesktopShortcut: () => ipcRenderer.invoke('create-desktop-shortcut'),
  checkDesktopShortcut: () => ipcRenderer.invoke('check-desktop-shortcut'),
  resizeWindow: (w, h) => ipcRenderer.invoke('resize-window', w, h),
  isElectron: true,
});
