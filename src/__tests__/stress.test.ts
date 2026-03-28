import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard, boardPositionKey } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { computeForceMap, isKingInCheck } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd } from '../logic/gameEnd';
import { addMove, createHistory, goBack } from '../logic/history';
import { squareKey, keyToSquare, PieceKind, Color, Piece, ALL_PIECE_KINDS, PIECE_FORCE } from '../types/chess';

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

describe('Stress: Force map on initial position', () => {
  it('force map does not crash on initial position', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    expect(fm).toBeDefined();
    expect(typeof fm.whiteTotal).toBe('object');
    expect(typeof fm.blackTotal).toBe('object');
  });

  it('initial position: white has force on rank 2', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    // Pawns on rank 1 project forward to rank 2
    expect(fm.whiteTotal[squareKey(4, 2)]).toBeGreaterThan(0);
  });

  it('initial position: black has force on rank 5', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    // Black pawns on rank 6 project forward to rank 5
    expect(fm.blackTotal[squareKey(4, 5)]).toBeGreaterThan(0);
  });
});

describe('Stress: Every piece type generates valid movement', () => {
  const kinds: PieceKind[] = ['king', 'prince', 'rook', 'bishop', 'knight', 'pawn', 'veteran'];
  const colors: Color[] = ['white', 'black'];

  for (const kind of kinds) {
    for (const color of colors) {
      it(`${color} ${kind} at center generates moves without error`, () => {
        const board = setupBoard([{ kind, color, file: 4, rank: 4 }]);
        const piece = board[squareKey(4, 4)];
        const moves = getMovementSquares(board, piece, 4, 4);
        expect(Array.isArray(moves)).toBe(true);
        expect(moves.length).toBeGreaterThan(0);
        // All moves should be in bounds
        for (const m of moves) {
          expect(m.file).toBeGreaterThanOrEqual(0);
          expect(m.file).toBeLessThanOrEqual(7);
          expect(m.rank).toBeGreaterThanOrEqual(0);
          expect(m.rank).toBeLessThanOrEqual(7);
        }
      });

      it(`${color} ${kind} at every corner generates valid moves`, () => {
        const corners = [[0, 0], [7, 0], [0, 7], [7, 7]];
        for (const [f, r] of corners) {
          const board = setupBoard([{ kind, color, file: f, rank: r }]);
          const piece = board[squareKey(f, r)];
          const moves = getMovementSquares(board, piece, f, r);
          expect(Array.isArray(moves)).toBe(true);
          for (const m of moves) {
            expect(m.file).toBeGreaterThanOrEqual(0);
            expect(m.file).toBeLessThanOrEqual(7);
            expect(m.rank).toBeGreaterThanOrEqual(0);
            expect(m.rank).toBeLessThanOrEqual(7);
          }
        }
      });
    }
  }
});

describe('Stress: Legal moves for every piece in initial position', () => {
  it('every piece has consistent legal moves (no crashes)', () => {
    const board = createInitialBoard();
    for (const key in board) {
      const piece = board[key];
      const { file, rank } = keyToSquare(key);
      const moves = getLegalMovesForPiece(board, piece, file, rank, piece.color);
      expect(Array.isArray(moves)).toBe(true);
      for (const m of moves) {
        expect(m.file).toBeGreaterThanOrEqual(0);
        expect(m.file).toBeLessThanOrEqual(7);
        expect(m.rank).toBeGreaterThanOrEqual(0);
        expect(m.rank).toBeLessThanOrEqual(7);
      }
    }
  });
});

describe('Stress: validateMove does not crash on any invalid move', () => {
  it('random invalid moves dont crash', () => {
    const board = createInitialBoard();
    const testPositions = [
      [0, 0, 7, 7], [3, 1, 3, 3], [4, 6, 4, 4],
      [0, 0, 0, 0], [7, 7, 0, 0], [-1, -1, 8, 8],
    ];
    for (const [ff, fr, tf, tr] of testPositions) {
      const piece = board[squareKey(ff, fr)];
      if (!piece) continue;
      const result = validateMove(board, piece, ff, fr, tf, tr, 'white');
      expect(typeof result.valid).toBe('boolean');
    }
  });
});

describe('Stress: History undo/redo', () => {
  it('multiple moves then undo all', () => {
    let board = createInitialBoard();
    let history = createHistory();

    // Move 1: white pawn e2->e3
    const pawn1 = board[squareKey(4, 1)];
    const r1 = addMove(history, board, pawn1, { file: 4, rank: 1 }, { file: 4, rank: 2 }, null, null, false, 'white');
    board = r1.newBoard;
    history = r1.newHistory;

    // Move 2: white pawn d2->d3
    const pawn2 = board[squareKey(3, 1)];
    const r2 = addMove(history, board, pawn2, { file: 3, rank: 1 }, { file: 3, rank: 2 }, null, null, false, 'black');
    board = r2.newBoard;
    history = r2.newHistory;

    expect(history.moveIndex).toBe(1);
    expect(history.history.length).toBe(2);

    // Undo move 2
    const back1 = goBack(history);
    expect(back1).not.toBeNull();
    history = { ...history, moveIndex: back1!.newMoveIndex };

    // Undo move 1
    const back2 = goBack(history);
    expect(back2).not.toBeNull();

    // Initial position restored
    expect(back2!.board[squareKey(4, 1)]).toBeDefined();
    expect(back2!.board[squareKey(4, 1)].kind).toBe('pawn');
  });
});

describe('Stress: Force computation with many pieces', () => {
  it('full board force computation completes quickly', () => {
    const board = createInitialBoard();
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      computeForceMap(board);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000); // Should be well under 5 seconds
  });

  it('hasAnyLegalMove on initial position completes quickly', () => {
    const board = createInitialBoard();
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      hasAnyLegalMove(board, 'white');
      hasAnyLegalMove(board, 'black');
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});

describe('Stress: All piece force values are positive or zero', () => {
  it('force values are non-negative', () => {
    for (const kind of ALL_PIECE_KINDS) {
      expect(PIECE_FORCE[kind]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Stress: Promotion edge cases', () => {
  it('veteran on non-last rank: no promotion', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 4, rank: 5 }]);
    const piece = board[squareKey(4, 5)];
    const result = checkPromotion(piece, { file: 4, rank: 5 }, { file: 4, rank: 6 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
    expect(result.dialog).toBeNull();
  });

  it('non-pawn on promotion rank: no auto-promotion', () => {
    const board = setupBoard([{ kind: 'knight', color: 'white', file: 4, rank: 4 }]);
    const piece = board[squareKey(4, 4)];
    const result = checkPromotion(piece, { file: 4, rank: 4 }, { file: 4, rank: 5 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
  });

  it('king entering castle: no promotion', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 1 }]);
    const piece = board[squareKey(4, 1)];
    const result = checkPromotion(piece, { file: 4, rank: 1 }, { file: 4, rank: 0 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
  });
});

describe('Stress: Scout specifics', () => {
  it('scout on every board position generates L-shape moves', () => {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const board = setupBoard([{ kind: 'bishop', color: 'white', file: f, rank: r }]);
        const piece = board[squareKey(f, r)];
        const moves = getMovementSquares(board, piece, f, r);
        // All moves should be L-shaped: |df|+|dr| should be 3, with one being 1 and other 2
        for (const m of moves) {
          const df = Math.abs(m.file - f);
          const dr = Math.abs(m.rank - r);
          expect(df + dr).toBe(3);
          expect(Math.min(df, dr)).toBe(1);
          expect(Math.max(df, dr)).toBe(2);
        }
      }
    }
  });

  it('scout force is 0 in force map', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
    ]);
    const fm = computeForceMap(board);
    // Scout projects 0 force everywhere
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        expect(fm.whiteTotal[squareKey(f, r)] || 0).toBe(0);
      }
    }
  });
});

describe('Stress: Game end with no kings', () => {
  it('empty board: no crash on checkGameEnd', () => {
    const board: BoardMap = {};
    const result = checkGameEnd(board, 'white', null, false);
    // Empty board: black has no legal moves → blockade
    expect(result.gameOver).toBe(true);
  });

  it('isKingInCheck with no king returns false', () => {
    const board: BoardMap = {};
    expect(isKingInCheck(board, 'white')).toBe(false);
    expect(isKingInCheck(board, 'black')).toBe(false);
  });
});

describe('Stress: Simulate 20 random valid moves', () => {
  it('game progresses without crash', () => {
    let board = createInitialBoard();
    let turn: Color = 'white';
    let moveCount = 0;

    for (let attempt = 0; attempt < 200 && moveCount < 20; attempt++) {
      // Find all legal moves for current side
      const allMoves: Array<{ piece: Piece; from: { file: number; rank: number }; to: { file: number; rank: number } }> = [];
      for (const key in board) {
        const piece = board[key];
        if (piece.color !== turn) continue;
        const { file, rank } = keyToSquare(key);
        const moves = getLegalMovesForPiece(board, piece, file, rank, turn);
        for (const m of moves) {
          allMoves.push({ piece, from: { file, rank }, to: m });
        }
      }

      if (allMoves.length === 0) break;

      // Pick a deterministic "random" move
      const moveIdx = (attempt * 7 + moveCount * 13) % allMoves.length;
      const chosen = allMoves[moveIdx];

      const result = validateMove(board, chosen.piece, chosen.from.file, chosen.from.rank, chosen.to.file, chosen.to.rank, turn);
      if (!result.valid) continue;

      // Apply move
      const newBoard = cloneBoard(board);
      const fromKey = squareKey(chosen.from.file, chosen.from.rank);
      const toKey = squareKey(chosen.to.file, chosen.to.rank);
      delete newBoard[fromKey];

      if (result.scoutExchange) {
        delete newBoard[toKey];
      } else {
        // Check promotion
        const promo = checkPromotion(chosen.piece, chosen.from, chosen.to, result.captured, board, defaultPromoState);
        if (promo.auto) {
          newBoard[toKey] = { ...chosen.piece, kind: promo.auto.kind };
        } else {
          newBoard[toKey] = { ...chosen.piece };
        }
      }

      board = newBoard;
      turn = turn === 'white' ? 'black' : 'white';
      moveCount++;

      // Check game end
      const endResult = checkGameEnd(board, turn === 'white' ? 'black' : 'white', result.captured, result.scoutExchange);
      if (endResult.gameOver) break;
    }

    // Should have made at least some moves without crashing
    expect(moveCount).toBeGreaterThan(0);
  });
});

describe('Stress: boardPositionKey consistency', () => {
  it('same pieces in different order give same key', () => {
    resetPieceCounter();
    const board1: BoardMap = {};
    board1[squareKey(0, 0)] = createPiece('king', 'white');
    board1[squareKey(7, 7)] = createPiece('king', 'black');

    resetPieceCounter();
    const board2: BoardMap = {};
    board2[squareKey(7, 7)] = createPiece('king', 'black');
    board2[squareKey(0, 0)] = createPiece('king', 'white');

    expect(boardPositionKey(board1)).toBe(boardPositionKey(board2));
  });
});
