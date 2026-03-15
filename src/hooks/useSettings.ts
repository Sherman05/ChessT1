import { useCallback } from 'react';

const STORAGE_KEY = 'chess-t1-settings';

interface Settings {
  skipIntro: boolean;
}

function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { skipIntro: false };
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

export function useSettings() {
  const setSkipIntro = useCallback((skip: boolean) => {
    const s = getSettings();
    s.skipIntro = skip;
    saveSettings(s);
  }, []);

  return { getSettings, setSkipIntro };
}
