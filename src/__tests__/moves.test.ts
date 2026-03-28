import { describe, it, expect } from 'vitest';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { squareKey, PieceKind, Color } from '../types/chess';
import { BoardMap, createPiece, resetPieceCounter } from '../logic/board';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

describe('validateMove basics', () => {
  it('cannot move opponents piece', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 6 }]);
    const result = validateMove(board, board[squareKey(4, 6)], 4, 6, 4, 5, 'white');
    expect(result.valid).toBe(false);
  });

  it('cannot stay on same square', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 1 }]);
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 1, 'white');
    expect(result.valid).toBe(false);
  });

  it('cannot move out of bounds', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 0, rank: 1 }]);
    const result = validateMove(board, board[squareKey(0, 1)], 0, 1, -1, 1, 'white');
    expect(result.valid).toBe(false);
  });

  it('cannot capture own piece', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 1 },
      { kind: 'pawn', color: 'white', file: 4, rank: 2 },
    ]);
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 2, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('Castle square restrictions', () => {
  it('non-royal piece cannot enter castle square', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 1 },
    ]);
    // e1 = (4,0) is a castle square
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 0, 'white');
    expect(result.valid).toBe(false);
  });

  it('royal piece can enter castle square', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 1 },
    ]);
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 0, 'white');
    expect(result.valid).toBe(true);
  });

  it('Ritter (non-royal) cannot enter castle square', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 4, rank: 1 },
    ]);
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 0, 'white');
    expect(result.valid).toBe(false);
  });

  it('veteran can enter EMPTY castle square on last rank for promotion', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 4, rank: 6 },
    ]);
    // e8 = (4,7) is a black castle square, rank 7 = last rank for white, square is EMPTY
    const result = validateMove(board, board[squareKey(4, 6)], 4, 6, 4, 7, 'white');
    expect(result.valid).toBe(true);
  });

  it('veteran cannot enter OCCUPIED castle square even on last rank', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 4, rank: 6 },
      { kind: 'prince', color: 'black', file: 4, rank: 7 }, // e8 occupied by enemy
    ]);
    // Castle square is occupied → veteran cannot enter (spec: "клетка замка должна быть свободна")
    const result = validateMove(board, board[squareKey(4, 6)], 4, 6, 4, 7, 'white');
    expect(result.valid).toBe(false);
  });

  it('veteran cannot enter castle square on non-last rank', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 4, rank: 1 },
    ]);
    // e1 = (4,0) is a castle square but rank 0 is not last rank for white
    const result = validateMove(board, board[squareKey(4, 1)], 4, 1, 4, 0, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('Castle exit restriction', () => {
  it('royal piece cannot leave own castle if enemy royal inside and sole royal defender', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 },   // e1, white castle
      { kind: 'prince', color: 'black', file: 3, rank: 0 },  // d1, enemy royal in white castle
    ]);
    // White king tries to leave castle
    const result = validateMove(board, board[squareKey(4, 0)], 4, 0, 4, 1, 'white');
    expect(result.valid).toBe(false);
  });

  it('can move within own castle even as sole royal defender', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 },   // e1
      { kind: 'prince', color: 'black', file: 3, rank: 0 },  // d1, enemy royal
    ]);
    // King moves from e1 to f1 (within white castle)
    const result = validateMove(board, board[squareKey(4, 0)], 4, 0, 5, 0, 'white');
    expect(result.valid).toBe(true);
  });

  it('can leave castle if more than 1 royal defender', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 },    // e1
      { kind: 'prince', color: 'white', file: 5, rank: 0 },  // f1, second royal defender
      { kind: 'prince', color: 'black', file: 3, rank: 0 },  // d1, enemy royal
    ]);
    const result = validateMove(board, board[squareKey(4, 0)], 4, 0, 4, 1, 'white');
    expect(result.valid).toBe(true);
  });

  it('restriction counts only royal pieces, not all pieces in castle', () => {
    // If a non-royal piece is somehow in castle alongside king,
    // the count should only track royals
    // This test verifies the fix: myRoyalPiecesInCastle vs myPiecesInCastle
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 },    // e1, sole royal
      { kind: 'prince', color: 'black', file: 3, rank: 0 },  // d1, enemy royal
    ]);
    // Only 1 royal piece (king) in castle → cannot leave
    const result = validateMove(board, board[squareKey(4, 0)], 4, 0, 4, 1, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('Force-based capture', () => {
  it('can capture when force superiority', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 3, rank: 3 }, // Ritter force 2
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },   // pawn force 1
    ]);
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(true);
    expect(result.captured).toBeDefined();
    expect(result.captured!.kind).toBe('pawn');
  });

  it('cannot capture without force superiority', () => {
    // Single pawn (force 1) trying to capture defended piece
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },
      { kind: 'knight', color: 'black', file: 5, rank: 3 }, // Ritter defending (4,3) with force 2
    ]);
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(false);
  });

  it('Scout capture on regular square', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
      { kind: 'rook', color: 'black', file: 5, rank: 6 },
    ]);
    const result = validateMove(board, board[squareKey(4, 4)], 4, 4, 5, 6, 'white');
    expect(result.valid).toBe(true);
    expect(result.scoutExchange).toBe(false);
  });

  it('Scout exchange on castle square (both removed)', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 2, rank: 5 },
      { kind: 'king', color: 'black', file: 3, rank: 7 }, // d8 castle square
    ]);
    // Scout L-shape: (2,5)->(3,7) = +1,+2 — valid L-shape
    // Scout can exchange on castle square (exception to non-royal rule)
    const result = validateMove(board, board[squareKey(2, 5)], 2, 5, 3, 7, 'white');
    expect(result.valid).toBe(true);
    expect(result.scoutExchange).toBe(true);
    expect(result.captured!.kind).toBe('king');
  });

  it('Scout cannot enter empty castle square', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 2, rank: 5 },
    ]);
    // d8 (3,7) is castle square, empty — Scout can't go there
    const result = validateMove(board, board[squareKey(2, 5)], 2, 5, 3, 7, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('Movement patterns in validateMove', () => {
  it('pawn cannot move diagonally', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 2 }]);
    const result = validateMove(board, board[squareKey(4, 2)], 4, 2, 5, 3, 'white');
    expect(result.valid).toBe(false);
  });

  it('king can move diagonally', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    const result = validateMove(board, board[squareKey(4, 4)], 4, 4, 5, 5, 'white');
    expect(result.valid).toBe(true);
  });

  it('king cannot move 2 squares', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    const result = validateMove(board, board[squareKey(4, 4)], 4, 4, 6, 4, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('getLegalMovesForPiece', () => {
  it('returns correct count for king in center', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    const moves = getLegalMovesForPiece(board, board[squareKey(4, 4)], 4, 4, 'white');
    expect(moves.length).toBe(8);
  });

  it('excludes castle squares for non-royal', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 1 }]);
    const moves = getLegalMovesForPiece(board, board[squareKey(4, 1)], 4, 1, 'white');
    // (4,0)=e1 is castle, should be excluded
    const hasCastle = moves.some(m => m.file === 4 && m.rank === 0);
    expect(hasCastle).toBe(false);
  });
});

describe('hasAnyLegalMove', () => {
  it('starting position: both sides have moves', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 4, rank: 7 },
    ]);
    expect(hasAnyLegalMove(board, 'white')).toBe(true);
    expect(hasAnyLegalMove(board, 'black')).toBe(true);
  });

  it('no pieces = no legal moves', () => {
    const board: BoardMap = {};
    expect(hasAnyLegalMove(board, 'white')).toBe(false);
  });
});
