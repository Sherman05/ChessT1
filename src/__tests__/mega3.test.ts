import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { computeForceMap, getEffectiveDefense } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd } from '../logic/gameEnd';
import { addMove, createHistory, goBack } from '../logic/history';
import { squareKey, keyToSquare, PieceKind, Color, Piece } from '../types/chess';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  return board;
}

const defPS: PromotionState = { whitePrinceToConnetUsed: false, blackPrinceToConnetUsed: false };

// ============ 36. Legal moves for every piece type isolated on center ============

describe('Legal moves: isolated pieces at center', () => {
  const kinds: PieceKind[] = ['king', 'prince', 'rook', 'bishop', 'knight', 'pawn', 'veteran'];
  for (const kind of kinds) {
    for (const color of ['white', 'black'] as Color[]) {
      it(`${color} ${kind} at (4,4) has legal moves`, () => {
        const board = setupBoard([{ kind, color, file: 4, rank: 4 }]);
        const piece = board[squareKey(4, 4)];
        const moves = getLegalMovesForPiece(board, piece, 4, 4, color);
        expect(moves.length).toBeGreaterThan(0);
      });
    }
  }
});

// ============ 37. King move count at corners/edges/center ============

describe('King: exact move counts', () => {
  it('corner has 3 moves', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(3);
  });
  it('edge has 5 moves', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 4)], 0, 4);
    expect(moves.length).toBe(5);
  });
  it('center has 8 moves', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    expect(moves.length).toBe(8);
  });
});

// ============ 38. Scout move count ============

describe('Scout: move counts', () => {
  it('center scout has 8 L-shaped moves', () => {
    const board = setupBoard([{ kind: 'bishop', color: 'white', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    expect(moves.length).toBe(8);
  });
  it('corner scout has 2 moves', () => {
    const board = setupBoard([{ kind: 'bishop', color: 'white', file: 0, rank: 0 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(2);
  });
});

// ============ 39. Knight (Ritter) move count ============

describe('Ritter: move counts', () => {
  it('center ritter has 8 moves', () => {
    const board = setupBoard([{ kind: 'knight', color: 'white', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    expect(moves.length).toBe(8);
  });
  it('corner ritter has 4 moves', () => {
    const board = setupBoard([{ kind: 'knight', color: 'white', file: 0, rank: 0 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    expect(moves.length).toBe(4);
  });
});

// ============ 40. Connet move count at center (empty board) ============

describe('Connet: move count', () => {
  it('center connet has many moves', () => {
    const board = setupBoard([{ kind: 'rook', color: 'white', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    // 8 h/v (1-2 each direction) + up to 12 diagonal (1-3 each dir)
    expect(moves.length).toBeGreaterThanOrEqual(16);
  });
});

// ============ 41. Prince move count ============

describe('Prince: move count', () => {
  it('center prince has many moves', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    // 4 h/v + up to 12 diagonal
    expect(moves.length).toBeGreaterThanOrEqual(14);
  });
});

// ============ 42. Game end: scout exchange kills king ============

describe('GameEnd: scout exchange kills king', () => {
  it('scout exchange removing white king: black wins', () => {
    // After exchange, board has no white king
    const board = setupBoard([{ kind: 'king', color: 'black', file: 7, rank: 7 }]);
    const result = checkGameEnd(board, 'black', null, true);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('black');
  });
  it('scout exchange removing black king: white wins', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }]);
    const result = checkGameEnd(board, 'white', null, true);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });
  it('both kings still alive after scout exchange: no end', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 0, rank: 0 },
      { kind: 'king', color: 'black', file: 7, rank: 7 },
    ]);
    const result = checkGameEnd(board, 'white', null, true);
    expect(result.gameOver).toBe(false);
  });
});

// ============ 43. Castle exit restriction ============

describe('Castle exit restriction', () => {
  it('royal piece cannot leave castle if enemy royal inside and alone defender', () => {
    // White king in white castle, black prince also in white castle
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 0 }, // d1 castle
      { kind: 'prince', color: 'black', file: 4, rank: 0 }, // e1 castle
    ]);
    const piece = board[squareKey(3, 0)];
    const r = validateMove(board, piece, 3, 0, 3, 1, 'white'); // try to leave castle
    expect(r.valid).toBe(false);
  });
  it('royal can leave if 2 own royal in castle', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 0 },
      { kind: 'prince', color: 'white', file: 4, rank: 0 },
      { kind: 'prince', color: 'black', file: 5, rank: 0 },
    ]);
    const piece = board[squareKey(3, 0)];
    const r = validateMove(board, piece, 3, 0, 3, 1, 'white');
    expect(r.valid).toBe(true);
  });
  it('moving within castle is allowed even if restricted', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 0 },
      { kind: 'prince', color: 'black', file: 5, rank: 0 },
    ]);
    const piece = board[squareKey(3, 0)];
    const r = validateMove(board, piece, 3, 0, 4, 0, 'white'); // d1->e1
    expect(r.valid).toBe(true);
  });
});

// ============ 44. Veteran on non-last rank: no promotion ============

describe('Veteran: no promotion on non-last rank', () => {
  for (let r = 1; r < 7; r++) {
    it(`white veteran at rank ${r}: no promotion`, () => {
      const board = setupBoard([{ kind: 'veteran', color: 'white', file: 4, rank: r }]);
      const piece = board[squareKey(4, r)];
      const dest = r < 7 ? r + 1 : r - 1;
      if (dest === 7) return; // skip: last rank would promote
      const result = checkPromotion(piece, { file: 4, rank: r }, { file: 4, rank: dest }, null, board, defPS);
      expect(result.auto).toBeNull();
      expect(result.dialog).toBeNull();
    });
  }
});

// ============ 45. History: truncation on new move after undo ============

describe('History: truncation', () => {
  it('new move after undo truncates future', () => {
    let board = createInitialBoard();
    let hist = createHistory();

    // Move 1
    const p1 = board[squareKey(4, 1)];
    const r1 = addMove(hist, board, p1, { file: 4, rank: 1 }, { file: 4, rank: 2 }, null, null, false, 'white');
    board = r1.newBoard; hist = r1.newHistory;

    // Move 2
    const p2 = board[squareKey(4, 6)];
    const r2 = addMove(hist, board, p2, { file: 4, rank: 6 }, { file: 4, rank: 5 }, null, null, false, 'black');
    board = r2.newBoard; hist = r2.newHistory;
    expect(hist.history.length).toBe(2);

    // Undo
    const back = goBack(hist);
    board = back!.board;
    hist = { ...hist, moveIndex: back!.newMoveIndex };

    // New different move (truncates move 2)
    const p3 = board[squareKey(3, 6)];
    const r3 = addMove(hist, board, p3, { file: 3, rank: 6 }, { file: 3, rank: 5 }, null, null, false, 'black');
    hist = r3.newHistory;
    expect(hist.history.length).toBe(2);
    expect(hist.moveIndex).toBe(1);
  });
});

// ============ 46. Force map: performance ============

describe('Performance: force computation', () => {
  it('200 force map computations under 5s', () => {
    const board = createInitialBoard();
    const start = Date.now();
    for (let i = 0; i < 200; i++) computeForceMap(board);
    expect(Date.now() - start).toBeLessThan(5000);
  });
  it('50 hasAnyLegalMove calls under 5s', () => {
    const board = createInitialBoard();
    const start = Date.now();
    for (let i = 0; i < 50; i++) {
      hasAnyLegalMove(board, 'white');
      hasAnyLegalMove(board, 'black');
    }
    expect(Date.now() - start).toBeLessThan(5000);
  });
});

// ============ 47. Veteran promotion options on castle squares ============

describe('Veteran promotion on castle square', () => {
  it('white veteran on rank 7 castle square: prince or connet options', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 3, rank: 6 }]);
    const piece = board[squareKey(3, 6)];
    const result = checkPromotion(piece, { file: 3, rank: 6 }, { file: 3, rank: 7 }, null, board, defPS);
    expect(result.dialog).not.toBeNull();
    expect(result.dialog!.options).toContain('prince');
    expect(result.dialog!.options).toContain('rook');
    expect(result.dialog!.options).not.toContain('knight');
    expect(result.dialog!.options).not.toContain('bishop');
  });
});

// ============ 48. Multiple games: consistency ============

describe('Simulation: 30 more random games', () => {
  for (let game = 50; game < 80; game++) {
    it(`game ${game} completes without error`, () => {
      let board = createInitialBoard();
      let turn: Color = 'white';
      let moves = 0;
      for (let att = 0; att < 200 && moves < 25; att++) {
        const all: Array<{ piece: Piece; from: { file: number; rank: number }; to: { file: number; rank: number } }> = [];
        for (const key in board) {
          const p = board[key];
          if (p.color !== turn) continue;
          const sq = keyToSquare(key);
          for (const m of getLegalMovesForPiece(board, p, sq.file, sq.rank, turn)) {
            all.push({ piece: p, from: sq, to: m });
          }
        }
        if (all.length === 0) break;
        const idx = (game * 41 + att * 17 + moves * 23) % all.length;
        const ch = all[idx];
        const r = validateMove(board, ch.piece, ch.from.file, ch.from.rank, ch.to.file, ch.to.rank, turn);
        if (!r.valid) continue;
        const nb = cloneBoard(board);
        delete nb[squareKey(ch.from.file, ch.from.rank)];
        if (r.scoutExchange) { delete nb[squareKey(ch.to.file, ch.to.rank)]; }
        else {
          const promo = checkPromotion(ch.piece, ch.from, ch.to, r.captured, board, defPS);
          nb[squareKey(ch.to.file, ch.to.rank)] = promo.auto ? { ...ch.piece, kind: promo.auto.kind } : { ...ch.piece };
        }
        board = nb;
        const mc = turn;
        turn = turn === 'white' ? 'black' : 'white';
        moves++;
        if (checkGameEnd(board, mc, r.captured, r.scoutExchange).gameOver) break;
      }
      expect(moves).toBeGreaterThan(0);
    });
  }
});

// ============ 49. Effective defense ============

describe('Effective defense', () => {
  it('own piece defends its own square', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    const fm = computeForceMap(board);
    const def = getEffectiveDefense(fm, 'white', 4, 4);
    expect(def).toBe(1); // pawn force = 1
  });
});

// ============ 50. ValidateMove: every white pawn initial forward ============

describe('ValidateMove: white pawns initial forward', () => {
  for (let f = 0; f < 8; f++) {
    it(`white pawn ${f} can move to rank 2`, () => {
      const board = createInitialBoard();
      const piece = board[squareKey(f, 1)];
      const r = validateMove(board, piece, f, 1, f, 2, 'white');
      expect(r.valid).toBe(true);
    });
    it(`white pawn ${f} can move to rank 3 (double)`, () => {
      const board = createInitialBoard();
      const piece = board[squareKey(f, 1)];
      const r = validateMove(board, piece, f, 1, f, 3, 'white');
      expect(r.valid).toBe(true);
    });
  }
});

// ============ 51. ValidateMove: every black pawn initial forward ============

describe('ValidateMove: black pawns initial forward', () => {
  for (let f = 0; f < 8; f++) {
    it(`black pawn ${f} can move to rank 5`, () => {
      const board = createInitialBoard();
      const piece = board[squareKey(f, 6)];
      const r = validateMove(board, piece, f, 6, f, 5, 'black');
      expect(r.valid).toBe(true);
    });
    it(`black pawn ${f} can move to rank 4 (double)`, () => {
      const board = createInitialBoard();
      const piece = board[squareKey(f, 6)];
      const r = validateMove(board, piece, f, 6, f, 4, 'black');
      expect(r.valid).toBe(true);
    });
  }
});
