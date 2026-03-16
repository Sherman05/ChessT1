import { Piece, PieceKind, Color, squareKey } from '../types/chess';

let pieceIdCounter = 0;

export function createPiece(kind: PieceKind, color: Color): Piece {
  return { kind, color, id: `${color[0]}-${kind}-${pieceIdCounter++}` };
}

export function resetPieceCounter(): void {
  pieceIdCounter = 0;
}

export type BoardMap = Record<string, Piece>;

/**
 * Chess-T1 initial setup:
 * Back row: Ritter-Scout-Prince-Connet-King-Prince-Scout-Ritter
 *           knight-bishop-prince-rook-king-prince-bishop-knight
 * Front row: 8 Knechts (pawns)
 */
export function createInitialBoard(): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};

  const backRow: PieceKind[] = ['knight', 'bishop', 'prince', 'rook', 'king', 'prince', 'bishop', 'knight'];

  // White pieces - rank 0 (row 1)
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 0)] = createPiece(backRow[file], 'white');
  }
  // White pawns - rank 1 (row 2)
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 1)] = createPiece('pawn', 'white');
  }

  // Black pieces - rank 7 (row 8)
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 7)] = createPiece(backRow[file], 'black');
  }
  // Black pawns - rank 6 (row 7)
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 6)] = createPiece('pawn', 'black');
  }

  return board;
}

export function createEmptyBoard(): BoardMap {
  return {};
}

export function cloneBoard(board: BoardMap): BoardMap {
  const clone: BoardMap = {};
  for (const key in board) {
    clone[key] = { ...board[key] };
  }
  return clone;
}

/**
 * Get a string representation of the board for position comparison (threefold repetition).
 */
export function boardPositionKey(board: BoardMap): string {
  const entries: string[] = [];
  for (const key in board) {
    const p = board[key];
    entries.push(`${key}:${p.color[0]}${p.kind}`);
  }
  entries.sort();
  return entries.join('|');
}
