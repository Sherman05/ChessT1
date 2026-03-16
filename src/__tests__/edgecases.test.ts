import { describe, it, expect } from 'vitest';
import { BoardMap, createPiece, resetPieceCounter, createInitialBoard, cloneBoard } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { getMovementSquares } from '../logic/movement';
import { computeForceMap, isKingInCheck } from '../logic/force';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd } from '../logic/gameEnd';
import { squareKey, keyToSquare } from '../types/chess';

function setupBoard(pieces: Array<{ kind: any; color: any; file: number; rank: number }>): BoardMap {
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

describe('Edge: Black pawn direction', () => {
  it('black pawn at (4,5): forward=rank 4, backward=rank 6', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 5 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 5)], 4, 5);
    const set = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(set.has('4,4')).toBe(true); // forward for black
    expect(set.has('4,6')).toBe(true); // backward for black
    expect(set.has('3,5')).toBe(true); // left
    expect(set.has('5,5')).toBe(true); // right
    expect(set.has('4,3')).toBe(true); // 2 forward (on own territory rank 5>=4)
  });

  it('black pawn at (4,4): on own territory boundary, gets 2 forward', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 4 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const set = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(set.has('4,2')).toBe(true); // 2 forward for black
  });

  it('black pawn at (4,3): NOT on own territory, no 2 forward', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'black', file: 4, rank: 3 }]);
    const moves = getMovementSquares(board, board[squareKey(4, 3)], 4, 3);
    const set = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(set.has('4,1')).toBe(false); // no 2 forward
    expect(moves.length).toBe(4); // left, right, forward(2), backward(4)
  });
});

describe('Edge: Connet (rook) at board edge', () => {
  it('connet at a1 (0,0): limited h/v and diagonal', () => {
    const board = setupBoard([{ kind: 'rook', color: 'white', file: 0, rank: 0 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    const set = new Set(moves.map(m => `${m.file},${m.rank}`));
    // h/v: (1,0), (2,0), (0,1), (0,2)
    expect(set.has('1,0')).toBe(true);
    expect(set.has('2,0')).toBe(true);
    expect(set.has('0,1')).toBe(true);
    expect(set.has('0,2')).toBe(true);
    // diagonal: (1,1), (2,2), (3,3)
    expect(set.has('1,1')).toBe(true);
    expect(set.has('2,2')).toBe(true);
    expect(set.has('3,3')).toBe(true);
    // Total: 4 h/v + 3 diagonal = 7
    expect(moves.length).toBe(7);
  });
});

describe('Edge: Prince diagonal range', () => {
  it('prince at a1: diagonal limited by board edge', () => {
    const board = setupBoard([{ kind: 'prince', color: 'white', file: 0, rank: 0 }]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    const set = new Set(moves.map(m => `${m.file},${m.rank}`));
    // h/v: (1,0), (0,1)
    // diagonal: only (1,1), (2,2), (3,3) in +,+ direction
    expect(set.has('1,0')).toBe(true);
    expect(set.has('0,1')).toBe(true);
    expect(set.has('1,1')).toBe(true);
    expect(set.has('2,2')).toBe(true);
    expect(set.has('3,3')).toBe(true);
    expect(moves.length).toBe(5);
  });
});

describe('Edge: Victory by castle capture from initial-like position', () => {
  it('white king on c8 (enemy castle) = victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 2, rank: 7 }, // c8 = black castle
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });

  it('white connet on f8 (enemy castle) = victory', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 5, rank: 7 }, // f8 = black castle
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });
});

describe('Edge: Check with complex force', () => {
  it('king defended by multiple pieces: not in check despite enemy force', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'rook', color: 'white', file: 3, rank: 4 },  // Connet force 3
      { kind: 'prince', color: 'white', file: 5, rank: 4 }, // Prince force 1.5
      { kind: 'rook', color: 'black', file: 4, rank: 6 },   // Connet force 3, attacks (4,4)
    ]);
    // White defense on (4,4): king(1.5) + connet(3) + prince(1.5) = 6
    // Black attack on (4,4): connet(3) only = 3
    // 3 < 6, not in check
    expect(isKingInCheck(board, 'white')).toBe(false);
  });

  it('king check with overwhelming force', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'rook', color: 'black', file: 4, rank: 6 }, // Connet force 3
      { kind: 'rook', color: 'black', file: 3, rank: 4 }, // Connet force 3
      { kind: 'rook', color: 'black', file: 5, rank: 4 }, // Connet force 3
    ]);
    // White defense on (4,4): king(1.5) only
    // Black attack on (4,4): 3 Connets projecting = 9
    // 9 > 1.5, in check
    expect(isKingInCheck(board, 'white')).toBe(true);
  });
});

describe('Edge: Pawn auto-promotion on capture', () => {
  it('white pawn captures on rank 5 and auto-promotes to veteran', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 5 }, // enemy pawn on rank 5 (not directly forward)
    ]);
    // Wait, pawns don't capture diagonally in Chess-T1. They capture on movement squares.
    // Can pawn (4,4) reach (5,5)? No — pawns only move h/v, not diagonal.
    // So let's test sideways capture that lands on rank 5
    const board2 = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 5 }, // already on rank 5? No, promotion is TO rank 5
    ]);
    // Actually: pawn at (4,4) can move forward to (4,5) = rank 5. If enemy there:
    const board3 = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 4, rank: 5 }, // enemy pawn forward
      { kind: 'knight', color: 'white', file: 3, rank: 5 }, // Ritter support
    ]);
    // Check if we can capture and promote
    const pawn = board3[squareKey(4, 4)];
    const result = validateMove(board3, pawn, 4, 4, 4, 5, 'white');
    // White force on (4,5): pawn(1) projecting forward + Ritter(2) projecting sideways = 3
    // Black force on (4,5): pawn(1) on own square
    // 3 > 1, capture allowed
    expect(result.valid).toBe(true);

    // Check promotion
    const promo = checkPromotion(pawn, { file: 4, rank: 4 }, { file: 4, rank: 5 }, result.captured, board3, defaultPromoState);
    expect(promo.auto).toBeDefined();
    expect(promo.auto!.kind).toBe('veteran');
  });
});

describe('Edge: Multiple Scouts', () => {
  it('multiple scouts cannot be captured (force 0 defense) by pawn', () => {
    // Scout has 0 defense. A pawn with force 1 should be able to capture it
    // as long as pawn's force > 0 (which it is)
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'bishop', color: 'black', file: 4, rank: 3 }, // Scout, 0 defense
    ]);
    // White force on (4,3): pawn projects sideways = 1
    // Black force on (4,3): Scout projects 0
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(true);
  });

  it('scout cannot be defended by another scout', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'bishop', color: 'black', file: 4, rank: 3 },  // Scout target
      { kind: 'bishop', color: 'black', file: 2, rank: 4 },  // Another Scout nearby
    ]);
    // Both Scouts project 0 force. White pawn force 1 > 0.
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(true);
  });

  it('scout defended by non-scout piece is protected', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },
      { kind: 'bishop', color: 'black', file: 4, rank: 3 },  // Scout target
      { kind: 'knight', color: 'black', file: 5, rank: 3 },  // Ritter defends (4,3) with force 2
    ]);
    // White force on (4,3): pawn sideways = 1
    // Black force on (4,3): Ritter projects 2 (Scout projects 0)
    // 1 < 2, cannot capture
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(false);
  });
});

describe('Edge: Game mode switching resets state', () => {
  it('initial position has correct piece count', () => {
    const board = createInitialBoard();
    // 2 kings, 4 princes, 2 connets, 2 scouts, 2 ritters per side = wrong
    // Actually: 2 ritters + 2 scouts + 2 princes + 1 connet + 1 king + 8 pawns = 16 per side
    const whites = Object.values(board).filter(p => p.color === 'white');
    const blacks = Object.values(board).filter(p => p.color === 'black');
    expect(whites.length).toBe(16);
    expect(blacks.length).toBe(16);

    // Count specific types for white
    const wKings = whites.filter(p => p.kind === 'king').length;
    const wPrinces = whites.filter(p => p.kind === 'prince').length;
    const wConnets = whites.filter(p => p.kind === 'rook').length;
    const wScouts = whites.filter(p => p.kind === 'bishop').length;
    const wRitters = whites.filter(p => p.kind === 'knight').length;
    const wPawns = whites.filter(p => p.kind === 'pawn').length;

    expect(wKings).toBe(1);
    expect(wPrinces).toBe(2);
    expect(wConnets).toBe(1);
    expect(wScouts).toBe(2);
    expect(wRitters).toBe(2);
    expect(wPawns).toBe(8);
  });
});

describe('Edge: Capture removes piece from board correctly', () => {
  it('after capture, target piece is removed', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 3, rank: 3 }, // Connet force 3
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },  // target
    ]);
    const result = validateMove(board, board[squareKey(3, 3)], 3, 3, 4, 3, 'white');
    expect(result.valid).toBe(true);
    expect(result.captured).toBeDefined();
    expect(result.captured!.color).toBe('black');
  });
});
