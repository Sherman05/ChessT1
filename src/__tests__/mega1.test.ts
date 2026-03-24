import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard, boardPositionKey } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { computeForceMap, isKingInCheck, getEffectiveAttack, getEffectiveDefense, canCaptureByForce } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd, checkDraw } from '../logic/gameEnd';
import { addMove, createHistory, goBack, goForward, canGoBack, canGoForward } from '../logic/history';
import { squareKey, keyToSquare, isCastleSquare, PieceKind, Color, Piece, ALL_PIECE_KINDS, PIECE_FORCE, isRoyalPiece, CASTLE_WHITE, CASTLE_BLACK, getCastleSquares, getEnemyCastleSquares } from '../types/chess';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

const defaultPromoState: PromotionState = { whitePrinceToConnetUsed: false, blackPrinceToConnetUsed: false };

// ============ 1. Movement tests for every piece at every position ============

describe('Movement: King at every square', () => {
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      it(`king at (${f},${r}) has valid moves`, () => {
        const board = setupBoard([{ kind: 'king', color: 'white', file: f, rank: r }]);
        const piece = board[squareKey(f, r)];
        const moves = getMovementSquares(board, piece, f, r);
        expect(moves.length).toBeGreaterThan(0);
        expect(moves.length).toBeLessThanOrEqual(8);
        for (const m of moves) {
          expect(Math.abs(m.file - f)).toBeLessThanOrEqual(1);
          expect(Math.abs(m.rank - r)).toBeLessThanOrEqual(1);
          expect(m.file).toBeGreaterThanOrEqual(0);
          expect(m.file).toBeLessThanOrEqual(7);
        }
      });
    }
  }
});

describe('Movement: Pawn at every square', () => {
  for (const color of ['white', 'black'] as Color[]) {
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r < 7; r++) {
        it(`${color} pawn at (${f},${r})`, () => {
          const board = setupBoard([{ kind: 'pawn', color, file: f, rank: r }]);
          const piece = board[squareKey(f, r)];
          const moves = getMovementSquares(board, piece, f, r);
          expect(moves.length).toBeGreaterThanOrEqual(2);
          for (const m of moves) {
            expect(m.file).toBeGreaterThanOrEqual(0);
            expect(m.file).toBeLessThanOrEqual(7);
            expect(m.rank).toBeGreaterThanOrEqual(0);
            expect(m.rank).toBeLessThanOrEqual(7);
          }
        });
      }
    }
  }
});

describe('Movement: Knight (Ritter) at every square', () => {
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      it(`knight at (${f},${r})`, () => {
        const board = setupBoard([{ kind: 'knight', color: 'white', file: f, rank: r }]);
        const piece = board[squareKey(f, r)];
        const moves = getMovementSquares(board, piece, f, r);
        expect(moves.length).toBeGreaterThan(0);
        for (const m of moves) {
          const df = Math.abs(m.file - f);
          const dr = Math.abs(m.rank - r);
          expect(df + dr).toBeGreaterThanOrEqual(1);
          expect(df + dr).toBeLessThanOrEqual(2);
          expect(df).toBeLessThanOrEqual(2);
          expect(dr).toBeLessThanOrEqual(2);
        }
      });
    }
  }
});

describe('Movement: Prince at every square', () => {
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      it(`prince at (${f},${r})`, () => {
        const board = setupBoard([{ kind: 'prince', color: 'white', file: f, rank: r }]);
        const piece = board[squareKey(f, r)];
        const moves = getMovementSquares(board, piece, f, r);
        expect(moves.length).toBeGreaterThan(0);
        for (const m of moves) {
          expect(m.file).toBeGreaterThanOrEqual(0);
          expect(m.rank).toBeGreaterThanOrEqual(0);
          expect(m.file).toBeLessThanOrEqual(7);
          expect(m.rank).toBeLessThanOrEqual(7);
        }
      });
    }
  }
});

describe('Movement: Connet (rook) at every square', () => {
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      it(`connet at (${f},${r})`, () => {
        const board = setupBoard([{ kind: 'rook', color: 'black', file: f, rank: r }]);
        const piece = board[squareKey(f, r)];
        const moves = getMovementSquares(board, piece, f, r);
        expect(moves.length).toBeGreaterThan(0);
        for (const m of moves) {
          expect(m.file).toBeGreaterThanOrEqual(0);
          expect(m.rank).toBeGreaterThanOrEqual(0);
        }
      });
    }
  }
});

// ============ 2. Force map tests ============

describe('Force: initial board force symmetry', () => {
  it('white and black have equal total force on their own pawn rows', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    let whiteForceRank1 = 0;
    let blackForceRank6 = 0;
    for (let f = 0; f < 8; f++) {
      whiteForceRank1 += fm.whiteTotal[squareKey(f, 1)] || 0;
      blackForceRank6 += fm.blackTotal[squareKey(f, 6)] || 0;
    }
    expect(whiteForceRank1).toBe(blackForceRank6);
  });

  it('force map keys are valid squares', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    for (const key of Object.keys(fm.whiteTotal)) {
      const sq = keyToSquare(key);
      expect(sq.file).toBeGreaterThanOrEqual(0);
      expect(sq.file).toBeLessThanOrEqual(7);
      expect(sq.rank).toBeGreaterThanOrEqual(0);
      expect(sq.rank).toBeLessThanOrEqual(7);
    }
  });

  it('royal force never exceeds total force', () => {
    const board = createInitialBoard();
    const fm = computeForceMap(board);
    for (const key of Object.keys(fm.whiteTotal)) {
      expect(fm.whiteRoyal[key] || 0).toBeLessThanOrEqual(fm.whiteTotal[key] || 0);
    }
    for (const key of Object.keys(fm.blackTotal)) {
      expect(fm.blackRoyal[key] || 0).toBeLessThanOrEqual(fm.blackTotal[key] || 0);
    }
  });
});

describe('Force: single piece force projection', () => {
  const kinds: PieceKind[] = ['king', 'prince', 'rook', 'knight', 'pawn', 'veteran'];
  for (const kind of kinds) {
    it(`${kind} projects correct force value`, () => {
      const board = setupBoard([{ kind, color: 'white', file: 4, rank: 4 }]);
      const fm = computeForceMap(board);
      const ownForce = fm.whiteTotal[squareKey(4, 4)] || 0;
      expect(ownForce).toBe(PIECE_FORCE[kind]);
    });
  }
  it('scout projects zero force', () => {
    const board = setupBoard([{ kind: 'bishop', color: 'white', file: 4, rank: 4 }]);
    const fm = computeForceMap(board);
    expect(fm.whiteTotal[squareKey(4, 4)] || 0).toBe(0);
  });
});

// ============ 3. Castle square tests ============

describe('Castle: square identification', () => {
  for (const key of CASTLE_WHITE) {
    it(`${key} is white castle`, () => {
      const sq = keyToSquare(key);
      expect(isCastleSquare(sq.file, sq.rank)).toBe(true);
    });
  }
  for (const key of CASTLE_BLACK) {
    it(`${key} is black castle`, () => {
      const sq = keyToSquare(key);
      expect(isCastleSquare(sq.file, sq.rank)).toBe(true);
    });
  }
  it('non-castle squares', () => {
    expect(isCastleSquare(0, 0)).toBe(false);
    expect(isCastleSquare(1, 0)).toBe(false);
    expect(isCastleSquare(6, 0)).toBe(false);
    expect(isCastleSquare(7, 0)).toBe(false);
    expect(isCastleSquare(0, 7)).toBe(false);
    expect(isCastleSquare(4, 4)).toBe(false);
  });
  it('getCastleSquares returns correct sides', () => {
    expect(getCastleSquares('white')).toEqual(CASTLE_WHITE);
    expect(getCastleSquares('black')).toEqual(CASTLE_BLACK);
  });
  it('getEnemyCastleSquares returns opposite', () => {
    expect(getEnemyCastleSquares('white')).toEqual(CASTLE_BLACK);
    expect(getEnemyCastleSquares('black')).toEqual(CASTLE_WHITE);
  });
});

// ============ 4. Royal piece identification ============

describe('Royal piece identification', () => {
  it('king is royal', () => expect(isRoyalPiece('king')).toBe(true));
  it('prince is royal', () => expect(isRoyalPiece('prince')).toBe(true));
  it('rook is royal', () => expect(isRoyalPiece('rook')).toBe(true));
  it('bishop is NOT royal', () => expect(isRoyalPiece('bishop')).toBe(false));
  it('knight is NOT royal', () => expect(isRoyalPiece('knight')).toBe(false));
  it('pawn is NOT royal', () => expect(isRoyalPiece('pawn')).toBe(false));
  it('veteran is NOT royal', () => expect(isRoyalPiece('veteran')).toBe(false));
});

// ============ 5. Game end: king capture ============

describe('GameEnd: king capture', () => {
  it('capturing black king ends game for white', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    const capturedKing = createPiece('king', 'black');
    const result = checkGameEnd(board, 'white', capturedKing, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });
  it('capturing white king ends game for black', () => {
    const board = setupBoard([{ kind: 'king', color: 'black', file: 4, rank: 4 }]);
    const capturedKing = createPiece('king', 'white');
    const result = checkGameEnd(board, 'black', capturedKing, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('black');
  });
  it('capturing non-king does NOT end game alone', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 0, rank: 0 },
      { kind: 'king', color: 'black', file: 7, rank: 7 },
    ]);
    const capturedPawn = createPiece('pawn', 'black');
    const result = checkGameEnd(board, 'white', capturedPawn, false);
    expect(result.gameOver).toBe(false);
  });
});

// ============ 6. Game end: castle capture ============

describe('GameEnd: castle victory', () => {
  it('white king on black castle wins', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 7 },
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });
  it('black prince on white castle wins', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'black', file: 4, rank: 0 },
      { kind: 'king', color: 'white', file: 7, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'black', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('black');
  });
  it('castle defended by own royal: no win', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 7 },
      { kind: 'king', color: 'black', file: 4, rank: 7 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(false);
  });
});

// ============ 7. Draw: 40-move rule ============

describe('Draw: 40-move rule', () => {
  it('80 half-moves without capture is draw', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }, { kind: 'king', color: 'black', file: 7, rank: 7 }]);
    const result = checkDraw(board, 'white', 80, []);
    expect(result.isDraw).toBe(true);
  });
  it('79 half-moves is NOT draw', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }, { kind: 'king', color: 'black', file: 7, rank: 7 }]);
    const result = checkDraw(board, 'white', 79, []);
    expect(result.isDraw).toBe(false);
  });
});

// ============ 8. Draw: threefold repetition ============

describe('Draw: threefold repetition', () => {
  it('position appearing 3 times is draw', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }]);
    const posKey = boardPositionKey(board) + '|white';
    const history = [posKey, posKey, posKey];
    const result = checkDraw(board, 'white', 0, history);
    expect(result.isDraw).toBe(true);
  });
  it('position appearing 2 times is NOT draw', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }]);
    const posKey = boardPositionKey(board) + '|white';
    const history = [posKey, posKey];
    const result = checkDraw(board, 'white', 0, history);
    expect(result.isDraw).toBe(false);
  });
});

// ============ 9. Validate move: basic checks ============

describe('ValidateMove: basic', () => {
  it('cannot move opponent piece', () => {
    const board = createInitialBoard();
    const piece = board[squareKey(4, 6)]; // black pawn
    const r = validateMove(board, piece, 4, 6, 4, 5, 'white');
    expect(r.valid).toBe(false);
  });
  it('cannot stay on same square', () => {
    const board = createInitialBoard();
    const piece = board[squareKey(4, 1)];
    const r = validateMove(board, piece, 4, 1, 4, 1, 'white');
    expect(r.valid).toBe(false);
  });
  it('cannot move to square with own piece', () => {
    const board = createInitialBoard();
    const piece = board[squareKey(4, 0)]; // king
    const r = validateMove(board, piece, 4, 0, 4, 1, 'white'); // own pawn there
    expect(r.valid).toBe(false);
  });
  it('out of bounds is invalid', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 0, rank: 0 }]);
    const piece = board[squareKey(0, 0)];
    const r = validateMove(board, piece, 0, 0, -1, 0, 'white');
    expect(r.valid).toBe(false);
  });
});

// ============ 10. Legal moves count for initial position pieces ============

describe('Legal moves: initial position piece counts', () => {
  const board = createInitialBoard();

  it('white pawns have moves', () => {
    for (let f = 0; f < 8; f++) {
      const piece = board[squareKey(f, 1)];
      const moves = getLegalMovesForPiece(board, piece, f, 1, 'white');
      expect(moves.length).toBeGreaterThan(0);
    }
  });

  it('white knights have moves', () => {
    for (const f of [0, 7]) {
      const piece = board[squareKey(f, 0)];
      const moves = getLegalMovesForPiece(board, piece, f, 0, 'white');
      expect(moves.length).toBeGreaterThan(0);
    }
  });

  it('black pawns have moves', () => {
    for (let f = 0; f < 8; f++) {
      const piece = board[squareKey(f, 6)];
      const moves = getLegalMovesForPiece(board, piece, f, 6, 'black');
      expect(moves.length).toBeGreaterThan(0);
    }
  });

  it('both sides have legal moves in initial position', () => {
    expect(hasAnyLegalMove(board, 'white')).toBe(true);
    expect(hasAnyLegalMove(board, 'black')).toBe(true);
  });
});

// ============ 11. Promotion: pawn to veteran ============

describe('Promotion: pawn to veteran', () => {
  it('white pawn reaching rank 5 promotes to veteran', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 3, rank: 4 }]);
    const piece = board[squareKey(3, 4)];
    const result = checkPromotion(piece, { file: 3, rank: 4 }, { file: 3, rank: 5 }, null, board, defaultPromoState);
    expect(result.auto).not.toBeNull();
    expect(result.auto!.kind).toBe('veteran');
  });
  it('black pawn reaching rank 2 promotes to veteran', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 3, rank: 3 }]);
    const piece = board[squareKey(3, 3)];
    const result = checkPromotion(piece, { file: 3, rank: 3 }, { file: 3, rank: 2 }, null, board, defaultPromoState);
    expect(result.auto).not.toBeNull();
    expect(result.auto!.kind).toBe('veteran');
  });
  it('white pawn NOT on rank 5 does not promote', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 3, rank: 3 }]);
    const piece = board[squareKey(3, 3)];
    const result = checkPromotion(piece, { file: 3, rank: 3 }, { file: 3, rank: 4 }, null, board, defaultPromoState);
    expect(result.auto).toBeNull();
  });
});

// ============ 12. Promotion: veteran on last rank ============

describe('Promotion: veteran on flank', () => {
  it('white veteran reaching rank 7 flank gets dialog', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'white', file: 0, rank: 6 }]);
    const piece = board[squareKey(0, 6)];
    const result = checkPromotion(piece, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(result.dialog).not.toBeNull();
    expect(result.dialog!.options.length).toBeGreaterThan(0);
  });
  it('black veteran reaching rank 0 flank gets dialog', () => {
    const board = setupBoard([{ kind: 'veteran', color: 'black', file: 7, rank: 1 }]);
    const piece = board[squareKey(7, 1)];
    const result = checkPromotion(piece, { file: 7, rank: 1 }, { file: 7, rank: 0 }, null, board, defaultPromoState);
    expect(result.dialog).not.toBeNull();
  });
});

// ============ 13. History: undo/redo consistency ============

describe('History: multi-step undo/redo', () => {
  it('3 moves then undo all then redo all', () => {
    let board = createInitialBoard();
    let hist = createHistory();
    const moves = [
      { from: { file: 4, rank: 1 }, to: { file: 4, rank: 2 }, turn: 'white' as Color },
      { from: { file: 4, rank: 6 }, to: { file: 4, rank: 5 }, turn: 'black' as Color },
      { from: { file: 3, rank: 1 }, to: { file: 3, rank: 2 }, turn: 'white' as Color },
    ];
    for (const mv of moves) {
      const piece = board[squareKey(mv.from.file, mv.from.rank)];
      const r = addMove(hist, board, piece, mv.from, mv.to, null, null, false, mv.turn);
      board = r.newBoard;
      hist = r.newHistory;
    }
    expect(hist.moveIndex).toBe(2);

    // Undo all
    for (let i = 0; i < 3; i++) {
      const back = goBack(hist);
      expect(back).not.toBeNull();
      board = back!.board;
      hist = { ...hist, moveIndex: back!.newMoveIndex };
    }
    expect(hist.moveIndex).toBe(-1);
    expect(canGoBack(hist)).toBe(false);

    // Redo all
    for (let i = 0; i < 3; i++) {
      const fwd = goForward(hist);
      expect(fwd).not.toBeNull();
      board = fwd!.board;
      hist = { ...hist, moveIndex: fwd!.newMoveIndex };
    }
    expect(hist.moveIndex).toBe(2);
    expect(canGoForward(hist)).toBe(false);
  });
});

// ============ 14. Board cloning ============

describe('Board: cloning', () => {
  it('clone is a deep copy', () => {
    const board = createInitialBoard();
    const clone = cloneBoard(board);
    expect(boardPositionKey(board)).toBe(boardPositionKey(clone));
    // Mutating clone doesn't affect original
    delete clone[squareKey(4, 0)];
    expect(board[squareKey(4, 0)]).toBeDefined();
  });
  it('clone preserves all pieces', () => {
    const board = createInitialBoard();
    const clone = cloneBoard(board);
    expect(Object.keys(clone).length).toBe(Object.keys(board).length);
  });
});

// ============ 15. squareKey / keyToSquare roundtrip ============

describe('squareKey roundtrip', () => {
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      it(`(${f},${r}) roundtrips`, () => {
        const key = squareKey(f, r);
        const sq = keyToSquare(key);
        expect(sq.file).toBe(f);
        expect(sq.rank).toBe(r);
      });
    }
  }
});

// ============ 16. isKingInCheck tests ============

describe('isKingInCheck', () => {
  it('white king alone: not in check', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 4, rank: 4 }]);
    expect(isKingInCheck(board, 'white')).toBe(false);
  });
  it('black scout can check white king', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'bishop', color: 'black', file: 3, rank: 2 }, // L-shape to (4,4)
    ]);
    expect(isKingInCheck(board, 'white')).toBe(true);
  });
  it('no king on board: returns false', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    expect(isKingInCheck(board, 'white')).toBe(false);
  });
});

// ============ 17. Scout exchange ============

describe('Scout exchange on castle', () => {
  it('scout taking on castle square returns scoutExchange', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 2, rank: 2 },
      { kind: 'pawn', color: 'black', file: 3, rank: 0 }, // d1 castle
    ]);
    const piece = board[squareKey(2, 2)];
    const r = validateMove(board, piece, 2, 2, 3, 0, 'white');
    // Scout L-shape: (2,2) -> (3,0): df=1,dr=2 => L-shape
    expect(r.valid).toBe(true);
    expect(r.scoutExchange).toBe(true);
  });
});

// ============ 18. Effective attack on castle squares ============

describe('Effective attack on castle', () => {
  it('non-royal force alone on castle is 0', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 3, rank: 1 }]);
    const fm = computeForceMap(board);
    // pawn projects force but no royal piece
    const attack = getEffectiveAttack(fm, 'white', 3, 0); // d1 castle
    expect(attack).toBe(0);
  });
  it('royal force on castle counts', () => {
    const board = setupBoard([{ kind: 'king', color: 'white', file: 3, rank: 1 }]);
    const fm = computeForceMap(board);
    const attack = getEffectiveAttack(fm, 'white', 3, 0);
    expect(attack).toBeGreaterThan(0);
  });
});
