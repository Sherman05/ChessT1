import React from 'react';
import { Piece as PieceType, getPieceImagePath, PIECE_NAMES } from '../types/chess';
import './Piece.css';

interface PieceProps {
  piece: PieceType;
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

export const PieceComponent: React.FC<PieceProps> = ({ piece, isDragging, onPointerDown }) => {
  const imgPath = getPieceImagePath(piece.kind, piece.color);
  const name = PIECE_NAMES[piece.kind];

  return (
    <div
      className={`piece ${isDragging ? 'dragging' : ''}`}
      onPointerDown={onPointerDown}
      title={name}
    >
      <img src={imgPath} alt={name} draggable={false} />
    </div>
  );
};

interface FloatingPieceProps {
  piece: PieceType;
  x: number;
  y: number;
  size: number;
}

export const FloatingPiece: React.FC<FloatingPieceProps> = ({ piece, x, y, size }) => {
  const imgPath = getPieceImagePath(piece.kind, piece.color);

  return (
    <div
      className="floating-piece"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
      }}
    >
      <img src={imgPath} alt="" draggable={false} />
    </div>
  );
};
