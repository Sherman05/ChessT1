import React from 'react';
import { isCastleSquare } from '../types/chess';
import './Square.css';

interface SquareProps {
  file: number;
  rank: number;
  isHighlighted: boolean;
  isLastMove: boolean;
  isDragOver: boolean;
  children?: React.ReactNode;
}

export const Square: React.FC<SquareProps> = ({
  file,
  rank,
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

  // Double lines between rows 3-4 (rank 2 top border) and 5-6 (rank 5 bottom border)
  if (rank === 3) classes.push('double-line-top'); // top of rank 4 = between 3-4
  if (rank === 5) classes.push('double-line-bottom'); // bottom of rank 6 = between 5-6

  // Thicker center line between rows 4-5
  if (rank === 4) classes.push('center-line-top'); // top of rank 5 = between 4-5

  return (
    <div className={classes.join(' ')} data-file={file} data-rank={rank}>
      {children}
    </div>
  );
};
