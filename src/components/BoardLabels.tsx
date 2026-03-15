import React from 'react';
import { fileToLetter, rankToNumber } from '../types/chess';

interface BoardLabelsProps {
  isFlipped: boolean;
}

export const BoardLabels: React.FC<BoardLabelsProps> = ({ isFlipped }) => {
  const files = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const ranks = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <>
      {/* File labels (bottom) */}
      <div className="board-labels-files">
        {files.map(f => (
          <div key={f} className="board-label">{fileToLetter(f)}</div>
        ))}
      </div>
      {/* Rank labels (left) */}
      <div className="board-labels-ranks">
        {ranks.map(r => (
          <div key={r} className="board-label">{rankToNumber(r)}</div>
        ))}
      </div>
    </>
  );
};
