import { useState, useRef, useCallback, useEffect } from 'react';
import { Color } from '../types/chess';

export interface ClockState {
  whiteTime: number; // seconds remaining
  blackTime: number;
  running: boolean;
  activeSide: Color | null;
}

export function useChessClock(initialMinutes: number = 10) {
  const [whiteTime, setWhiteTime] = useState(initialMinutes * 60);
  const [blackTime, setBlackTime] = useState(initialMinutes * 60);
  const [running, setRunning] = useState(false);
  const [activeSide, setActiveSide] = useState<Color | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setActiveSide(null);
  }, []);

  const switchTo = useCallback((side: Color) => {
    setActiveSide(side);
    setRunning(true);
  }, []);

  const reset = useCallback((minutes: number) => {
    stop();
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
  }, [stop]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (running && activeSide) {
      intervalRef.current = setInterval(() => {
        if (activeSide === 'white') {
          setWhiteTime(t => Math.max(0, t - 1));
        } else {
          setBlackTime(t => Math.max(0, t - 1));
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, activeSide]);

  return { whiteTime, blackTime, running, activeSide, switchTo, stop, reset };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
