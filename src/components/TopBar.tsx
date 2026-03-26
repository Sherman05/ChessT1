import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import './TopBar.css';

export const TopBar: React.FC = () => {
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const setInitialPosition = useGameStore(s => s.setInitialPosition);
  const loadInitialPositionInSetup = useGameStore(s => s.loadInitialPositionInSetup);
  const setMode = useGameStore(s => s.setMode);
  const confirmAnalysisSetup = useGameStore(s => s.confirmAnalysisSetup);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const isSetup = mode === 'analysis' && analysisStage === 'setup';

  const handleReset = () => {
    if (isSetup) {
      loadInitialPositionInSetup();
    } else {
      setInitialPosition();
    }
  };

  const handleAlwaysOnTop = () => {
    const newVal = !alwaysOnTop;
    setAlwaysOnTop(newVal);
    window.electronAPI?.setAlwaysOnTop(newVal);
  };

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      window.close();
    }
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button
          className="tab-btn reset-btn"
          onClick={handleReset}
          title="Начальная расстановка"
        >
          Начальная<br/>расстановка
        </button>

        <button
          className={`tab-btn ${mode === 'party' ? 'tab-active' : ''}`}
          onClick={() => setMode('party')}
        >
          Партия
        </button>

        <button
          className={`tab-btn ${mode === 'analysis' ? 'tab-active' : ''}`}
          onClick={() => setMode('analysis')}
        >
          Анализ
        </button>

        {isSetup && (
          <button
            className="tab-btn confirm-setup-btn"
            onClick={confirmAnalysisSetup}
            title="Начать игру"
          >
            ▶ Играть
          </button>
        )}
      </div>

      <div className="top-bar-right">
        <button className="window-btn" onClick={handleMinimize} title="Свернуть">─</button>
        <button className={`window-btn ${alwaysOnTop ? 'active' : ''}`} onClick={handleAlwaysOnTop} title="Поверх всех окон">📌</button>
        <button className="window-btn close-btn" onClick={handleClose} title="Закрыть">✕</button>
      </div>
    </div>
  );
};
