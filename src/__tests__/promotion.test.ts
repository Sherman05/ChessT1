import { describe, it, expect } from 'vitest';
import { checkPromotion, PromotionState } from '../logic/promotion';
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

const defaultPromoState: PromotionState = {
  whitePrinceToConnetUsed: false,
  blackPrinceToConnetUsed: false,
};

describe('Pawn auto-promotion to Veteran', () => {
  it('white pawn reaching rank 5 auto-promotes', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    const piece = board[squareKey(4, 4)];
    const result = checkPromotion(piece, { file: 4, rank: 4 }, { file: 4, rank: 5 }, null, board, defaultPromoState);
    expect(result.auto).toBeDefined();
    expect(result.auto!.kind).toBe('veteran');
    expect(result.dialog).toBeNull();
  });

  it('black pawn reaching rank 2 auto-promotes', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 3 }]);
    const piece = board[squareKey(4, 3)];
    const result = checkPromotion(piece, { file: 4, rank: 3 }, { file: 4, rank: 2 }, null, board, defaultPromoState);
    expect(result.auto).toBeDefined();
    expect(result.auto!.kind).toBe('veteran');
  });

  it('white pawn NOT on rank 5: no promotion', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 2 }]);
    const piece = board[squareKey(4, 2)];
    const result = checkPromotion(piece, { file: 4, rank: 2 }, { file: 4, rank: 3 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
    expect(result.dialog).toBeNull();
  });
});

describe('Veteran promotion on last rank', () => {
  it('veteran on flank (a file, rank 7): 4 choices', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 0, rank: 6 }]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
    expect(result.dialog!.options).toEqual(['knight', 'prince', 'rook', 'bishop']);
  });

  it('veteran on flank (h file, rank 7): 4 choices', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 7, rank: 6 }]);
    const piece = board[squareKey(7, 6)];
    const result = checkPromotion(piece, { file: 7, rank: 6 }, { file: 7, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
    expect(result.dialog!.options.length).toBe(4);
  });

  it('veteran on castle square (d8): 2 choices (prince, connet)', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 3, rank: 6 }]);
    const piece = board[squareKey(3, 6)];
    const result = checkPromotion(piece, { file: 3, rank: 6 }, { file: 3, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
    expect(result.dialog!.options).toEqual(['prince', 'rook']);
  });

  it('black veteran on rank 0: promotes', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'black', file: 0, rank: 1 }]);
    const piece = board[squareKey(0, 1)];
    const result = checkPromotion(piece, { file: 0, rank: 1 }, { file: 0, rank: 0 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
  });

  it('promotion respects max 3 princes', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 0, rank: 6 },
      { kind: 'prince', color: 'white', file: 2, rank: 3 },
      { kind: 'prince', color: 'white', file: 3, rank: 3 },
      { kind: 'prince', color: 'white', file: 4, rank: 3 },
    ]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
    expect(result.dialog!.options).not.toContain('prince');
  });

  it('promotion respects max 3 connets', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 0, rank: 6 },
      { kind: 'rook', color: 'white', file: 2, rank: 3 },
      { kind: 'rook', color: 'white', file: 3, rank: 3 },
      { kind: 'rook', color: 'white', file: 4, rank: 3 },
    ]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).toBeDefined();
    expect(result.dialog!.options).not.toContain('rook');
  });

  it('no queen in promotion options', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 0, rank: 6 }]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog!.options).not.toContain('queen');
  });
});

describe('Prince auto-promotion to Connet', () => {
  it('prince entering castle square: auto-promotes to connet (first time)', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 3, rank: 1 }]);
    const piece = board[squareKey(3, 1)];
    // d1 = (3,0) is castle
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, defaultPromoState);
    expect(result.auto).toBeDefined();
    expect(result.auto!.kind).toBe('rook'); // connet
  });

  it('prince entering castle: no auto-promote if already used', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 3, rank: 1 }]);
    const piece = board[squareKey(3, 1)];
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, {
      whitePrinceToConnetUsed: true,
      blackPrinceToConnetUsed: false,
    });
    expect(result.auto).toBeNull();
  });

  it('prince entering non-castle square: no promotion', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 4, rank: 4 }]);
    const piece = board[squareKey(4, 4)];
    const result = checkPromotion(piece, { file: 4, rank: 4 }, { file: 4, rank: 5 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
  });

  it('veteran cannot enter castle if no promotion options (3 princes + 3 connets)', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 3, rank: 6 },
      { kind: 'prince', color: 'white', file: 0, rank: 3 },
      { kind: 'prince', color: 'white', file: 1, rank: 3 },
      { kind: 'prince', color: 'white', file: 2, rank: 3 },
      { kind: 'rook', color: 'white', file: 0, rank: 4 },
      { kind: 'rook', color: 'white', file: 1, rank: 4 },
      { kind: 'rook', color: 'white', file: 2, rank: 4 },
    ]);
    const piece = board[squareKey(3, 6)];
    // d8 = castle square, both prince and connet at max → moveBlocked
    const result = checkPromotion(piece, { file: 3, rank: 6 }, { file: 3, rank: 7 }, null, board, defaultPromoState);
    expect(result.moveBlocked).toBe(true);
    expect(result.auto).toBeNull();
    expect(result.dialog).toBeNull();
  });

  it('max 3 connets blocks prince auto-promotion', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 3, rank: 1 },
      { kind: 'rook', color: 'white', file: 0, rank: 3 },
      { kind: 'rook', color: 'white', file: 1, rank: 3 },
      { kind: 'rook', color: 'white', file: 2, rank: 3 },
    ]);
    const piece = board[squareKey(3, 1)];
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
  });
});
