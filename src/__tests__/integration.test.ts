import { describe, it, expect } from 'vitest';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap, cloneBoard } from '../logic/board';
import { validateMove, getLegalMovesForPiece, hasAnyLegalMove } from '../logic/moves';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { checkGameEnd } from '../logic/gameEnd';
import { isKingInCheck } from '../logic/force';
import { getMovementSquares } from '../logic/movement';
import { squareKey, isCastleSquare, isRoyalPiece, PIECE_FORCE, PieceKind, Color } from '../types/chess';
import { addMove, createHistory } from '../logic/history';

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

describe('Integration: Initial position sanity', () => {
  it('all initial pieces have valid piece kinds (no queen)', () => {
    const board = createInitialBoard();
    const validKinds = ['king', 'prince', 'rook', 'bishop', 'knight', 'pawn', 'veteran'];
    for (const key in board) {
      expect(validKinds).toContain(board[key].kind);
    }
  });

  it('initial position: all castle squares occupied by royal pieces', () => {
    const board = createInitialBoard();
    const castleKeys = [
      squareKey(2, 0), squareKey(3, 0), squareKey(4, 0), squareKey(5, 0),
      squareKey(2, 7), squareKey(3, 7), squareKey(4, 7), squareKey(5, 7),
    ];
    for (const key of castleKeys) {
      expect(board[key]).toBeDefined();
      expect(isRoyalPiece(board[key].kind)).toBe(true);
    }
  });

  it('initial position: both sides have legal moves', () => {
    const board = createInitialBoard();
    expect(hasAnyLegalMove(board, 'white')).toBe(true);
    expect(hasAnyLegalMove(board, 'black')).toBe(true);
  });

  it('initial position: no king in check', () => {
    const board = createInitialBoard();
    expect(isKingInCheck(board, 'white')).toBe(false);
    expect(isKingInCheck(board, 'black')).toBe(false);
  });

  it('initial position: white pawns can move forward and sideways', () => {
    const board = createInitialBoard();
    // Pawn at e2 (4,1) should be able to move to e3, e4 (2 fwd), d2, f2
    const pawn = board[squareKey(4, 1)];
    const moves = getLegalMovesForPiece(board, pawn, 4, 1, 'white');
    // e3 (4,2) should be available, e4 (4,3) should be available (2fwd)
    // d2 (3,1) and f2 (5,1) have pawns — blocked
    // e0 (4,0) is castle — blocked for pawn
    const moveSet = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(moveSet.has('4,2')).toBe(true);   // forward
    expect(moveSet.has('4,3')).toBe(true);   // 2 forward
    expect(moveSet.has('3,1')).toBe(false);  // own pawn
    expect(moveSet.has('5,1')).toBe(false);  // own pawn
    expect(moveSet.has('4,0')).toBe(false);  // castle
  });

  it('initial position: Ritter at a1 can move to a2 and a3 but not castle', () => {
    const board = createInitialBoard();
    const ritter = board[squareKey(0, 0)]; // a1
    const moves = getLegalMovesForPiece(board, ritter, 0, 0, 'white');
    const moveSet = new Set(moves.map(m => `${m.file},${m.rank}`));
    // a2 (0,1) has white pawn — blocked
    // a3 (0,2) should be reachable (jumps over pawn)
    expect(moveSet.has('0,2')).toBe(true);
    expect(moveSet.has('0,1')).toBe(false); // own pawn
    // b1 (1,0) has own Scout — blocked
    expect(moveSet.has('1,0')).toBe(false);
  });
});

describe('Integration: Play sequence', () => {
  it('can make a valid opening move', () => {
    const board = createInitialBoard();
    // Move white pawn e2->e3 (4,1)->(4,2)
    const pawn = board[squareKey(4, 1)];
    const result = validateMove(board, pawn, 4, 1, 4, 2, 'white');
    expect(result.valid).toBe(true);
  });

  it('cannot move black piece on whites turn', () => {
    const board = createInitialBoard();
    const bpawn = board[squareKey(4, 6)];
    const result = validateMove(board, bpawn, 4, 6, 4, 5, 'white');
    expect(result.valid).toBe(false);
  });

  it('pawn moving to enemy territory loses 2-forward option', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 3 },
    ]);
    // On rank 3 (own territory), 2 forward available
    let moves = getLegalMovesForPiece(board, board[squareKey(4, 3)], 4, 3, 'white');
    expect(moves.some(m => m.rank === 5)).toBe(true);

    // Move to rank 4 (enemy territory)
    const board2 = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 4 },
    ]);
    moves = getLegalMovesForPiece(board2, board2[squareKey(4, 4)], 4, 4, 'white');
    expect(moves.some(m => m.rank === 6)).toBe(false); // no 2 forward
  });
});

describe('Integration: Force projection edge cases', () => {
  it('equal force means no capture', () => {
    // Two pawns facing each other, same force
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 3 },
      { kind: 'pawn', color: 'black', file: 4, rank: 4 },
    ]);
    // White pawn force on (4,4): 1 (from pawn projecting forward)
    // Black pawn force on (4,4): 1 (from pawn on own square)
    // 1 is NOT > 1, so no capture
    const result = validateMove(board, board[squareKey(4, 3)], 4, 3, 4, 4, 'white');
    expect(result.valid).toBe(false);
  });

  it('additional support makes capture possible', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 3 },
      { kind: 'pawn', color: 'white', file: 3, rank: 4 }, // supports (4,4) with force 1
      { kind: 'pawn', color: 'black', file: 4, rank: 4 },
    ]);
    // White force on (4,4): pawn at (4,3) forward=1 + pawn at (3,4) right=1 = 2
    // Black force on (4,4): pawn on own square = 1
    // 2 > 1, capture allowed
    const result = validateMove(board, board[squareKey(4, 3)], 4, 3, 4, 4, 'white');
    expect(result.valid).toBe(true);
  });

  it('Connet (force 3) can capture lone pawn (force 1)', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'black', file: 5, rank: 5 },
    ]);
    // Connet projects 3 to (5,5) diagonal. Pawn has 1 on own square.
    const result = validateMove(board, board[squareKey(4, 4)], 4, 4, 5, 5, 'white');
    expect(result.valid).toBe(true);
  });
});

describe('Integration: Promotion flow', () => {
  it('pawn reaching promotion rank becomes veteran', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 4, rank: 4 },
    ]);
    const pawn = board[squareKey(4, 4)];
    const promo = checkPromotion(pawn, { file: 4, rank: 4 }, { file: 4, rank: 5 }, null, board, defaultPromoState);
    expect(promo.auto).toBeDefined();
    expect(promo.auto!.kind).toBe('veteran');
  });

  it('veteran can then reach last rank and promote', () => {
    const board = setupBoard([
      { kind: 'veteran', color: 'white', file: 0, rank: 6 },
    ]);
    const vet = board[squareKey(0, 6)];
    const promo = checkPromotion(vet, { file: 0, rank: 6 }, { file: 0, rank: 7 }, null, board, defaultPromoState);
    expect(promo.dialog).toBeDefined();
    expect(promo.dialog!.options.length).toBe(4);
  });
});

describe('Integration: History system', () => {
  it('addMove creates correct new board', () => {
    const board = createInitialBoard();
    const history = createHistory();
    const pawn = board[squareKey(4, 1)];
    const { newHistory, newBoard } = addMove(
      history, board, pawn, { file: 4, rank: 1 }, { file: 4, rank: 2 },
      null, null, false, 'white'
    );
    expect(newBoard[squareKey(4, 1)]).toBeUndefined(); // pawn moved away
    expect(newBoard[squareKey(4, 2)]).toBeDefined();   // pawn here now
    expect(newBoard[squareKey(4, 2)].kind).toBe('pawn');
    expect(newHistory.moveIndex).toBe(0);
    expect(newHistory.history.length).toBe(1);
  });

  it('addMove with promotion changes piece kind', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    const history = createHistory();
    const pawn = board[squareKey(4, 4)];
    const { newBoard } = addMove(
      history, board, pawn, { file: 4, rank: 4 }, { file: 4, rank: 5 },
      null, 'veteran', true, 'white'
    );
    expect(newBoard[squareKey(4, 5)].kind).toBe('veteran');
  });

  it('addMove with scout exchange removes both pieces', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
      { kind: 'king', color: 'black', file: 5, rank: 6 },
    ]);
    const history = createHistory();
    const scout = board[squareKey(4, 4)];
    const { newBoard } = addMove(
      history, board, scout, { file: 4, rank: 4 }, { file: 5, rank: 6 },
      board[squareKey(5, 6)], null, false, 'white', true
    );
    expect(newBoard[squareKey(4, 4)]).toBeUndefined();
    expect(newBoard[squareKey(5, 6)]).toBeUndefined();
  });
});

describe('Integration: Castle capture victory', () => {
  it('white king on black castle = victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 3, rank: 7 }, // d8
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('white');
  });

  it('black prince on white castle = victory for black', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'black', file: 4, rank: 0 }, // e1
      { kind: 'king', color: 'white', file: 7, rank: 4 },
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'black', null, false);
    expect(result.gameOver).toBe(true);
    expect(result.winner).toBe('black');
  });

  it('piece on own castle: no victory', () => {
    const board = setupBoard([
      { kind: 'king', color: 'white', file: 4, rank: 0 }, // e1 = white castle
      { kind: 'king', color: 'black', file: 4, rank: 7 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    // King on own castle is not victory (it's the white castle, not enemy)
    expect(result.gameOver).toBe(false);
  });

  it('royal on enemy castle with defender: no victory', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 4, rank: 7 }, // e8 = black castle
      { kind: 'prince', color: 'black', file: 5, rank: 7 }, // f8 = black castle, defending
      { kind: 'king', color: 'white', file: 0, rank: 0 },
      { kind: 'king', color: 'black', file: 0, rank: 4 },
    ]);
    const result = checkGameEnd(board, 'white', null, false);
    expect(result.gameOver).toBe(false); // defender present
  });
});

describe('Integration: Type system integrity', () => {
  it('all piece kinds have force values defined', () => {
    const kinds = ['king', 'prince', 'rook', 'bishop', 'knight', 'pawn', 'veteran'] as const;
    for (const k of kinds) {
      expect(PIECE_FORCE[k]).toBeDefined();
      expect(typeof PIECE_FORCE[k]).toBe('number');
    }
  });

  it('isRoyalPiece returns correct values', () => {
    expect(isRoyalPiece('king')).toBe(true);
    expect(isRoyalPiece('prince')).toBe(true);
    expect(isRoyalPiece('rook')).toBe(true);
    expect(isRoyalPiece('bishop')).toBe(false);
    expect(isRoyalPiece('knight')).toBe(false);
    expect(isRoyalPiece('pawn')).toBe(false);
    expect(isRoyalPiece('veteran')).toBe(false);
  });

  it('isCastleSquare identifies correct squares', () => {
    // White castle: c1(2,0) d1(3,0) e1(4,0) f1(5,0)
    expect(isCastleSquare(2, 0)).toBe(true);
    expect(isCastleSquare(3, 0)).toBe(true);
    expect(isCastleSquare(4, 0)).toBe(true);
    expect(isCastleSquare(5, 0)).toBe(true);
    // Not castle
    expect(isCastleSquare(0, 0)).toBe(false);
    expect(isCastleSquare(1, 0)).toBe(false);
    expect(isCastleSquare(6, 0)).toBe(false);
    expect(isCastleSquare(7, 0)).toBe(false);
    expect(isCastleSquare(4, 4)).toBe(false);
    // Black castle
    expect(isCastleSquare(2, 7)).toBe(true);
    expect(isCastleSquare(5, 7)).toBe(true);
  });
});

describe('Integration: Edge cases for movement', () => {
  it('pawn at rank 0 (white back rank) can still move backward is off-board', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'white', file: 0, rank: 0 },
    ]);
    const moves = getMovementSquares(board, board[squareKey(0, 0)], 0, 0);
    // backward = rank -1 = off-board
    const hasBadMove = moves.some(m => m.rank < 0);
    expect(hasBadMove).toBe(false);
  });

  it('black pawn at rank 7 cannot go further forward', () => {
    const board = setupBoard([
      { kind: 'pawn', color: 'black', file: 4, rank: 7 },
    ]);
    const moves = getMovementSquares(board, board[squareKey(4, 7)], 4, 7);
    // forward for black = -rank, so rank 6 is forward
    const moveSet = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(moveSet.has('4,6')).toBe(true); // forward
    expect(moveSet.has('4,8')).toBe(false); // backward off-board
  });

  it('prince diagonal blocked by piece on distance 1', () => {
    const board = setupBoard([
      { kind: 'prince', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'white', file: 5, rank: 5 },
    ]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const moveSet = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(moveSet.has('5,5')).toBe(true);  // blocker square
    expect(moveSet.has('6,6')).toBe(false); // blocked
    expect(moveSet.has('7,7')).toBe(false); // blocked
  });

  it('connet h/v jumps over friendly piece', () => {
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 4, rank: 4 },
      { kind: 'pawn', color: 'white', file: 5, rank: 4 },
    ]);
    const moves = getMovementSquares(board, board[squareKey(4, 4)], 4, 4);
    const moveSet = new Set(moves.map(m => `${m.file},${m.rank}`));
    expect(moveSet.has('6,4')).toBe(true); // jumps over pawn at (5,4)
  });
});

describe('Integration: Full game scenario - quick king capture', () => {
  it('simulate a forced king capture', () => {
    // Set up a position where white can capture black king
    const board = setupBoard([
      { kind: 'rook', color: 'white', file: 3, rank: 5 }, // Connet force 3
      { kind: 'king', color: 'black', file: 4, rank: 5 }, // Adjacent, force 1.5
      { kind: 'king', color: 'white', file: 0, rank: 0 },
    ]);
    // White Connet at d6 attacks e6 (black king)
    // Force on e6: white Connet projects 3 to adjacent squares. Black king projects 1.5 to own square.
    // 3 > 1.5, capture possible
    const result = validateMove(board, board[squareKey(3, 5)], 3, 5, 4, 5, 'white');
    expect(result.valid).toBe(true);
    expect(result.captured!.kind).toBe('king');

    // Apply the move
    const newBoard = cloneBoard(board);
    delete newBoard[squareKey(3, 5)];
    newBoard[squareKey(4, 5)] = board[squareKey(3, 5)];

    // Check game end
    const endResult = checkGameEnd(newBoard, 'white', result.captured, false);
    expect(endResult.gameOver).toBe(true);
    expect(endResult.winner).toBe('white');
  });
});
