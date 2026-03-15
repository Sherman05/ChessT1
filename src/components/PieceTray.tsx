import React from 'react';
import { PieceKind, Color, getPieceImagePath, PIECE_NAMES, ALL_PIECE_KINDS } from '../types/chess';
import { useGameStore } from '../store/gameStore';
import { useDragStore } from '../store/dragStore';
import { createPiece } from '../logic/board';
import './PieceTray.css';

interface PieceTrayProps {
  color: Color;
  side: 'left' | 'right';
  boardRef: React.RefObject<HTMLDivElement | null>;
}

export const PieceTray: React.FC<PieceTrayProps> = ({ color, side }) => {
  return (
    <div className="piece-tray">
      <div className="piece-tray-title">
        {color === 'white' ? 'Белые' : 'Чёрные'}
      </div>
      {ALL_PIECE_KINDS.map(kind => (
        <TrayPiece key={kind} kind={kind} color={color} />
      ))}
      {side === 'left' && <LeftControls />}
      {side === 'right' && <RightControls />}
    </div>
  );
};

const TrayPiece: React.FC<{ kind: PieceKind; color: Color }> = ({ kind, color }) => {
  const imgPath = getPieceImagePath(kind, color);
  const name = PIECE_NAMES[kind];
  const startDrag = useDragStore(s => s.startDrag);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const piece = createPiece(kind, color);
    startDrag(piece, null, e.clientX, e.clientY, { kind, color });
  };

  return (
    <div
      className="tray-piece"
      title={name}
      onPointerDown={handlePointerDown}
    >
      <img src={imgPath} alt={name} draggable={false} />
    </div>
  );
};

const LeftControls: React.FC = () => {
  const clearBoard = useGameStore(s => s.clearBoard);
  const confirmAnalysisSetup = useGameStore(s => s.confirmAnalysisSetup);

  return (
    <div className="analysis-controls">
      <button className="analysis-btn reset-btn" onClick={clearBoard} title="Сброс">
        ✕ Сброс
      </button>
      <button className="analysis-btn" onClick={confirmAnalysisSetup} title="Готово/Ok">
        ✓ Готово/Ok
      </button>
    </div>
  );
};

const RightControls: React.FC = () => {
  const analysisFirstMove = useGameStore(s => s.analysisFirstMove);
  const setAnalysisFirstMove = useGameStore(s => s.setAnalysisFirstMove);

  return (
    <div className="first-move-selector">
      <label>1-й ход</label>
      <div
        className="first-move-option"
        onClick={() => setAnalysisFirstMove('white')}
      >
        <div className="first-move-color-box white" />
        <span>Белые</span>
        <div className={`first-move-indicator ${analysisFirstMove === 'white' ? 'selected' : ''}`} />
      </div>
      <div
        className="first-move-option"
        onClick={() => setAnalysisFirstMove('black')}
      >
        <div className="first-move-color-box black" />
        <span>Чёрные</span>
        <div className={`first-move-indicator ${analysisFirstMove === 'black' ? 'selected' : ''}`} />
      </div>
    </div>
  );
};
