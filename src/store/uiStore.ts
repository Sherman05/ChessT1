import { create } from 'zustand';

interface UIStoreState {
  showIntro: boolean;
  showMenu: boolean;
  neverShowIntro: boolean;

  // Actions
  dismissIntro: () => void;
  dismissIntroForever: () => void;
  openIntro: () => void;
  toggleMenu: () => void;
  closeMenu: () => void;
}

const STORAGE_KEY = 'chess-t1-skip-intro';

function getSkipIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const useUIStore = create<UIStoreState>((set) => ({
  showIntro: !getSkipIntro(),
  showMenu: false,
  neverShowIntro: getSkipIntro(),

  dismissIntro: () => {
    set({ showIntro: false });
  },

  dismissIntroForever: () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
    set({ showIntro: false, neverShowIntro: true });
  },

  openIntro: () => {
    set({ showIntro: true, showMenu: false });
  },

  toggleMenu: () => {
    set(state => ({ showMenu: !state.showMenu }));
  },

  closeMenu: () => {
    set({ showMenu: false });
  },
}));
