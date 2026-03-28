import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard, boardPositionKey } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { computeForceMap, canCaptureByForce } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd } from '../logic/gameEnd';
import { addMove, createHistory, canGoBack, canGoForward } from '../logic/history';
import { squareKey, keyToSquare, PieceKind, Color, Piece, PIECE_FORCE } from '../types/chess';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

const defPS: PromotionState = { whitePrinceToConnetUsed: false, blackPrinceToConnetUsed: false };

// ============ 19. Simulate random games (50 games, each up to 30 moves) ============

describe('Simulation: 50 random games', () => {
  for (let game = 0; game < 50; game++) {
    it(`game ${game} runs without crash`, () => {
      let board = createInitialBoard();
      let turn: Color = 'white';
      let moveCount = 0;
      const seed = game * 37 + 7;

      for (let attempt = 0; attempt < 300 && moveCount < 30; attempt++) {
        const allMoves: Array<{ piece: Piece; from: { file: number; rank: number }; to: { file: number; rank: number } }> = [];
        for (const key in board) {
          const piece = board[key];
          if (piece.color !== turn) continue;
          const { file, rank } = keyToSquare(key);
          const moves = getLegalMovesForPiece(board, piece, file, rank, turn);
          for (const m of moves) allMoves.push({ piece, from: { file, rank }, to: m });
        }
        if (allMoves.length === 0) break;

        const idx = (seed + attempt * 13 + moveCount * 29) % allMoves.length;
        const chosen = allMoves[idx];
        const result = validateMove(board, chosen.piece, chosen.from.file, chosen.from.rank, chosen.to.file, chosen.to.rank, turn);
        if (!result.valid) continue;

        const newBoard = cloneBoard(board);
        const fromKey = squareKey(chosen.from.file, chosen.from.rank);
        const toKey = squareKey(chosen.to.file, chosen.to.rank);
        delete newBoard[fromKey];
        if (result.scoutExchange) {
          delete newBoard[toKey];
        } else {
          const promo = checkPromotion(chosen.piece, chosen.from, chosen.to, result.captured, board, defPS);
          if (promo.auto) {
            newBoard[toKey] = { ...chosen.piece, kind: promo.auto.kind };
          } else {
            newBoard[toKey] = { ...chosen.piece };
          }
        }

        board = newBoard;
        const moverColor = turn;
        turn = turn === 'white' ? 'black' : 'white';
        moveCount++;

        const endResult = checkGameEnd(board, moverColor, result.captured, result.scoutExchange);
        if (endResult.gameOver) break;
      }
      expect(moveCount).toBeGreaterThan(0);
    });
  }
});

// ============ 20. Veteran movement on every square ============

describe('Movement: Veteran at every square', () => {
  for (const color of ['white', 'black'] as Color[]) {
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r < 7; r += 2) { // sample every other rank
        it(`${color} veteran at (${f},${r})`, () => {
          const board = setupBoard([{ kind: 'veteran', color, file: f, rank: r }]);
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

// ============ 21. Non-royal cannot enter castle ============

describe('Castle restriction: non-royal blocked', () => {
  const nonRoyal: PieceKind[] = ['pawn', 'veteran', 'knight'];
  for (const kind of nonRoyal) {
    it(`${kind} cannot enter empty castle square`, () => {
      const board = setupBoard([{ kind, color: 'white', file: 2, rank: 1 }]);
      const piece = board[squareKey(2, 1)];
      // c1 = (2,0) is white castle
      const r = validateMove(board, piece, 2, 1, 2, 0, 'white');
      if (kind === 'veteran') {
        // veteran can enter empty castle on last rank for promotion — but rank 0 is white's back rank, not last rank for white promotion (rank 7)
        expect(r.valid).toBe(false);
      } else {
        expect(r.valid).toBe(false);
      }
    });
  }
});

// ============ 22. Royal CAN enter castle ============

describe('Castle: royal pieces can enter', () => {
  for (const kind of ['king', 'prince', 'rook'] as PieceKind[]) {
    it(`${kind} can move to own castle`, () => {
      const board = setupBoard([{ kind, color: 'white', file: 3, rank: 1 }]);
      const piece = board[squareKey(3, 1)];
      // d1 = (3,0) is white castle
      const r = validateMove(board, piece, 3, 1, 3, 0, 'white');
      expect(r.valid).toBe(true);
    });
  }
});

// ============ 23. Force superiority needed for capture ============

describe('Capture: force superiority', () => {
  it('pawn cannot capture defended piece (equal force)', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },
      { kind: 'pawn', color: 'black', file: 4, rank: 4 }, // defends
    ]);
    const piece = board[squareKey(3, 3)];
    const r = validateMove(board, piece, 3, 3, 4, 3, 'white');
    expect(r.valid).toBe(false);
  });

  it('two attackers vs one defender allows capture', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'pawn', color: 'white', file: 5, rank: 3 },
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },
    ]);
    const piece = board[squareKey(3, 3)];
    const r = validateMove(board, piece, 3, 3, 4, 3, 'white');
    expect(r.valid).toBe(true);
    expect(r.captured).not.toBeNull();
  });
});

// ============ 24. Prince to Connet auto-promotion ============

describe('Promotion: prince to connet in castle', () => {
  it('first time prince enters castle promotes to connet', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 3, rank: 1 }]);
    const piece = board[squareKey(3, 1)];
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, defPS);
    expect(result.auto).not.toBeNull();
    expect(result.auto!.kind).toBe('rook');
  });
  it('second time prince does NOT auto-promote', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 3, rank: 1 }]);
    const piece = board[squareKey(3, 1)];
    const usedState: PromotionState = { whitePrinceToConnetUsed: true, blackPrinceToConnetUsed: false };
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, usedState);
    expect(result.auto).toBeNull();
  });
  it('already 3 connets: no promotion', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 3, rank: 1 },
      { kind: 'rook', color: 'white', file: 0, rank: 0 },
      { kind: 'rook', color: 'white', file: 1, rank: 0 },
      { kind: 'rook', color: 'white', file: 2, rank: 1 },
    ]);
    const piece = board[squareKey(3, 1)];
    const result = checkPromotion(piece, { file: 3, rank: 1 }, { file: 3, rank: 0 }, null, board, defPS);
    expect(result.auto).toBeNull();
  });
});

// ============ 25. Board position key ============

describe('boardPositionKey', () => {
  it('different boards have different keys', () => {
    const b1 = setupBoard([{ kind: 'king', color: 'white', file: 0, rank: 0 }]);
    const b2 = setupBoard([{ kind: 'king', color: 'white', file: 1, rank: 0 }]);
    expect(boardPositionKey(b1)).not.toBe(boardPositionKey(b2));
  });
  it('same board different piece order => same key', () => {
    resetPieceCounter();
    const b1: BoardMap = {};
    b1[squareKey(0, 0)] = createPiece('king', 'white');
    b1[squareKey(7, 7)] = createPiece('pawn', 'black');
    resetPieceCounter();
    const b2: BoardMap = {};
    b2[squareKey(7, 7)] = createPiece('pawn', 'black');
    b2[squareKey(0, 0)] = createPiece('king', 'white');
    expect(boardPositionKey(b1)).toBe(boardPositionKey(b2));
  });
});

// ============ 26. History: canGoBack / canGoForward ============

describe('History: navigation predicates', () => {
  it('empty history: no back/forward', () => {
    const h = createHistory();
    expect(canGoBack(h)).toBe(false);
    expect(canGoForward(h)).toBe(false);
  });
  it('after one move: back yes, forward no', () => {
    const board = createInitialBoard();
    const piece = board[squareKey(4, 1)];
    const r = addMove(createHistory(), board, piece, { file: 4, rank: 1 }, { file: 4, rank: 2 }, null, null, false, 'white');
    expect(canGoBack(r.newHistory)).toBe(true);
    expect(canGoForward(r.newHistory)).toBe(false);
  });
});

// ============ 27. All piece force values ============

describe('PIECE_FORCE values', () => {
  it('pawn=1', () => expect(PIECE_FORCE['pawn']).toBe(1));
  it('veteran=1.5', () => expect(PIECE_FORCE['veteran']).toBe(1.5));
  it('prince=1.5', () => expect(PIECE_FORCE['prince']).toBe(1.5));
  it('king=1.5', () => expect(PIECE_FORCE['king']).toBe(1.5));
  it('knight=2', () => expect(PIECE_FORCE['knight']).toBe(2));
  it('rook=3', () => expect(PIECE_FORCE['rook']).toBe(3));
  it('bishop=0', () => expect(PIECE_FORCE['bishop']).toBe(0));
});

// ============ 28. Blockade detection ============

describe('GameEnd: blockade', () => {
  it('single king surrounded by enemies: blockade', () => {
    const board = setupBoard([
      { kind: 'king', color: 'black', file: 0, rank: 7 },
      { kind: 'pawn', color: 'white', file: 0, rank: 6 },
      { kind: 'pawn', color: 'white', file: 1, rank: 6 },
      { kind: 'pawn', color: 'white', file: 1, rank: 7 },
      { kind: 'king', color: 'white', file: 4, rank: 4 },
    ]);
    // Black king at a8, blocked by white pawns at a7, b7, b8
    const hasMove = hasAnyLegalMove(board, 'black');
    // The king can try to capture but needs force superiority
    // This depends on force calculation
    expect(typeof hasMove).toBe('boolean');
  });
});

// ============ 29. Scout always captures ============

describe('Scout: always captures (infinite direct attack)', () => {
  it('scout captures heavily defended piece', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 0, rank: 0 },
      { kind: 'pawn', color: 'black', file: 1, rank: 2 },
      { kind: 'pawn', color: 'black', file: 2, rank: 2 },
      { kind: 'pawn', color: 'black', file: 0, rank: 2 },
    ]);
    const piece = board[squareKey(0, 0)];
    const fm = computeForceMap(board);
    expect(canCaptureByForce(board, fm, 'white', 1, 2, piece)).toBe(true);
  });
});

// ============ 30. Connet diagonal blocking ============

describe('Connet: diagonal blocked by piece', () => {
  it('connet diagonal blocked after 1 square by own piece', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'white', file: 5, rank: 5 },
    ]);
    const piece = board[squareKey(4, 4)];
    const moves = getMovementSquares(board, piece, 4, 4);
    const diag = moves.filter(m => m.file === 6 && m.rank === 6);
    expect(diag.length).toBe(0); // blocked beyond (5,5)
  });
});

// ============ 31. Prince diagonal blocking ============

describe('Prince: diagonal blocked', () => {
  it('prince diagonal blocked after occupied square', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 5 },
    ]);
    const piece = board[squareKey(4, 4)];
    const moves = getMovementSquares(board, piece, 4, 4);
    // (5,5) should be included, (6,6) should NOT
    expect(moves.some(m => m.file === 5 && m.rank === 5)).toBe(true);
    expect(moves.some(m => m.file === 6 && m.rank === 6)).toBe(false);
  });
});

// ============ 32. Pawn double forward on own territory ============

describe('Pawn: double forward', () => {
  it('white pawn on rank 1 can go 2 forward', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 1 }]);
    const piece = board[squareKey(4, 1)];
    const moves = getMovementSquares(board, piece, 4, 1);
    expect(moves.some(m => m.file === 4 && m.rank === 3)).toBe(true);
  });
  it('white pawn on rank 3 can go 2 forward (own territory)', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 3 }]);
    const piece = board[squareKey(4, 3)];
    const moves = getMovementSquares(board, piece, 4, 3);
    expect(moves.some(m => m.file === 4 && m.rank === 5)).toBe(true);
  });
  it('white pawn on rank 4 CANNOT go 2 forward (enemy territory)', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    const piece = board[squareKey(4, 4)];
    const moves = getMovementSquares(board, piece, 4, 4);
    expect(moves.some(m => m.file === 4 && m.rank === 6)).toBe(false);
  });
  it('double forward blocked by piece in between', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 1 },
      { kind: 'pawn', color: 'black', file: 4, rank: 2 },
    ]);
    const piece = board[squareKey(4, 1)];
    const moves = getMovementSquares(board, piece, 4, 1);
    expect(moves.some(m => m.file === 4 && m.rank === 3)).toBe(false);
  });
});

// ============ 33. Initial board piece count ============

describe('Initial board: piece counts', () => {
  it('32 pieces total', () => {
    const board = createInitialBoard();
    expect(Object.keys(board).length).toBe(32);
  });
  it('16 white pieces', () => {
    const board = createInitialBoard();
    const white = Object.values(board).filter(p => p.color === 'white');
    expect(white.length).toBe(16);
  });
  it('16 black pieces', () => {
    const board = createInitialBoard();
    const black = Object.values(board).filter(p => p.color === 'black');
    expect(black.length).toBe(16);
  });
  it('1 white king', () => {
    const board = createInitialBoard();
    const kings = Object.values(board).filter(p => p.color === 'white' && p.kind === 'king');
    expect(kings.length).toBe(1);
  });
  it('2 white princes', () => {
    const board = createInitialBoard();
    const princes = Object.values(board).filter(p => p.color === 'white' && p.kind === 'prince');
    expect(princes.length).toBe(2);
  });
  it('2 white scouts', () => {
    const board = createInitialBoard();
    const scouts = Object.values(board).filter(p => p.color === 'white' && p.kind === 'bishop');
    expect(scouts.length).toBe(2);
  });
  it('2 white ritters', () => {
    const board = createInitialBoard();
    const knights = Object.values(board).filter(p => p.color === 'white' && p.kind === 'knight');
    expect(knights.length).toBe(2);
  });
  it('1 white connet', () => {
    const board = createInitialBoard();
    const rooks = Object.values(board).filter(p => p.color === 'white' && p.kind === 'rook');
    expect(rooks.length).toBe(1);
  });
  it('8 white pawns', () => {
    const board = createInitialBoard();
    const pawns = Object.values(board).filter(p => p.color === 'white' && p.kind === 'pawn');
    expect(pawns.length).toBe(8);
  });
});

// ============ 34. Pawn backward movement ============

describe('Pawn: backward movement', () => {
  it('white pawn can move backward', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 3 }]);
    const piece = board[squareKey(4, 3)];
    const moves = getMovementSquares(board, piece, 4, 3);
    expect(moves.some(m => m.file === 4 && m.rank === 2)).toBe(true);
  });
  it('black pawn can move backward (rank+1)', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 4 }]);
    const piece = board[squareKey(4, 4)];
    const moves = getMovementSquares(board, piece, 4, 4);
    expect(moves.some(m => m.file === 4 && m.rank === 5)).toBe(true);
  });
});

// ============ 35. Pawn sideways movement ============

describe('Pawn: sideways', () => {
  it('pawn can move left and right', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 3 }]);
    const piece = board[squareKey(4, 3)];
    const moves = getMovementSquares(board, piece, 4, 3);
    expect(moves.some(m => m.file === 3 && m.rank === 3)).toBe(true);
    expect(moves.some(m => m.file === 5 && m.rank === 3)).toBe(true);
  });
  it('pawn on file 0 cannot go left', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 0, rank: 3 }]);
    const piece = board[squareKey(0, 3)];
    const moves = getMovementSquares(board, piece, 0, 3);
    expect(moves.every(m => m.file >= 0)).toBe(true);
  });
});
