import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const setInitialPosition = useGameStore(s => s.setInitialPosition);
  const loadInitialPositionInSetup = useGameStore(s => s.loadInitialPositionInSetup);
  const setMode = useGameStore(s => s.setMode);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const isSetup = mode === 'analysis' && analysisStage === 'setup';

  const handleReset = () => {
    if (isSetup) {
      // Q17: Stay in analysis setup with initial position
      loadInitialPositionInSetup();
    } else {
      setInitialPosition();
    }
  };

  const handleAlwaysOnTop = () => {
    const newVal = !alwaysOnTop;
    setAlwaysOnTop(newVal);
    try {
      // @ts-expect-error Electron API
      window.electronAPI?.setAlwaysOnTop(newVal);
    } catch { /* browser - ignore */ }
  };

  return (
    <div className="top-bar">
      <button
        className="toolbar-btn"
        onClick={handleReset}
        title="Начальная расстановка"
      >
        ⟲
      </button>

      <button
        className="toolbar-btn kvetka-btn"
        title="К"
        style={{ fontWeight: 'bold', fontSize: '14px' }}
      >
        К
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
          try {
            // @ts-expect-error Electron API
            window.electronAPI?.minimize();
          } catch { /* browser - ignore */ }
        }}
        title="Свернуть"
      >
        ─
      </button>

      <button
        className={`toolbar-btn ${alwaysOnTop ? 'active' : ''}`}
        onClick={handleAlwaysOnTop}
        title="Поверх всех окон"
      >
        📌
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
