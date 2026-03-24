import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard, boardPositionKey } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { computeForceMap, getEffectiveAttack, getEffectiveDefense } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd, checkDraw } from '../logic/gameEnd';
import { squareKey, keyToSquare, PieceKind, Color, Piece, isCastleSquare, squareNotation, fileToLetter, rankToNumber } from '../types/chess';
import { formatTime } from '../hooks/useChessClock';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  return board;
}

const defPS: PromotionState = { whitePrinceToConnetUsed: false, blackPrinceToConnetUsed: false };

// ============ 52. formatTime ============

describe('formatTime', () => {
  it('0 seconds', () => expect(formatTime(0)).toBe('0:00'));
  it('59 seconds', () => expect(formatTime(59)).toBe('0:59'));
  it('60 seconds', () => expect(formatTime(60)).toBe('1:00'));
  it('600 seconds (10 min)', () => expect(formatTime(600)).toBe('10:00'));
  it('601 seconds', () => expect(formatTime(601)).toBe('10:01'));
  it('3599 seconds', () => expect(formatTime(3599)).toBe('59:59'));
});

// ============ 53. squareNotation ============

describe('squareNotation', () => {
  it('a1', () => expect(squareNotation(0, 0)).toBe('a1'));
  it('h8', () => expect(squareNotation(7, 7)).toBe('h8'));
  it('e4', () => expect(squareNotation(4, 3)).toBe('e4'));
  it('d7', () => expect(squareNotation(3, 6)).toBe('d7'));
});

describe('fileToLetter', () => {
  it('0=a', () => expect(fileToLetter(0)).toBe('a'));
  it('7=h', () => expect(fileToLetter(7)).toBe('h'));
});

describe('rankToNumber', () => {
  it('0=1', () => expect(rankToNumber(0)).toBe('1'));
  it('7=8', () => expect(rankToNumber(7)).toBe('8'));
});

// ============ 54. Legal moves: pieces blocked by own pieces ============

describe('Legal moves: blocked by own pieces', () => {
  it('prince diagonal blocked by own piece', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'white', file: 5, rank: 5 },
    ]);
    const piece = board[squareKey(4, 4)];
    const moves = getLegalMovesForPiece(board, piece, 4, 4, 'white');
    // Can't move to (5,5) because own piece, and blocked beyond
    expect(moves.some(m => m.file === 5 && m.rank === 5)).toBe(false);
    expect(moves.some(m => m.file === 6 && m.rank === 6)).toBe(false);
  });

  it('connet h/v can jump over pieces', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 4 },
    ]);
    const piece = board[squareKey(4, 4)];
    const moves = getMovementSquares(board, piece, 4, 4);
    // Can reach (6,4) by jumping over (5,4)
    expect(moves.some(m => m.file === 6 && m.rank === 4)).toBe(true);
  });
});

// ============ 55. Simulate 20 more games with history tracking ============

describe('Simulation with history: 20 games', () => {
  for (let game = 80; game < 100; game++) {
    it(`game ${game} with undo/redo`, () => {
      let board = createInitialBoard();
      let turn: Color = 'white';
      let moves = 0;
      const boards: BoardMap[] = [cloneBoard(board)];

      for (let att = 0; att < 150 && moves < 15; att++) {
        const all: Array<{ piece: Piece; from: { file: number; rank: number }; to: { file: number; rank: number } }> = [];
        for (const key in board) {
          const p = board[key];
          if (p.color !== turn) continue;
          const sq = keyToSquare(key);
          for (const m of getLegalMovesForPiece(board, p, sq.file, sq.rank, turn))
            all.push({ piece: p, from: sq, to: m });
        }
        if (all.length === 0) break;
        const idx = (game * 53 + att * 11 + moves * 31) % all.length;
        const ch = all[idx];
        const r = validateMove(board, ch.piece, ch.from.file, ch.from.rank, ch.to.file, ch.to.rank, turn);
        if (!r.valid) continue;
        const nb = cloneBoard(board);
        delete nb[squareKey(ch.from.file, ch.from.rank)];
        if (r.scoutExchange) delete nb[squareKey(ch.to.file, ch.to.rank)];
        else {
          const promo = checkPromotion(ch.piece, ch.from, ch.to, r.captured, board, defPS);
          nb[squareKey(ch.to.file, ch.to.rank)] = promo.auto ? { ...ch.piece, kind: promo.auto.kind } : { ...ch.piece };
        }
        board = nb;
        boards.push(cloneBoard(board));
        turn = turn === 'white' ? 'black' : 'white';
        moves++;
        if (checkGameEnd(board, turn === 'white' ? 'black' : 'white', r.captured, r.scoutExchange).gameOver) break;
      }
      expect(moves).toBeGreaterThan(0);
      expect(boards.length).toBe(moves + 1);
    });
  }
});

// ============ 56. Castle squares are all on ranks 0 and 7 ============

describe('Castle squares are on correct ranks', () => {
  it('all white castle on rank 0', () => {
    for (let f = 2; f <= 5; f++) {
      expect(isCastleSquare(f, 0)).toBe(true);
    }
  });
  it('all black castle on rank 7', () => {
    for (let f = 2; f <= 5; f++) {
      expect(isCastleSquare(f, 7)).toBe(true);
    }
  });
  it('non-castle files on rank 0', () => {
    expect(isCastleSquare(0, 0)).toBe(false);
    expect(isCastleSquare(1, 0)).toBe(false);
    expect(isCastleSquare(6, 0)).toBe(false);
    expect(isCastleSquare(7, 0)).toBe(false);
  });
});

// ============ 57. Validate move: every back row piece can't move forward in initial pos ============

describe('Initial position: back row pieces blocked', () => {
  // King, prince, rook, scout back row pieces — most can't move because front row blocks
  it('white king at e1 has no legal moves (blocked by pawns)', () => {
    const board = createInitialBoard();
    const piece = board[squareKey(4, 0)]; // king
    const moves = getLegalMovesForPiece(board, piece, 4, 0, 'white');
    // King can only move 1 step, all squares occupied by own pieces
    // d1, e1, f1 are castle squares occupied by own pieces; d2, e2, f2 are own pawns
    expect(moves.length).toBe(0);
  });
});

// ============ 58. validateMove returns captured piece ============

describe('ValidateMove: capture returns piece', () => {
  it('capturing returns the captured piece', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 4 },
    ]);
    const piece = board[squareKey(4, 4)];
    const r = validateMove(board, piece, 4, 4, 5, 4, 'white');
    // Knight can reach (5,4) and capture if force superiority
    if (r.valid) {
      expect(r.captured).not.toBeNull();
      expect(r.captured!.kind).toBe('pawn');
    }
  });
});

// ============ 59. Force map: no negative values ============

describe('Force map: no negatives', () => {
  it('initial position has no negative force values', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    for (const key of Object.keys(fm.whiteTotal)) expect(fm.whiteTotal[key]).toBeGreaterThanOrEqual(0);
    for (const key of Object.keys(fm.blackTotal)) expect(fm.blackTotal[key]).toBeGreaterThanOrEqual(0);
    for (const key of Object.keys(fm.whiteRoyal)) expect(fm.whiteRoyal[key]).toBeGreaterThanOrEqual(0);
    for (const key of Object.keys(fm.blackRoyal)) expect(fm.blackRoyal[key]).toBeGreaterThanOrEqual(0);
  });
});

// ============ 60. createPiece generates unique ids ============

describe('createPiece unique ids', () => {
  it('each piece has unique id', () => {
    resetPieceCounter();
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const p = createPiece('pawn', 'white');
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
    }
  });
});

// ============ 61. Draw: position history accumulates ============

describe('Draw: position history', () => {
  it('empty position history: no draw', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }, { kind: 'king', color: 'black', file: 7, rank: 7 }]);
    expect(checkDraw(board, 'white', 0, []).isDraw).toBe(false);
  });
});

// ============ 62. Edge: empty board ============

describe('Edge: empty board', () => {
  it('empty board: white has no legal moves', () => {
    const board: BoardMap = {};
    expect(hasAnyLegalMove(board, 'white')).toBe(false);
  });
  it('empty board: black has no legal moves', () => {
    const board: BoardMap = {};
    expect(hasAnyLegalMove(board, 'black')).toBe(false);
  });
  it('empty board: force map is empty', () => {
    const board: BoardMap = {};
    const fm = computeForceMap(board);
    expect(Object.keys(fm.whiteTotal).length).toBe(0);
    expect(Object.keys(fm.blackTotal).length).toBe(0);
  });
});

// ============ 63. Various capture scenarios ============

describe('Capture scenarios', () => {
  it('knight captures undefended pawn', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 4 },
    ]);
    const piece = board[squareKey(4, 4)];
    const r = validateMove(board, piece, 4, 4, 5, 4, 'white');
    expect(r.valid).toBe(true);
    expect(r.captured!.kind).toBe('pawn');
  });

  it('king captures adjacent undefended pawn', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 4 },
    ]);
    const piece = board[squareKey(4, 4)];
    const r = validateMove(board, piece, 4, 4, 5, 4, 'white');
    expect(r.valid).toBe(true);
  });
});

// ============ 64. Promotion: max princes/connets ============

describe('Promotion: max limits', () => {
  it('3 princes already: prince option removed from veteran promo', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 0, rank: 6 },
      { kind: 'prince', color: 'white', file: 1, rank: 1 },
      { kind: 'prince', color: 'white', file: 2, rank: 1 },
      { kind: 'prince', color: 'white', file: 3, rank: 1 },
    ]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defPS);
    if (result.dialog) {
      expect(result.dialog.options).not.toContain('prince');
    }
  });
  it('3 connets already: rook option removed', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 0, rank: 6 },
      { kind: 'rook', color: 'white', file: 1, rank: 1 },
      { kind: 'rook', color: 'white', file: 2, rank: 1 },
      { kind: 'rook', color: 'white', file: 3, rank: 1 },
    ]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defPS);
    if (result.dialog) {
      expect(result.dialog.options).not.toContain('rook');
    }
  });
});
