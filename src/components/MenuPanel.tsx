import React, { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGameStore } from '../store/gameStore';
import './MenuPanel.css';

export const MenuPanel: React.FC = () => {
  const closeMenu = useUIStore(s => s.closeMenu);
  const openIntro = useUIStore(s => s.openIntro);
  const setMode = useGameStore(s => s.setMode);
  const [shortcutExists, setShortcutExists] = useState(false);

  useEffect(() => {
    // Check if desktop shortcut already exists
    if (window.electronAPI) {
      window.electronAPI.checkDesktopShortcut().then(setShortcutExists);
    }
  }, []);

  const handleCreateShortcut = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.createDesktopShortcut();
      if (result.success) {
        setShortcutExists(true);
        closeMenu();
      } else {
        alert(result.reason || 'Не удалось создать ярлык');
        closeMenu();
      }
    } else {
      alert('Функция "Создать ярлык" доступна в десктопной версии приложения.');
      closeMenu();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    } else {
      window.close();
    }
  };

  return (
    <>
      <div className="menu-backdrop" onClick={closeMenu} />
      <div className="menu-panel">
        <div
          className="menu-item"
          onClick={() => { openIntro(); closeMenu(); }}
        >
          О программе
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
          className={`menu-item ${shortcutExists ? 'disabled' : ''}`}
          onClick={shortcutExists ? undefined : handleCreateShortcut}
        >
          Создать ярлык
        </div>

        <div
          className="menu-item"
          onClick={handleClose}
        >
          Выход
        </div>
      </div>
    </>
  );
};
