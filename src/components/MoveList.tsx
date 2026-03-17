import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Move, PIECE_SHORT, squareNotation } from '../types/chess';
import './MoveList.css';

function formatMove(move: Move): string {
  const pieceShort = move.piece.kind === 'pawn' || move.piece.kind === 'veteran'
    ? (move.piece.kind === 'veteran' ? PIECE_SHORT.veteran : '')
    : PIECE_SHORT[move.piece.kind];

  const from = squareNotation(move.from.file, move.from.rank);
  const to = squareNotation(move.to.file, move.to.rank);
  const sep = move.captured ? ':' : '-';
  const promo = move.promotion ? PIECE_SHORT[move.promotion] : '';
  const exchange = move.scoutExchange ? '\u00F7' : '';

  return `${pieceShort} ${from}${exchange || sep}${to}${promo}`;
}

export const MoveList: React.FC = () => {
  const historyState = useGameStore(s => s.historyState);
  const listRef = useRef<HTMLDivElement>(null);

  const moves = historyState.history;
  const currentIndex = historyState.moveIndex;

  // Auto-scroll to current move
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('.move-active');
      if (active) {
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  if (moves.length === 0) {
    return (
      <div className="move-list">
        <div className="move-list-empty">Нет ходов</div>
      </div>
    );
  }

  // Group moves into pairs (white, black)
  const rows: { num: number; white: { move: Move; idx: number }; black?: { move: Move; idx: number } }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: { move: moves[i], idx: i },
      black: i + 1 < moves.length ? { move: moves[i + 1], idx: i + 1 } : undefined,
    });
  }

  return (
    <div className="move-list" ref={listRef}>
      {rows.map(row => (
        <div key={row.num} className="move-row">
          <span className="move-num">{row.num}.</span>
          <span className={`move-text ${row.white.idx === currentIndex ? 'move-active' : ''}`}>
            {formatMove(row.white.move)}
          </span>
          {row.black && (
            <span className={`move-text ${row.black.idx === currentIndex ? 'move-active' : ''}`}>
              {formatMove(row.black.move)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
