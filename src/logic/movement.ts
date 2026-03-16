import { Piece, PieceKind, Color, Square, squareKey } from '../types/chess';
import { BoardMap } from './board';

function inBounds(f: number, r: number): boolean {
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

/**
 * Get all squares a piece can potentially reach based on its movement pattern.
 * Does NOT apply castle restrictions or capture force checks.
 * Blocked by pieces for non-jumping lines (the blocking piece's square IS included).
 */
export function getMovementSquares(board: BoardMap, piece: Piece, file: number, rank: number): Square[] {
  switch (piece.kind) {
    case 'king': return getKingSquares(file, rank);
    case 'pawn':
    case 'veteran': return getPawnSquares(board, piece.color, file, rank);
    case 'knight': return getRitterSquares(file, rank);
    case 'prince': return getPrinceSquares(board, file, rank);
    case 'rook': return getConnetSquares(board, file, rank);
    case 'bishop': return getScoutSquares(file, rank);
    default: return [];
  }
}

/** King: 1 square in any direction (all 8 neighbors) */
function getKingSquares(file: number, rank: number): Square[] {
  const squares: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = file + df, r = rank + dr;
      if (inBounds(f, r)) squares.push({ file: f, rank: r });
    }
  }
  return squares;
}

/**
 * Pawn / Veteran: 1 sideways (left/right), 1 forward, 1 backward.
 * On own territory: also 2 forward (no jumping — intermediate must be empty).
 * White territory: ranks 0-3. Black territory: ranks 4-7.
 * Forward: white=+rank, black=-rank.
 */
function getPawnSquares(board: BoardMap, color: Color, file: number, rank: number): Square[] {
  const squares: Square[] = [];
  const fwd = color === 'white' ? 1 : -1;
  const onOwnTerritory = color === 'white' ? rank <= 3 : rank >= 4;

  // 1 left
  if (inBounds(file - 1, rank)) squares.push({ file: file - 1, rank });
  // 1 right
  if (inBounds(file + 1, rank)) squares.push({ file: file + 1, rank });
  // 1 forward
  if (inBounds(file, rank + fwd)) squares.push({ file, rank: rank + fwd });
  // 1 backward
  if (inBounds(file, rank - fwd)) squares.push({ file, rank: rank - fwd });

  // 2 forward on own territory (no jumping)
  if (onOwnTerritory) {
    const midRank = rank + fwd;
    const destRank = rank + fwd * 2;
    if (inBounds(file, destRank)) {
      const midKey = squareKey(file, midRank);
      if (!board[midKey]) {
        squares.push({ file, rank: destRank });
      }
    }
  }

  return squares;
}

/** Ritter (knight): 1-2 squares horizontally/vertically, JUMPS (ignores pieces in between) */
function getRitterSquares(file: number, rank: number): Square[] {
  const squares: Square[] = [];
  const offsets = [
    [1, 0], [2, 0], [-1, 0], [-2, 0],
    [0, 1], [0, 2], [0, -1], [0, -2],
  ];
  for (const [df, dr] of offsets) {
    const f = file + df, r = rank + dr;
    if (inBounds(f, r)) squares.push({ file: f, rank: r });
  }
  return squares;
}

/**
 * Prince: 1 square horizontally/vertically + 1-3 squares diagonally (no jumping).
 * Diagonal lines are blocked by pieces (blocking piece's square included, beyond excluded).
 */
function getPrinceSquares(board: BoardMap, file: number, rank: number): Square[] {
  const squares: Square[] = [];

  // 1 h/v
  const hvOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [df, dr] of hvOffsets) {
    const f = file + df, r = rank + dr;
    if (inBounds(f, r)) squares.push({ file: f, rank: r });
  }

  // 1-3 diagonal, no jumping
  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [df, dr] of diagDirs) {
    for (let dist = 1; dist <= 3; dist++) {
      const f = file + df * dist, r = rank + dr * dist;
      if (!inBounds(f, r)) break;
      squares.push({ file: f, rank: r });
      // Blocked by any piece
      if (board[squareKey(f, r)]) break;
    }
  }

  return squares;
}

/**
 * Connet (rook): 1-2 h/v (JUMPS) + 1-3 diagonal (no jumping).
 */
function getConnetSquares(board: BoardMap, file: number, rank: number): Square[] {
  const squares: Square[] = [];

  // 1-2 h/v, jumping
  const hvOffsets = [
    [1, 0], [2, 0], [-1, 0], [-2, 0],
    [0, 1], [0, 2], [0, -1], [0, -2],
  ];
  for (const [df, dr] of hvOffsets) {
    const f = file + df, r = rank + dr;
    if (inBounds(f, r)) squares.push({ file: f, rank: r });
  }

  // 1-3 diagonal, no jumping
  const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [df, dr] of diagDirs) {
    for (let dist = 1; dist <= 3; dist++) {
      const f = file + df * dist, r = rank + dr * dist;
      if (!inBounds(f, r)) break;
      squares.push({ file: f, rank: r });
      if (board[squareKey(f, r)]) break;
    }
  }

  return squares;
}

/** Scout (bishop): L-shaped move like chess knight, JUMPS */
function getScoutSquares(file: number, rank: number): Square[] {
  const squares: Square[] = [];
  const jumps = [
    [1, 2], [2, 1], [-1, 2], [-2, 1],
    [1, -2], [2, -1], [-1, -2], [-2, -1],
  ];
  for (const [df, dr] of jumps) {
    const f = file + df, r = rank + dr;
    if (inBounds(f, r)) squares.push({ file: f, rank: r });
  }
  return squares;
}
