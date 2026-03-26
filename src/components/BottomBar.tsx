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
  const toggleMenu = useUIStore(s => s.toggleMenu);
  const deletePieceMode = useGameStore(s => s.deletePieceMode);
  const toggleDeletePieceMode = useGameStore(s => s.toggleDeletePieceMode);
  const confirmDelete = useGameStore(s => s.confirmDelete);
  const selectedForDelete = useGameStore(s => s.selectedForDelete);

  const canBack = canGoBack(historyState);
  const canForward = canGoForward(historyState);
  const isSetup = mode === 'analysis' && analysisStage === 'setup';

  return (
    <div className="bottom-bar">
      {/* Hamburger menu — from Символы SVG g4/g12: gray circle + 3 blue lines */}
      <button className="bar-btn menu-btn" onClick={toggleMenu} title="Меню">
        <svg viewBox="0 0 110 110" width="32" height="32">
          <circle cx="55" cy="55" r="50" fill="#999999" fillOpacity="1" stroke="#1f1203" strokeWidth="3.3"/>
          <line x1="22" y1="38" x2="88" y2="38" stroke="#0028fa" strokeWidth="6.7" strokeLinecap="butt"/>
          <line x1="22" y1="55" x2="88" y2="55" stroke="#0028fa" strokeWidth="6.7" strokeLinecap="butt"/>
          <line x1="22" y1="72" x2="88" y2="72" stroke="#0028fa" strokeWidth="6.7" strokeLinecap="butt"/>
        </svg>
      </button>

      {/* Two turn indicator lamps */}
      <div className="turn-lamps">
        <div className={`turn-lamp white ${turn === 'white' ? 'active' : ''}`} title="Белые" />
        <div className={`turn-lamp black ${turn === 'black' ? 'active' : ''}`} title="Чёрные" />
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

      <div className="spacer" />

      {/* Delete piece button — from Символы 2 SVG g23: blue rounded rect with piece silhouettes + X */}
      <button
        className={`bar-btn delete-btn ${deletePieceMode ? 'active' : ''}`}
        onClick={toggleDeletePieceMode}
        title="Удалить фигуру"
      >
        <svg viewBox="0 0 114 94" width="34" height="28">
          <rect x="2" y="2" width="110" height="90" rx="18" ry="18" fill="#00a5ff" stroke="#000" strokeWidth="3.6"/>
          {/* Black piece silhouette */}
          <g transform="translate(14,8) scale(0.55)">
            <path d="m 0,120 -18.4,-32.4 v-19.1 l 59.8,-0.1 v 20 l-17,31.6 z" fill="#000" stroke="#411b1a" strokeWidth="3.7"/>
            <path d="m 6.5,48.7 -10.2,19.2 28.5,0 -9.7,-19.2 z" fill="#000" stroke="#411b1a" strokeWidth="3.7"/>
            <path d="m 4.7,73.9 v 42.2" fill="none" stroke="#fffef7" strokeWidth="4.6"/>
          </g>
          {/* White piece silhouette */}
          <g transform="translate(48,8) scale(0.55)">
            <path d="m 0,118.1 -18.4,-32.4 v-19.1 l 59.8,-0.1 v 20 l-17,31.6 z" fill="#fff" stroke="#0a0a0a" strokeWidth="3.7"/>
            <path d="m 6.5,46.5 -10.3,19.2 28.5,0 -9.7,-19.2 h-8.5 z" fill="#fff" stroke="#0a0a0a" strokeWidth="3.7"/>
            <path d="m 4.7,71.6 v 42.2" fill="none" stroke="#000" strokeWidth="4.6"/>
          </g>
        </svg>
      </button>
      {deletePieceMode && selectedForDelete && (
        <button className="bar-btn confirm-btn" onClick={confirmDelete} title="Подтвердить удаление">✓</button>
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
