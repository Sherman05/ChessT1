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
  const offerDraw = useGameStore(s => s.offerDraw);
  const gameOver = useGameStore(s => s.gameOver);
  const toggleMenu = useUIStore(s => s.toggleMenu);
  const deletePieceMode = useGameStore(s => s.deletePieceMode);
  const toggleDeletePieceMode = useGameStore(s => s.toggleDeletePieceMode);
  const confirmDelete = useGameStore(s => s.confirmDelete);
  const selectedForDelete = useGameStore(s => s.selectedForDelete);

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

      <div className="spacer" />

      {/* C2a: Delete piece button in analysis setup mode */}
      {isSetup && (
        <>
          <button
            className={`toolbar-btn ${deletePieceMode ? 'active' : ''}`}
            onClick={toggleDeletePieceMode}
            title="Удалить фигуру"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
          {deletePieceMode && selectedForDelete && (
            <button
              className="toolbar-btn delete-confirm-btn"
              onClick={confirmDelete}
              title="Подтвердить удаление"
            >
              ✓
            </button>
          )}
        </>
      )}

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
