import React from 'react';
import { useUIStore } from '../store/uiStore';
import './IntroPage.css';

export const IntroPage: React.FC = () => {
  const dismissIntro = useUIStore(s => s.dismissIntro);
  const dismissIntroForever = useUIStore(s => s.dismissIntroForever);

  return (
    <div className="intro-overlay">
      <div className="intro-page">
        {/* Top bar with controls */}
        <div className="intro-top-bar">
          <button
            className="intro-main-btn"
            onClick={dismissIntro}
            title="Перейти в основной режим"
          >
            Основной режим
          </button>
          <div className="intro-top-spacer" />
          <button className="intro-window-btn" onClick={() => window.electronAPI?.minimize()} title="Свернуть">─</button>
          <button className="intro-window-btn" title="Поверх всех окон">📌</button>
          <button
            className="intro-window-btn"
            onClick={() => {
              if (window.electronAPI) {
                window.electronAPI.close();
              } else {
                window.close();
              }
            }}
            title="Закрыть программу"
          >
            ✕
          </button>
        </div>

        {/* Skip buttons */}
        <div className="intro-skip-bar">
          <button className="intro-skip-btn" onClick={dismissIntro}>
            Пропустить вводный текст и перейти в основной режим
          </button>
          <button className="intro-skip-btn" onClick={dismissIntroForever}>
            Пропустить и не спрашивать больше
          </button>
        </div>

        {/* Content area with scroll */}
        <div className="intro-content">
          <h2>Как пользоваться программой ГИ chess-T1</h2>
          <p className="intro-subtitle">(вводный текст)</p>

          <p>
            Настоящая программа ГИ chess-T1 (Графический интерфейс пользователя <strong>игры chess-T1</strong>)
            предоставляет возможность с помощью компьютера:
          </p>

          <p>
            (1) пользователю (пользователям) проводить анализ партий и позиций игры <strong>chess-T1</strong>.
          </p>

          <p>
            (2) двум пользователям играть между собой в игру <strong>chess-T1</strong>.
          </p>

          <p>
            Предполагается, что пользователи знают и соблюдают при использовании ГИ <strong>chess-T1</strong> правила игры.
          </p>

          <h3>Режим «Партия»</h3>
          <p>
            Два игрока по очереди делают ходы на одном компьютере. Белые ходят первыми.
            Перетащите фигуру мышкой на нужную клетку. Правильность ходов — на совести игроков.
          </p>

          <h3>Режим «Анализ»</h3>
          <p>
            Режим позволяет расставить произвольную позицию из касс фигур (слева — белые, справа — чёрные).
            Перетаскивайте фигуры из кассы на доску. После расстановки нажмите «Готово/Ok».
            Можно использовать кнопку «Начальная расстановка» для загрузки стандартной начальной позиции.
          </p>

          <h3>Навигация</h3>
          <p>
            Кнопки ◀ / ▶ позволяют перемещаться по истории ходов (назад / вперёд).
            При возврате назад и выполнении нового хода предыдущая ветка ходов удаляется.
          </p>

          <h3>Управление</h3>
          <p>
            ⟲ — Начальная расстановка | ◀ ▶ — Навигация | 🔄 — Перевернуть доску |
            ½ — Ничья по соглашению | ☰ — Меню
          </p>
        </div>

        {/* Resize handle */}
        <div className="intro-resize-handle">⤡</div>
      </div>
    </div>
  );
};
