import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { canGoBack, canGoForward } from '../logic/history';
import './BottomBar.css';

interface BottomBarProps {
  clockEnabled?: boolean;
  onToggleClock?: () => void;
  clockMinutes?: number;
  onSetClockMinutes?: (m: number) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  clockEnabled,
  onToggleClock,
  clockMinutes,
  onSetClockMinutes,
}) => {
  const historyState = useGameStore(s => s.historyState);
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const goToPreviousMove = useGameStore(s => s.goToPreviousMove);
  const goToNextMove = useGameStore(s => s.goToNextMove);
  const flipBoard = useGameStore(s => s.flipBoard);
  const offerDraw = useGameStore(s => s.offerDraw);
  const gameOver = useGameStore(s => s.gameOver);
  const toggleMenu = useUIStore(s => s.toggleMenu);

  const canBack = canGoBack(historyState);
  const canForward = canGoForward(historyState);
  const isSetup = mode === 'analysis' && analysisStage === 'setup';
  const isPlaying = !isSetup && !gameOver;

  return (
    <div className="bottom-bar">
      <button
        className="toolbar-btn"
        onClick={toggleMenu}
        title="Меню"
      >
        <svg viewBox="0 0 110 110" width="22" height="22">
          <circle cx="55" cy="55" r="50" fill="#b3b3b3" fillOpacity="0.39" stroke="#1f1203" strokeWidth="3.3"/>
          <line x1="27" y1="40" x2="83" y2="40" stroke="#0028fa" strokeWidth="6.7"/>
          <line x1="27" y1="55" x2="83" y2="55" stroke="#0028fa" strokeWidth="6.7"/>
          <line x1="27" y1="70" x2="83" y2="70" stroke="#0028fa" strokeWidth="6.7"/>
        </svg>
      </button>

      <button
        className="toolbar-btn"
        onClick={goToPreviousMove}
        disabled={!canBack || isSetup}
        title="Предыдущий ход"
        style={{ opacity: (!canBack || isSetup) ? 0.4 : 1 }}
      >
        ◀
      </button>

      <button
        className="toolbar-btn"
        onClick={goToNextMove}
        disabled={!canForward || isSetup}
        title="Следующий ход"
        style={{ opacity: (!canForward || isSetup) ? 0.4 : 1 }}
      >
        ▶
      </button>

      {isPlaying && (
        <button
          className="toolbar-btn draw-btn"
          onClick={offerDraw}
          title="Ничья по соглашению"
        >
          ½
        </button>
      )}

      {onToggleClock && (
        <button
          className={`toolbar-btn ${clockEnabled ? 'active' : ''}`}
          onClick={onToggleClock}
          title="Часы"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </button>
      )}

      {clockEnabled && onSetClockMinutes && (
        <select
          className="clock-select"
          value={clockMinutes}
          onChange={e => onSetClockMinutes(Number(e.target.value))}
          title="Время на партию"
        >
          <option value={5}>5 мин</option>
          <option value={10}>10 мин</option>
          <option value={15}>15 мин</option>
          <option value={30}>30 мин</option>
          <option value={60}>60 мин</option>
        </select>
      )}

      <div className="spacer" />

      <button
        className="toolbar-btn"
        onClick={flipBoard}
        title="Перевернуть доску (Реверс)"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </button>

      <div className="resize-handle" title="Изменить размер">
        ⤡
      </div>
    </div>
  );
};
