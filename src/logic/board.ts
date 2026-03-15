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
 * Standard chess-like initial setup as placeholder.
 * Will be replaced with exact Chess-T1 layout later.
 */
export function createInitialBoard(): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};

  // White pieces - rank 0 (row 1)
  const whiteBackRow: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 0)] = createPiece(whiteBackRow[file], 'white');
  }
  // White pawns - rank 1 (row 2)
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 1)] = createPiece('pawn', 'white');
  }

  // Black pieces - rank 7 (row 8)
  const blackBackRow: PieceKind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  for (let file = 0; file < 8; file++) {
    board[squareKey(file, 7)] = createPiece(blackBackRow[file], 'black');
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
