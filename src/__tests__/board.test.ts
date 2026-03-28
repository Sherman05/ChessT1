import { describe, it, expect } from 'vitest';
import { createInitialBoard, createEmptyBoard, cloneBoard, boardPositionKey } from '../logic/board';
import { squareKey } from '../types/chess';

describe('createInitialBoard', () => {
  const board = createInitialBoard();

  it('should have 32 pieces total', () => {
    expect(Object.keys(board).length).toBe(32);
  });

  it('should have 16 white pieces', () => {
    const whites = Object.values(board).filter(p => p.color === 'white');
    expect(whites.length).toBe(16);
  });

  it('should have 16 black pieces', () => {
    const blacks = Object.values(board).filter(p => p.color === 'black');
    expect(blacks.length).toBe(16);
  });

  it('white back row: knight-bishop-prince-rook-king-prince-bishop-knight', () => {
    const expected = ['knight', 'bishop', 'prince', 'rook', 'king', 'prince', 'bishop', 'knight'];
    for (let f = 0; f < 8; f++) {
      const p = board[squareKey(f, 0)];
      expect(p).toBeDefined();
      expect(p.kind).toBe(expected[f]);
      expect(p.color).toBe('white');
    }
  });

  it('black back row: knight-bishop-prince-rook-king-prince-bishop-knight', () => {
    const expected = ['knight', 'bishop', 'prince', 'rook', 'king', 'prince', 'bishop', 'knight'];
    for (let f = 0; f < 8; f++) {
      const p = board[squareKey(f, 7)];
      expect(p).toBeDefined();
      expect(p.kind).toBe(expected[f]);
      expect(p.color).toBe('black');
    }
  });

  it('white pawns on rank 1', () => {
    for (let f = 0; f < 8; f++) {
      const p = board[squareKey(f, 1)];
      expect(p).toBeDefined();
      expect(p.kind).toBe('pawn');
      expect(p.color).toBe('white');
    }
  });

  it('black pawns on rank 6', () => {
    for (let f = 0; f < 8; f++) {
      const p = board[squareKey(f, 6)];
      expect(p).toBeDefined();
      expect(p.kind).toBe('pawn');
      expect(p.color).toBe('black');
    }
  });

  it('ranks 2-5 should be empty', () => {
    for (let r = 2; r <= 5; r++) {
      for (let f = 0; f < 8; f++) {
        expect(board[squareKey(f, r)]).toBeUndefined();
      }
    }
  });

  it('should not contain any queen pieces', () => {
    const queens = Object.values(board).filter(p => p.kind === ('queen' as unknown as string));
    expect(queens.length).toBe(0);
  });

  it('castle squares should have royal pieces', () => {
    // c1=prince, d1=rook, e1=king, f1=prince
    expect(board[squareKey(2, 0)].kind).toBe('prince');
    expect(board[squareKey(3, 0)].kind).toBe('rook');
    expect(board[squareKey(4, 0)].kind).toBe('king');
    expect(board[squareKey(5, 0)].kind).toBe('prince');
    // c8=prince, d8=rook, e8=king, f8=prince
    expect(board[squareKey(2, 7)].kind).toBe('prince');
    expect(board[squareKey(3, 7)].kind).toBe('rook');
    expect(board[squareKey(4, 7)].kind).toBe('king');
    expect(board[squareKey(5, 7)].kind).toBe('prince');
  });
});

describe('createEmptyBoard', () => {
  it('should return empty object', () => {
    expect(Object.keys(createEmptyBoard()).length).toBe(0);
  });
});

describe('cloneBoard', () => {
  it('should deep clone', () => {
    const board = createInitialBoard();
    const clone = cloneBoard(board);
    expect(Object.keys(clone).length).toBe(Object.keys(board).length);
    // Modifying clone should not affect original
    delete clone[squareKey(0, 0)];
    expect(board[squareKey(0, 0)]).toBeDefined();
  });
});

describe('boardPositionKey', () => {
  it('same board gives same key', () => {
    const b1 = createInitialBoard();
    const b2 = createInitialBoard();
    expect(boardPositionKey(b1)).toBe(boardPositionKey(b2));
  });

  it('different boards give different keys', () => {
    const b1 = createInitialBoard();
    const b2 = createInitialBoard();
    delete b2[squareKey(0, 0)];
    expect(boardPositionKey(b1)).not.toBe(boardPositionKey(b2));
  });
});
