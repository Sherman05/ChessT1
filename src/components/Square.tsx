import React from 'react';
import { isCastleSquare } from '../types/chess';
import './Square.css';

interface SquareProps {
  file: number;
  rank: number;
  isFlipped: boolean;
  isHighlighted: boolean;
  isLastMove: boolean;
  isDragOver: boolean;
  children?: React.ReactNode;
}

export const Square: React.FC<SquareProps> = ({
  file,
  rank,
  isFlipped,
  isHighlighted,
  isLastMove,
  isDragOver,
  children,
}) => {
  const isLight = (file + rank) % 2 === 1;
  const castle = isCastleSquare(file, rank);

  // Special line classes based on spec
  const classes = ['square'];

  if (castle) {
    classes.push('castle');
  } else if (isLight) {
    classes.push('light');
  } else {
    classes.push('dark');
  }

  if (isHighlighted) classes.push('highlighted');
  if (isLastMove) classes.push('last-move');
  if (isDragOver) classes.push('drag-over');

  // Special lines between горизонтали:
  // Double line between горизонтали 3-4 (rank 2/3 boundary)
  // Thick line between горизонтали 4-5 (rank 3/4 boundary)
  // Double line between горизонтали 5-6 (rank 4/5 boundary)
  //
  // When NOT flipped: higher ranks are at top, use border-bottom on higher rank
  // When flipped: lower ranks are at top, use border-bottom on lower rank
  if (!isFlipped) {
    if (rank === 3) classes.push('special-line-bottom', 'double-line'); // between горизонтали 3-4
    if (rank === 4) classes.push('special-line-bottom', 'thick-line');  // between горизонтали 4-5
    if (rank === 5) classes.push('special-line-bottom', 'double-line'); // between горизонтали 5-6
  } else {
    if (rank === 2) classes.push('special-line-bottom', 'double-line'); // between горизонтали 3-4
    if (rank === 3) classes.push('special-line-bottom', 'thick-line');  // between горизонтали 4-5
    if (rank === 4) classes.push('special-line-bottom', 'double-line'); // between горизонтали 5-6
  }

  return (
    <div className={classes.join(' ')} data-file={file} data-rank={rank}>
      {children}
    </div>
  );
};
