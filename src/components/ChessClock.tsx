import React from 'react';
import { formatTime } from '../hooks/useChessClock';
import { Color } from '../types/chess';
import './ChessClock.css';

interface ChessClockProps {
  whiteTime: number;
  blackTime: number;
  activeSide: Color | null;
  isFlipped: boolean;
}

export const ChessClock: React.FC<ChessClockProps> = ({ whiteTime, blackTime, activeSide, isFlipped }) => {
  const topColor: Color = isFlipped ? 'white' : 'black';
  const bottomColor: Color = isFlipped ? 'black' : 'white';
  const topTime = topColor === 'white' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'white' ? whiteTime : blackTime;

  return (
    <div className="chess-clock">
      <div className={`clock-face ${activeSide === topColor ? 'clock-active' : ''} ${topTime <= 30 ? 'clock-low' : ''}`}>
        <span className="clock-label">{topColor === 'white' ? 'Белые' : 'Чёрные'}</span>
        <span className="clock-time">{formatTime(topTime)}</span>
      </div>
      <div className={`clock-face ${activeSide === bottomColor ? 'clock-active' : ''} ${bottomTime <= 30 ? 'clock-low' : ''}`}>
        <span className="clock-label">{bottomColor === 'white' ? 'Белые' : 'Чёрные'}</span>
        <span className="clock-time">{formatTime(bottomTime)}</span>
      </div>
    </div>
  );
};
