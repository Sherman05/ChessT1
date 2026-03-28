import { describe, it, expect } from 'vitest';
import { createHistory, addMove, goBack, goForward, canGoBack, canGoForward } from '../logic/history';
import { createInitialBoard, createPiece, resetPieceCounter, BoardMap } from '../logic/board';
import { squareKey, PieceKind, Color } from '../types/chess';

function setupBoard(pieces: Array<{ kind: PieceKind; color: Color; file: number; rank: number }>): BoardMap {
  resetPieceCounter();
  const board: BoardMap = {};
  for (const p of pieces) {
    board[squareKey(p.file, p.rank)] = createPiece(p.kind, p.color);
  }
  return board;
}

describe('History: basic operations', () => {
  it('createHistory starts at moveIndex -1', () => {
    const h = createHistory();
    expect(h.moveIndex).toBe(-1);
    expect(h.history.length).toBe(0);
  });

  it('canGoBack false on empty history', () => {
    expect(canGoBack(createHistory())).toBe(false);
  });

  it('canGoForward false on empty history', () => {
    expect(canGoForward(createHistory())).toBe(false);
  });
});

describe('History: add and navigate', () => {
  it('add move then go back restores original board', () => {
    const board = createInitialBoard();
    const history = createHistory();
    const pawn = board[squareKey(4, 1)];

    const { newHistory, newBoard } = addMove(
      history, board, pawn, { file: 4, rank: 1 }, { file: 4, rank: 2 },
      null, null, false, 'white'
    );

    expect(newBoard[squareKey(4, 2)]).toBeDefined();
    expect(newBoard[squareKey(4, 1)]).toBeUndefined();

    const result = goBack(newHistory);
    expect(result).not.toBeNull();
    expect(result!.board[squareKey(4, 1)]).toBeDefined();
    expect(result!.board[squareKey(4, 1)].kind).toBe('pawn');
    expect(result!.board[squareKey(4, 2)]).toBeUndefined();
    expect(result!.turn).toBe('white');
  });

  it('add two moves, go back, go forward restores correctly', () => {
    const board = createInitialBoard();
    let history = createHistory();

    // Move 1
    const pawn1 = board[squareKey(4, 1)];
    const r1 = addMove(history, board, pawn1, { file: 4, rank: 1 }, { file: 4, rank: 2 }, null, null, false, 'white');
    history = r1.newHistory;

    // Move 2
    const pawn2 = r1.newBoard[squareKey(4, 6)];
    const r2 = addMove(history, r1.newBoard, pawn2, { file: 4, rank: 6 }, { file: 4, rank: 5 }, null, null, false, 'black');
    history = r2.newHistory;

    expect(history.moveIndex).toBe(1);

    // Go back to after move 1
    const back = goBack(history);
    expect(back).not.toBeNull();
    history = { ...history, moveIndex: back!.newMoveIndex };

    // Go forward to after move 2
    const fwd = goForward(history);
    expect(fwd).not.toBeNull();
    expect(fwd!.board[squareKey(4, 5)]).toBeDefined();
    expect(fwd!.board[squareKey(4, 5)].kind).toBe('pawn');
    expect(fwd!.board[squareKey(4, 5)].color).toBe('black');
  });
});

describe('History: promotion in history', () => {
  it('add move with promotion, go back, piece is original', () => {
    const board = setupBoard([{ kind: 'pawn', color: 'white', file: 4, rank: 4 }]);
    const history = createHistory();
    const pawn = board[squareKey(4, 4)];

    const { newHistory, newBoard } = addMove(
      history, board, pawn, { file: 4, rank: 4 }, { file: 4, rank: 5 },
      null, 'veteran', true, 'white'
    );

    expect(newBoard[squareKey(4, 5)].kind).toBe('veteran');

    const result = goBack(newHistory);
    expect(result!.board[squareKey(4, 4)].kind).toBe('pawn');
  });
});

describe('History: scout exchange in history', () => {
  it('add scout exchange move, go back, both pieces restored', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
      { kind: 'prince', color: 'black', file: 5, rank: 6 },
    ]);
    const history = createHistory();
    const scout = board[squareKey(4, 4)];

    const { newHistory, newBoard } = addMove(
      history, board, scout, { file: 4, rank: 4 }, { file: 5, rank: 6 },
      board[squareKey(5, 6)], null, false, 'white', true
    );

    // After exchange: both gone
    expect(newBoard[squareKey(4, 4)]).toBeUndefined();
    expect(newBoard[squareKey(5, 6)]).toBeUndefined();

    // Go back: both restored
    const result = goBack(newHistory);
    expect(result!.board[squareKey(4, 4)]).toBeDefined();
    expect(result!.board[squareKey(4, 4)].kind).toBe('bishop');
    expect(result!.board[squareKey(5, 6)]).toBeDefined();
    expect(result!.board[squareKey(5, 6)].kind).toBe('prince');
  });

  it('go forward replays scout exchange correctly', () => {
    const board = setupBoard([
      { kind: 'bishop', color: 'white', file: 4, rank: 4 },
      { kind: 'prince', color: 'black', file: 5, rank: 6 },
    ]);
    const history = createHistory();
    const scout = board[squareKey(4, 4)];

    const { newHistory } = addMove(
      history, board, scout, { file: 4, rank: 4 }, { file: 5, rank: 6 },
      board[squareKey(5, 6)], null, false, 'white', true
    );

    // Go back
    const backResult = goBack(newHistory);
    const backHistory = { ...newHistory, moveIndex: backResult!.newMoveIndex };

    // Go forward
    const fwdResult = goForward(backHistory);
    expect(fwdResult).not.toBeNull();
    expect(fwdResult!.board[squareKey(4, 4)]).toBeUndefined();
    expect(fwdResult!.board[squareKey(5, 6)]).toBeUndefined();
  });
});

describe('History: truncation on new move after undo', () => {
  it('new move after undo truncates future history', () => {
    const board = createInitialBoard();
    let history = createHistory();

    // Move 1: e2->e3
    const pawn1 = board[squareKey(4, 1)];
    const r1 = addMove(history, board, pawn1, { file: 4, rank: 1 }, { file: 4, rank: 2 }, null, null, false, 'white');
    history = r1.newHistory;

    // Move 2: e7->e6
    const pawn2 = r1.newBoard[squareKey(4, 6)];
    const r2 = addMove(history, r1.newBoard, pawn2, { file: 4, rank: 6 }, { file: 4, rank: 5 }, null, null, false, 'black');
    history = r2.newHistory;

    expect(history.history.length).toBe(2);

    // Go back to after move 1
    const back = goBack(history);
    history = { ...history, moveIndex: back!.newMoveIndex };

    // Make a different move 2: d7->d6 (from the board after move 1)
    const pawn3 = back!.board[squareKey(3, 6)];
    const r3 = addMove(history, back!.board, pawn3, { file: 3, rank: 6 }, { file: 3, rank: 5 }, null, null, false, 'black');
    history = r3.newHistory;

    // Future history should be truncated
    expect(history.history.length).toBe(2); // move 1 + new move 2
    expect(history.moveIndex).toBe(1);
  });
});
