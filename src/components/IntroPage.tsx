import React from 'react';
import { useUIStore } from '../store/uiStore';
import './IntroPage.css';

export const IntroPage: React.FC = () => {
  const dismissIntro = useUIStore(s => s.dismissIntro);
  const dismissIntroForever = useUIStore(s => s.dismissIntroForever);

  return (
    <div className="intro-overlay">
      <div className="intro-page">
        <button className="intro-close-btn" onClick={dismissIntro} title="Закрыть">
          ✕
        </button>

        <h1>Как пользоваться программой ГИ Chess-T1</h1>

        <p>
          Добро пожаловать в графический интерфейс для игры Chess-T1!
          Эта программа позволяет двум игрокам играть в Chess-T1 на одном компьютере,
          а также анализировать позиции и партии.
        </p>

        <p>
          <strong>Режим «Партия»</strong> — начните игру с начальной расстановки фигур.
          Белые ходят первыми, затем ходы чередуются.
          Перетаскивайте фигуры мышкой (зажав левую кнопку) на нужную клетку.
        </p>

        <p>
          <strong>Режим «Анализ»</strong> — расставьте фигуры на доске из касс
          (наборов фигур) слева и справа, выберите очередь первого хода,
          нажмите «Готово/Ok» и анализируйте позицию.
        </p>

        <p>
          <strong>Кнопки управления:</strong><br />
          ⟲ — Начальная расстановка<br />
          ◀ / ▶ — Предыдущий / Следующий ход<br />
          🔄 — Перевернуть доску<br />
          ☰ — Меню (О программе, режимы, выход)
        </p>

        <p>
          <strong>Правила ходов:</strong><br />
          • Нельзя ходить на клетку со своей фигурой.<br />
          • Ход на клетку с фигурой противника — взятие.<br />
          • Кнехт (пешка) автоматически превращается в Вер-Кнехта (ветерана) на 6-й/3-й горизонтали.<br />
          • Вер-Кнехт и Принц могут превращаться на крайних горизонталях.
        </p>

        <p>
          Текст вводной страницы будет обновлен на завершающем этапе разработки.
        </p>

        <div className="intro-buttons">
          <button className="intro-btn primary" onClick={dismissIntro}>
            Пропустить
          </button>
          <button className="intro-btn secondary" onClick={dismissIntroForever}>
            Пропустить и не спрашивать больше
          </button>
        </div>
      </div>
    </div>
  );
};
