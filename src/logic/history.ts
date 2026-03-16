import { Move, Piece, Color, squareKey } from '../types/chess';
import { BoardMap, cloneBoard } from './board';

export interface HistoryState {
  history: Move[];
  moveIndex: number; // -1 = initial position, 0 = after first move, etc.
}

export function createHistory(): HistoryState {
  return { history: [], moveIndex: -1 };
}

export function addMove(
  state: HistoryState,
  board: BoardMap,
  piece: Piece,
  from: { file: number; rank: number },
  to: { file: number; rank: number },
  captured: Piece | null,
  promotion: Piece['kind'] | null,
  autoPromotion: boolean,
  turn: Color,
  scoutExchange: boolean = false
): { newHistory: HistoryState; newBoard: BoardMap } {
  // Truncate future moves if we're in the middle of history
  const truncated = state.history.slice(0, state.moveIndex + 1);

  const snapshot = cloneBoard(board);

  const move: Move = {
    piece,
    from,
    to,
    captured,
    promotion,
    autoPromotion,
    boardSnapshot: snapshot,
    turnAfter: turn === 'white' ? 'black' : 'white',
    scoutExchange,
  };

  // Apply the move to the board
  const newBoard = cloneBoard(board);
  const fromKey = squareKey(from.file, from.rank);
  const toKey = squareKey(to.file, to.rank);

  delete newBoard[fromKey];

  if (scoutExchange) {
    // Both pieces removed from the board
    delete newBoard[toKey];
  } else if (promotion) {
    newBoard[toKey] = { ...piece, kind: promotion };
  } else {
    newBoard[toKey] = { ...piece };
  }

  return {
    newHistory: {
      history: [...truncated, move],
      moveIndex: truncated.length,
    },
    newBoard,
  };
}

export function canGoBack(state: HistoryState): boolean {
  return state.moveIndex >= 0;
}

export function canGoForward(state: HistoryState): boolean {
  return state.moveIndex < state.history.length - 1;
}

export function goBack(state: HistoryState): { board: BoardMap; turn: Color; newMoveIndex: number } | null {
  if (!canGoBack(state)) return null;

  const currentMove = state.history[state.moveIndex];
  return {
    board: cloneBoard(currentMove.boardSnapshot),
    turn: currentMove.piece.color, // It was this color's turn when the move was made
    newMoveIndex: state.moveIndex - 1,
  };
}

export function goForward(state: HistoryState): { board: BoardMap; turn: Color; newMoveIndex: number } | null {
  if (!canGoForward(state)) return null;

  const nextMove = state.history[state.moveIndex + 1];
  const newBoard = cloneBoard(nextMove.boardSnapshot);
  const fromKey = squareKey(nextMove.from.file, nextMove.from.rank);
  const toKey = squareKey(nextMove.to.file, nextMove.to.rank);

  delete newBoard[fromKey];
  if (nextMove.scoutExchange) {
    delete newBoard[toKey];
  } else if (nextMove.promotion) {
    newBoard[toKey] = { ...nextMove.piece, kind: nextMove.promotion };
  } else {
    newBoard[toKey] = { ...nextMove.piece };
  }

  return {
    board: newBoard,
    turn: nextMove.turnAfter,
    newMoveIndex: state.moveIndex + 1,
  };
}
