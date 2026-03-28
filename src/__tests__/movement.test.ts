import { describe, it, expect } from 'vitest';
import { getMovementSquares } from '../logic/movement';
import { Piece, Square, squareKey } from '../types/chess';
import { BoardMap, createPiece, resetPieceCounter } from '../logic/board';

function makePiece(kind: Piece['kind'], color: Piece['color']): Piece {
  return createPiece(kind, color);
}

function placeOne(kind: Piece['kind'], color: Piece['color'], file: number, rank: number): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  board[squareKey(file, rank)] = makePiece(kind, color);
  return board;
}

function squareSet(squares: Square[]): Set<string> {
  return new Set(squares.map(s => `${s.file},${s.rank}`));
}

describe('King movement', () => {
  it('center of board: 8 squares', () => {
    const board = placeOne('king', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    expect(moves.length).toBe(8);
  });

  it('corner: 3 squares', () => {
    const board = placeOne('king', 'white', 0, 0);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(3);
  });

  it('edge: 5 squares', () => {
    const board = placeOne('king', 'white', 0, 4);
    const moves = getMovementSquares(board, board[squareKey(0, 4)], 0, 4);
    expect(moves.length).toBe(5);
  });
});

describe('Pawn movement', () => {
  it('white pawn on own territory (rank 1): 5 squares (L/R/fwd/back/2fwd)', () => {
    const board = placeOne('pawn', 'white', 4, 1);
    const moves = getMovementSquares(board, board[squareKey(4, 1)], 4, 1);
    const set = squareSet(moves);
    expect(set.has('3,1')).toBe(true); // left
    expect(set.has('5,1')).toBe(true); // right
    expect(set.has('4,2')).toBe(true); // forward
    expect(set.has('4,0')).toBe(true); // backward
    expect(set.has('4,3')).toBe(true); // 2 forward
    expect(moves.length).toBe(5);
  });

  it('white pawn on enemy territory (rank 5): no 2 forward', () => {
    const board = placeOne('pawn', 'white', 4, 5);
    const moves = getMovementSquares(board, board[squareKey(4, 5)], 4, 5);
    const set = squareSet(moves);
    expect(set.has('4,7')).toBe(false); // no 2 forward
    expect(moves.length).toBe(4); // L/R/fwd/back
  });

  it('black pawn on own territory (rank 5): 5 squares', () => {
    const board = placeOne('pawn', 'black', 4, 5);
    const moves = getMovementSquares(board, board[squareKey(4, 5)], 4, 5);
    const set = squareSet(moves);
    expect(set.has('4,3')).toBe(true); // 2 forward (for black, forward = decreasing rank)
    expect(moves.length).toBe(5);
  });

  it('white pawn 2 forward blocked by piece', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 1)] = makePiece('pawn', 'white');
    board[squareKey(4, 2)] = makePiece('pawn', 'black'); // blocker
    const moves = getMovementSquares(board, board[squareKey(4, 1)], 4, 1);
    const set = squareSet(moves);
    expect(set.has('4,3')).toBe(false); // 2 forward blocked
    expect(set.has('4,2')).toBe(true); // 1 forward still reachable (blocker is there)
  });

  it('white pawn on rank 3 (own territory boundary): gets 2 forward', () => {
    const board = placeOne('pawn', 'white', 4, 3);
    const moves = getMovementSquares(board, board[squareKey(4, 3)], 4, 3);
    const set = squareSet(moves);
    expect(set.has('4,5')).toBe(true); // 2 forward
  });

  it('white pawn on rank 4 (enemy territory): no 2 forward', () => {
    const board = placeOne('pawn', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('4,6')).toBe(false);
  });

  it('pawn at edge: fewer moves', () => {
    const board = placeOne('pawn', 'white', 0, 3);
    const moves = getMovementSquares(board, board[squareKey(0, 3)], 0, 3);
    const set = squareSet(moves);
    expect(set.has('-1,3')).toBe(false); // no left off-board
    // Should have: right(1,3), fwd(0,4), back(0,2), 2fwd(0,5) = 4
    expect(moves.length).toBe(4);
  });
});

describe('Veteran movement', () => {
  it('same as pawn', () => {
    const boardP = placeOne('pawn', 'white', 4, 2);
    const boardV = placeOne('veteran', 'white', 4, 2);
    const movesP = getMovementSquares(boardP, boardP[squareKey(4, 2)], 4, 2);
    const movesV = getMovementSquares(boardV, boardV[squareKey(4, 2)], 4, 2);
    expect(squareSet(movesP)).toEqual(squareSet(movesV));
  });
});

describe('Ritter (knight) movement', () => {
  it('center: 8 squares (1-2 in each h/v direction)', () => {
    const board = placeOne('knight', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('5,4')).toBe(true);  // +1 horizontal
    expect(set.has('6,4')).toBe(true);  // +2 horizontal
    expect(set.has('3,4')).toBe(true);  // -1 horizontal
    expect(set.has('2,4')).toBe(true);  // -2 horizontal
    expect(set.has('4,5')).toBe(true);  // +1 vertical
    expect(set.has('4,6')).toBe(true);  // +2 vertical
    expect(set.has('4,3')).toBe(true);  // -1 vertical
    expect(set.has('4,2')).toBe(true);  // -2 vertical
    expect(moves.length).toBe(8);
  });

  it('corner: 3 squares', () => {
    const board = placeOne('knight', 'white', 0, 0);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(4); // (1,0), (2,0), (0,1), (0,2)
  });

  it('jumps over pieces', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 4)] = makePiece('knight', 'white');
    board[squareKey(5, 4)] = makePiece('pawn', 'black'); // blocker at +1
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('6,4')).toBe(true); // can still reach +2 (jumps)
  });
});

describe('Prince movement', () => {
  it('center, empty board: 1 h/v + up to 3 diagonal', () => {
    const board = placeOne('prince', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    // 4 h/v
    expect(set.has('5,4')).toBe(true);
    expect(set.has('3,4')).toBe(true);
    expect(set.has('4,5')).toBe(true);
    expect(set.has('4,3')).toBe(true);
    // diagonals up to 3
    expect(set.has('5,5')).toBe(true);
    expect(set.has('6,6')).toBe(true);
    expect(set.has('7,7')).toBe(true);
    expect(set.has('3,3')).toBe(true);
    expect(set.has('2,2')).toBe(true);
    expect(set.has('1,1')).toBe(true);
    // Total: 4 h/v + 12 diagonal = 16
    expect(moves.length).toBe(16);
  });

  it('diagonal blocked by piece', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 4)] = makePiece('prince', 'white');
    board[squareKey(5, 5)] = makePiece('pawn', 'black');
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('5,5')).toBe(true);  // blocker's square reachable
    expect(set.has('6,6')).toBe(false); // beyond blocker: blocked
  });
});

describe('Connet (rook) movement', () => {
  it('center, empty board: 1-2 h/v (jump) + 1-3 diag', () => {
    const board = placeOne('rook', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    // 8 h/v (same as Ritter) + 12 diagonal = 20
    expect(moves.length).toBe(20);
  });

  it('h/v jumps over pieces', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 4)] = makePiece('rook', 'white');
    board[squareKey(5, 4)] = makePiece('pawn', 'black');
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('6,4')).toBe(true); // jumps over blocker
  });

  it('diagonal blocked by piece', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 4)] = makePiece('rook', 'white');
    board[squareKey(5, 5)] = makePiece('pawn', 'black');
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('5,5')).toBe(true);  // blocker reachable
    expect(set.has('6,6')).toBe(false); // blocked beyond
  });
});

describe('Scout (bishop) movement', () => {
  it('center: 8 L-shaped squares', () => {
    const board = placeOne('bishop', 'white', 4, 4);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = squareSet(moves);
    expect(set.has('5,6')).toBe(true);
    expect(set.has('6,5')).toBe(true);
    expect(set.has('3,6')).toBe(true);
    expect(set.has('2,5')).toBe(true);
    expect(set.has('5,2')).toBe(true);
    expect(set.has('6,3')).toBe(true);
    expect(set.has('3,2')).toBe(true);
    expect(set.has('2,3')).toBe(true);
    expect(moves.length).toBe(8);
  });

  it('corner: 2 squares', () => {
    const board = placeOne('bishop', 'white', 0, 0);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(2); // (1,2) and (2,1)
  });

  it('jumps over pieces', () => {
    resetPieceCounter();
    const board: BoardMap = {};
    board[squareKey(4, 4)] = makePiece('bishop', 'white');
    // Place blockers all around
    board[squareKey(3, 4)] = makePiece('pawn', 'black');
    board[squareKey(5, 4)] = makePiece('pawn', 'black');
    board[squareKey(4, 3)] = makePiece('pawn', 'black');
    board[squareKey(4, 5)] = makePiece('pawn', 'black');
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    expect(moves.length).toBe(8); // still 8 L-shape squares, jumps everything
  });
});
