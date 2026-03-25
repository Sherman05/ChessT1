import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useUIStore } from '../store/uiStore';
import { canGoBack, canGoForward } from '../logic/history';
import './BottomBar.css';

export const BottomBar: React.FC = () => {
  const historyState = useGameStore(s => s.historyState);
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const turn = useGameStore(s => s.turn);
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
      {/* Hamburger menu */}
      <button className="bar-btn menu-btn" onClick={toggleMenu} title="Меню">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <line x1="4" y1="7" x2="20" y2="7" stroke="#0040cc" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="4" y1="12" x2="20" y2="12" stroke="#0040cc" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="4" y1="17" x2="20" y2="17" stroke="#0040cc" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Turn indicator */}
      <div className="turn-dot-container">
        <div className={`turn-dot ${turn}`} />
      </div>

      {/* Navigation arrows */}
      <div className="nav-buttons">
        <button
          className="bar-btn nav-btn"
          onClick={goToPreviousMove}
          disabled={!canBack || isSetup}
          title="Назад"
        >
          ◀◀
        </button>
        <button
          className="bar-btn nav-btn"
          onClick={goToPreviousMove}
          disabled={!canBack || isSetup}
          title="Предыдущий ход"
        >
          ◀
        </button>
        <button
          className="bar-btn nav-btn"
          onClick={goToNextMove}
          disabled={!canForward || isSetup}
          title="Следующий ход"
        >
          ▶
        </button>
        <button
          className="bar-btn nav-btn"
          onClick={goToNextMove}
          disabled={!canForward || isSetup}
          title="Вперёд"
        >
          ▶▶
        </button>
      </div>

      {isPlaying && (
        <button className="bar-btn draw-btn" onClick={offerDraw} title="Ничья по соглашению">½</button>
      )}

      <div className="spacer" />

      {/* Delete piece button in analysis setup mode */}
      {isSetup && (
        <>
          <button
            className={`bar-btn ${deletePieceMode ? 'active' : ''}`}
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
            <button className="bar-btn confirm-btn" onClick={confirmDelete} title="Подтвердить удаление">✓</button>
          )}
        </>
      )}

      {/* Reverse button */}
      <button className="bar-btn reverse-btn" onClick={flipBoard} title="Реверс">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
        </svg>
      </button>
    </div>
  );
};
