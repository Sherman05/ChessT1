// Type declarations for Electron preload API
interface ElectronAPI {
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  isAlwaysOnTop: () => Promise<boolean>;
  createDesktopShortcut: () => Promise<{ success: boolean; reason: string }>;
  checkDesktopShortcut: () => Promise<boolean>;
  resizeWindow: (w: number, h: number) => Promise<void>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
