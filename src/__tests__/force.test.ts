import { describe, it, expect } from 'vitest';
import { computeForceMap, getEffectiveAttack, getEffectiveDefense, canCaptureByForce, isKingInCheck } from '../logic/force';
import { squareKey } from '../types/chess';
import { BoardMap, createPiece, resetPieceCounter } from '../logic/board';

function setupBoard(pieces: Array<{ kind: any; color: any; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

describe('Force projection', () => {
  it('single pawn projects force 1 to reachable squares and own square', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 2 }]);
    const fm = computeForceMap(board);
    // Own square
    expect(fm.whiteTotal[squareKey(4, 2)]).toBe(1);
    // Forward
    expect(fm.whiteTotal[squareKey(4, 3)]).toBe(1);
    // Sideways
    expect(fm.whiteTotal[squareKey(3, 2)]).toBe(1);
    expect(fm.whiteTotal[squareKey(5, 2)]).toBe(1);
  });

  it('Scout (bishop) projects 0 force', () => {
    const board = setupBoard([{ kind: 'bishop', color: 'white', file: 4, rank: 4 }]);
    const fm = computeForceMap(board);
    expect(fm.whiteTotal[squareKey(4, 4)] || 0).toBe(0);
    expect(fm.whiteTotal[squareKey(5, 6)] || 0).toBe(0);
  });

  it('multiple pieces sum their force', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 2 },  // force 1
      { kind: 'pawn', color: 'white', file: 5, rank: 2 },  // force 1
    ]);
    const fm = computeForceMap(board);
    // Both pawns can reach (4,2) sideways
    expect(fm.whiteTotal[squareKey(4, 2)]).toBe(2);
  });

  it('royal force tracked separately', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },  // force 1.5, royal
      { kind: 'pawn', color: 'white', file: 4, rank: 3 },  // force 1, not royal
    ]);
    const fm = computeForceMap(board);
    // Both project to (4,4) — king self + pawn forward
    expect(fm.whiteTotal[squareKey(4, 4)]).toBe(2.5);
    expect(fm.whiteRoyal[squareKey(4, 4)]).toBe(1.5);
  });
});

describe('Effective attack on castle squares', () => {
  it('non-royal attack on castle without royal support = 0', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 4, rank: 1 }, // Ritter, force 2, can reach e1
    ]);
    const fm = computeForceMap(board);
    // e1 = (4,0) is a castle square
    const attack = getEffectiveAttack(fm, 'white', 4, 0);
    expect(attack).toBe(0); // no royal support
  });

  it('non-royal attack on castle WITH royal support counts', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 4, rank: 1 }, // Ritter, force 2
      { kind: 'king', color: 'white', file: 3, rank: 1 },   // King, force 1.5, royal
    ]);
    const fm = computeForceMap(board);
    // Both can reach (4,0): Ritter from (4,1)->down 1, King from (3,1)->diagonal
    const attack = getEffectiveAttack(fm, 'white', 4, 0);
    expect(attack).toBeGreaterThan(0); // royal support present
  });
});

describe('canCaptureByForce', () => {
  it('attacker force > defender force: capture allowed', () => {
    const board = setupBoard([
      { kind: 'knight', color: 'white', file: 3, rank: 3 }, // Ritter force 2
      { kind: 'pawn', color: 'black', file: 4, rank: 3 },   // pawn force 1
    ]);
    const fm = computeForceMap(board);
    const result = canCaptureByForce(board, fm, 'white', 4, 3, board[squareKey(3, 3)]);
    expect(result).toBe(true);
  });

  it('attacker force <= defender force: capture denied', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 3, rank: 3 },   // pawn force 1
      { kind: 'knight', color: 'black', file: 4, rank: 3 }, // Ritter force 2
    ]);
    const fm = computeForceMap(board);
    const result = canCaptureByForce(board, fm, 'white', 4, 3, board[squareKey(3, 3)]);
    expect(result).toBe(false);
  });

  it('Scout always captures (infinite direct attack)', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
      { kind: 'rook', color: 'black', file: 5, rank: 6 }, // Connet force 3
    ]);
    const fm = computeForceMap(board);
    const result = canCaptureByForce(board, fm, 'white', 5, 6, board[squareKey(4, 4)]);
    expect(result).toBe(true); // Scout always captures
  });
});

describe('isKingInCheck', () => {
  it('king defended by own pieces: not in check', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 },
      { kind: 'rook', color: 'white', file: 3, rank: 0 }, // Connet defending
      { kind: 'pawn', color: 'black', file: 4, rank: 2 }, // pawn far away
    ]);
    expect(isKingInCheck(board, 'white')).toBe(false);
  });

  it('king threatened by enemy scout: in check', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 4 },
      { kind: 'bishop', color: 'black', file: 3, rank: 2 }, // Scout L-shape to (4,4)? No: (3,2)->(4,4) is not L-shape
    ]);
    // (3,2) -> L-shapes: (4,4)=+1,+2 yes!
    expect(isKingInCheck(board, 'white')).toBe(true);
  });

  it('scout CAN check king on castle square (exchange threat)', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 }, // e1 = castle square
      { kind: 'bishop', color: 'black', file: 3, rank: 2 }, // Scout L-shape to (4,0): (3,2)->(4,0)=+1,-2 yes
    ]);
    // Scout can exchange on castle square, so king IS in check
    expect(isKingInCheck(board, 'white')).toBe(true);
  });
});
