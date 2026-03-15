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
        ☰
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
