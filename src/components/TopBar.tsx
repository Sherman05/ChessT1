import React from 'react';
import { useGameStore } from '../store/gameStore';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const mode = useGameStore(s => s.mode);
  const setInitialPosition = useGameStore(s => s.setInitialPosition);
  const setMode = useGameStore(s => s.setMode);

  return (
    <div className="top-bar">
      <button
        className="toolbar-btn"
        onClick={setInitialPosition}
        title="Начальная расстановка"
      >
        ⟲
      </button>

      <button
        className={`toolbar-btn ${mode === 'party' ? 'active' : ''}`}
        onClick={() => setMode('party')}
        title="Партия"
      >
        ♟
      </button>

      <button
        className={`toolbar-btn ${mode === 'analysis' ? 'active' : ''}`}
        onClick={() => setMode('analysis')}
        title="Анализ"
      >
        🔍
      </button>

      <div className="spacer" />

      <button
        className="toolbar-btn"
        onClick={() => {
          // Minimize - works in Electron, hidden in browser
          if (typeof window !== 'undefined') {
            try {
              // @ts-expect-error Electron API
              window.electronAPI?.minimize();
            } catch { /* browser - ignore */ }
          }
        }}
        title="Свернуть"
      >
        ─
      </button>

      <button
        className="toolbar-btn"
        onClick={() => {
          if (confirm('Закрыть программу?')) {
            window.close();
          }
        }}
        title="Закрыть"
      >
        ✕
      </button>
    </div>
  );
};
