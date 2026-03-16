import { describe, it, expect } from 'vitest';
import { checkGameEnd, checkDraw } from '../logic/gameEnd';
import { squareKey } from '../types/chess';
import { BoardMap, createPiece, resetPieceCounter, boardPositionKey } from '../logic/board';

function setupBoard(pieces: Array<{ kind: any; color: any; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

describe('checkGameEnd', () => {
  it('king captured = victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    const capturedKing = createPiece('king', 'black');
    const result = checkGameEnd(board, 'white', capturedKing, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });

  it('no king captured = no victory by capture', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 4, rank: 7 },
    ]);
    const capturedPawn = createPiece('pawn', 'black');
    const result = checkGameEnd(board, 'white', capturedPawn, false);
    // Not game over by king capture; check blockade and castle
    expect(result.winner).not.toBe('white'); // or could be null
  });

  it('royal piece on enemy castle = victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 7 }, // e8 = black castle!
      { kind: 'king', color: 'black', file: 0, rank: 5 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });

  it('non-royal piece on enemy castle: no victory', () => {
    // This scenario shouldn't normally happen (non-royal can't enter castle)
    // but test the logic
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 7 }, // e8 = black castle
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 0, rank: 5 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    // Pawn is not royal, so no castle victory
    expect(result.winner).not.toBe('white');
  });

  it('blockade: opponent has no legal moves', () => {
    // Black king trapped with no moves
    // Put black king in corner surrounded by white forces
    const board = setupBoard([
      { kind: 'king', color: 'black', file: 7, rank: 7 }, // h8 (not castle square)
      { kind: 'rook', color: 'white', file: 6, rank: 6 }, // Connet blocking
      { kind: 'rook', color: 'white', file: 7, rank: 6 }, // blocking
      { kind: 'rook', color: 'white', file: 6, rank: 7 }, // blocking
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    // Black king at h8: can move to g8(6,7), h7(7,6), g7(6,6) — all occupied by white
    // So black has no legal moves
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
    expect(result.reason).toContain('Блокада');
  });

  it('scout exchange removing a king = victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      // Black king was removed in exchange
    ]);
    const result = checkGameEnd(board, 'white', null, true);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });
});

describe('checkDraw', () => {
  it('40 moves without capture = draw', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 0, rank: 0 },
    ]);
    const result = checkDraw(board, 'white', 80, []);
    expect(result.isDraw).toBe(true);
    expect(result.reason).toContain('40 ходов');
  });

  it('39 moves without capture: no draw', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    const result = checkDraw(board, 'white', 79, []);
    expect(result.isDraw).toBe(false);
  });

  it('threefold repetition = draw', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    const posKey = boardPositionKey(board) + '|white';
    const history = [posKey, posKey, posKey]; // 3 times
    const result = checkDraw(board, 'white', 0, history);
    expect(result.isDraw).toBe(true);
    expect(result.reason).toContain('троекратное');
  });

  it('twofold repetition: no draw', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    const posKey = boardPositionKey(board) + '|white';
    const history = [posKey, posKey]; // only 2 times
    const result = checkDraw(board, 'white', 0, history);
    expect(result.isDraw).toBe(false);
  });
});
