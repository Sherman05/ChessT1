import React, { forwardRef, useCallback } from 'react';
import { Square } from './Square';
import { PieceComponent } from './Piece';
import { BoardLabels } from './BoardLabels';
import { useGameStore } from '../store/gameStore';
import { useDragStore } from '../store/dragStore';
import { squareKey } from '../types/chess';
import './Board.css';

export const Board = forwardRef<HTMLDivElement>((_props, ref) => {
  const board = useGameStore(s => s.board);
  const turn = useGameStore(s => s.turn);
  const isFlipped = useGameStore(s => s.isFlipped);
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const lastMoveFrom = useGameStore(s => s.lastMoveFrom);
  const lastMoveTo = useGameStore(s => s.lastMoveTo);
  const promotionContext = useGameStore(s => s.promotionContext);

  const drag = useDragStore(s => s.drag);
  const startDrag = useDragStore(s => s.startDrag);

  const isSetup = mode === 'analysis' && analysisStage === 'setup';

  const handlePiecePointerDown = useCallback((
    piece: import('../types/chess').Piece,
    file: number,
    rank: number,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    if (promotionContext) return;
    if (!isSetup && piece.color !== turn) return;
    startDrag(piece, { file, rank }, e.clientX, e.clientY);
  }, [promotionContext, isSetup, turn, startDrag]);

  // Build grid cells
  const ranks = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const cells: React.ReactNode[] = [];
  for (const rank of ranks) {
    for (const file of files) {
      const key = squareKey(file, rank);
      const piece = board[key];
      const isLastMove = key === lastMoveFrom || key === lastMoveTo;
      const isDragOver = drag?.hoveredSquare?.file === file && drag?.hoveredSquare?.rank === rank;
      const isDragging = drag?.sourceSquare
        ? (drag.sourceSquare.file === file && drag.sourceSquare.rank === rank)
        : false;

      cells.push(
        <Square
          key={key}
          file={file}
          rank={rank}
          isFlipped={isFlipped}
          isHighlighted={false}
          isLastMove={isLastMove}
          isDragOver={isDragOver}
        >
          {piece && (
            <PieceComponent
              piece={piece}
              isDragging={isDragging}
              onPointerDown={(e: React.PointerEvent) => handlePiecePointerDown(piece, file, rank, e)}
            />
          )}
        </Square>
      );
    }
  }

  return (
    <div className="board-container">
      <div className="board-wrapper">
        <BoardLabels isFlipped={isFlipped} />
        <div
          ref={ref}
          className="board-grid"
          style={{ gridColumn: 2, gridRow: 1 }}
        >
          {cells}
        </div>
      </div>
    </div>
  );
});

Board.displayName = 'Board';
