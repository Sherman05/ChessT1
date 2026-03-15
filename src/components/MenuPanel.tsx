import React from 'react';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import './MenuPanel.css';

export const MenuPanel: React.FC = () => {
  const closeMenu = useUIStore(s => s.closeMenu);
  const openIntro = useUIStore(s => s.openIntro);
  const setMode = useGameStore(s => s.setMode);

  return (
    <div className="menu-panel">
      <div className="menu-panel-header">
        <span>Меню</span>
        <button className="menu-panel-close" onClick={closeMenu}>✕</button>
      </div>

      <div
        className="menu-item"
        onClick={() => { openIntro(); closeMenu(); }}
      >
        О программе ГИ Chess-T1
      </div>

      <div
        className="menu-item"
        onClick={() => { setMode('party'); closeMenu(); }}
      >
        Партия
      </div>

      <div
        className="menu-item"
        onClick={() => { setMode('analysis'); closeMenu(); }}
      >
        Анализ
      </div>

      <div
        className="menu-item"
        onClick={() => {
          alert('Функция "Создать ярлык" доступна в десктопной версии приложения.');
          closeMenu();
        }}
      >
        Создать ярлык на рабочем столе
      </div>

      <div
        className="menu-item"
        onClick={() => {
          if (confirm('Выйти из программы?')) {
            window.close();
          }
        }}
      >
        Выход из программы
      </div>
    </div>
  );
};
