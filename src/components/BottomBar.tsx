import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { canGoBack, canGoForward } from '../logic/history';
import './BottomBar.css';

export const BottomBar: React.FC = () => {
  const historyState = useGameStore(s => s.historyState);
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const goToPreviousMove = useGameStore(s => s.goToPreviousMove);
  const goToNextMove = useGameStore(s => s.goToNextMove);
  const flipBoard = useGameStore(s => s.flipBoard);
  const toggleMenu = useUIStore(s => s.toggleMenu);

  const canBack = canGoBack(historyState);
  const canForward = canGoForward(historyState);
  const isSetup = mode === 'analysis' && analysisStage === 'setup';

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

      <div className="spacer" />

      <button
        className="toolbar-btn"
        onClick={flipBoard}
        title="Перевернуть доску (Реверс)"
      >
        🔄
      </button>

      <div className="resize-handle" title="Изменить размер">
        ⤡
      </div>
    </div>
  );
};
