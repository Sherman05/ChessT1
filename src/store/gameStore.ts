import { create } from 'zustand';
import {
  Piece,
  PieceKind,
  Color,
  Square,
  PromotionContext,
  squareKey,
} from '../types/chess';
import { BoardMap, createInitialBoard, createEmptyBoard, cloneBoard, createPiece } from '../logic/board';
import { validateMove } from '../logic/moves';
import { checkPromotion } from '../logic/promotion';
import { HistoryState, createHistory, addMove, goBack, goForward, canGoBack, canGoForward } from '../logic/history';

export type GameMode = 'party' | 'analysis';
export type AnalysisStage = 'setup' | 'play';

interface GameStoreState {
  board: BoardMap;
  turn: Color;
  mode: GameMode;
  analysisStage: AnalysisStage;
  isFlipped: boolean;
  historyState: HistoryState;
  promotionContext: PromotionContext | null;
  boardBeforePromotion: BoardMap | null;
  lastMoveFrom: string | null;
  lastMoveTo: string | null;
  analysisFirstMove: Color;

  // Actions
  setInitialPosition: () => void;
  makeMove: (from: Square, to: Square) => boolean;
  completePromotion: (chosenKind: PieceKind) => void;
  cancelPromotion: () => void;
  goToPreviousMove: () => void;
  goToNextMove: () => void;
  flipBoard: () => void;
  setMode: (mode: GameMode) => void;
  setAnalysisFirstMove: (color: Color) => void;
  confirmAnalysisSetup: () => void;
  clearBoard: () => void;
  placePieceFromTray: (kind: PieceKind, color: Color, to: Square) => void;
  removePieceFromBoard: (sq: Square) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  board: createInitialBoard(),
  turn: 'white',
  mode: 'party',
  analysisStage: 'play',
  isFlipped: false,
  historyState: createHistory(),
  promotionContext: null,
  boardBeforePromotion: null,
  lastMoveFrom: null,
  lastMoveTo: null,
  analysisFirstMove: 'white',

  setInitialPosition: () => {
    set({
      board: createInitialBoard(),
      turn: 'white',
      historyState: createHistory(),
      promotionContext: null,
      boardBeforePromotion: null,
      lastMoveFrom: null,
      lastMoveTo: null,
    });
  },

  makeMove: (from: Square, to: Square) => {
    const state = get();
    if (state.promotionContext) return false; // pending promotion

    const fromKey = squareKey(from.file, from.rank);
    const piece = state.board[fromKey];
    if (!piece) return false;

    const { valid, captured } = validateMove(
      state.board, piece, from.file, from.rank, to.file, to.rank, state.turn
    );
    if (!valid) return false;

    // Check for promotions
    const promo = checkPromotion(piece, from, to, captured);

    if (promo.dialog) {
      // Need user choice - show dialog
      // Visually move piece to target square while dialog is shown
      const boardBeforePromotion = cloneBoard(state.board);
      const tempBoard = cloneBoard(state.board);
      delete tempBoard[fromKey];
      const toKey = squareKey(to.file, to.rank);
      tempBoard[toKey] = { ...piece };
      set({
        promotionContext: promo.dialog,
        boardBeforePromotion,
        board: tempBoard,
        lastMoveFrom: fromKey,
        lastMoveTo: toKey,
      });
      return true;
    }

    // Auto promotion or normal move
    const promotionKind = promo.auto ? promo.auto.kind : null;
    const { newHistory, newBoard } = addMove(
      state.historyState, state.board, piece, from, to, captured,
      promotionKind, !!promo.auto, state.turn
    );

    set({
      board: newBoard,
      turn: state.turn === 'white' ? 'black' : 'white',
      historyState: newHistory,
      lastMoveFrom: fromKey,
      lastMoveTo: squareKey(to.file, to.rank),
    });
    return true;
  },

  completePromotion: (chosenKind: PieceKind) => {
    const state = get();
    const ctx = state.promotionContext;
    if (!ctx) return;

    // Use the board state from BEFORE the visual move for history snapshot
    const boardForHistory = state.boardBeforePromotion || state.board;
    const { newHistory, newBoard } = addMove(
      state.historyState, boardForHistory, ctx.piece, ctx.from, ctx.to, ctx.captured,
      chosenKind, false, state.turn
    );

    set({
      board: newBoard,
      turn: state.turn === 'white' ? 'black' : 'white',
      historyState: newHistory,
      promotionContext: null,
      boardBeforePromotion: null,
      lastMoveFrom: squareKey(ctx.from.file, ctx.from.rank),
      lastMoveTo: squareKey(ctx.to.file, ctx.to.rank),
    });
  },

  cancelPromotion: () => {
    const state = get();
    // Restore board to state before the visual promotion move
    set({
      promotionContext: null,
      board: state.boardBeforePromotion || state.board,
      boardBeforePromotion: null,
      lastMoveFrom: null,
      lastMoveTo: null,
    });
  },

  goToPreviousMove: () => {
    const state = get();
    const result = goBack(state.historyState);
    if (!result) return;
    set({
      board: result.board,
      turn: result.turn,
      historyState: { ...state.historyState, moveIndex: result.newMoveIndex },
      lastMoveFrom: result.newMoveIndex >= 0
        ? squareKey(state.historyState.history[result.newMoveIndex].from.file, state.historyState.history[result.newMoveIndex].from.rank)
        : null,
      lastMoveTo: result.newMoveIndex >= 0
        ? squareKey(state.historyState.history[result.newMoveIndex].to.file, state.historyState.history[result.newMoveIndex].to.rank)
        : null,
    });
  },

  goToNextMove: () => {
    const state = get();
    const result = goForward(state.historyState);
    if (!result) return;
    const nextMove = state.historyState.history[result.newMoveIndex];
    set({
      board: result.board,
      turn: result.turn,
      historyState: { ...state.historyState, moveIndex: result.newMoveIndex },
      lastMoveFrom: squareKey(nextMove.from.file, nextMove.from.rank),
      lastMoveTo: squareKey(nextMove.to.file, nextMove.to.rank),
    });
  },

  flipBoard: () => {
    set(state => ({ isFlipped: !state.isFlipped }));
  },

  setMode: (mode: GameMode) => {
    if (mode === 'analysis') {
      set({
        mode: 'analysis',
        analysisStage: 'setup',
        board: createEmptyBoard(),
        turn: 'white',
        historyState: createHistory(),
        promotionContext: null,
        lastMoveFrom: null,
        lastMoveTo: null,
        analysisFirstMove: 'white',
      });
    } else {
      set({
        mode: 'party',
        analysisStage: 'play',
        board: createInitialBoard(),
        turn: 'white',
        historyState: createHistory(),
        promotionContext: null,
        lastMoveFrom: null,
        lastMoveTo: null,
      });
    }
  },

  setAnalysisFirstMove: (color: Color) => {
    set({ analysisFirstMove: color });
  },

  confirmAnalysisSetup: () => {
    const state = get();
    set({
      analysisStage: 'play',
      turn: state.analysisFirstMove,
      historyState: createHistory(),
    });
  },

  clearBoard: () => {
    set({
      board: createEmptyBoard(),
      lastMoveFrom: null,
      lastMoveTo: null,
    });
  },

  placePieceFromTray: (kind: PieceKind, color: Color, to: Square) => {
    const state = get();
    const toKey = squareKey(to.file, to.rank);
    const newBoard = cloneBoard(state.board);
    newBoard[toKey] = createPiece(kind, color);
    set({ board: newBoard });
  },

  removePieceFromBoard: (sq: Square) => {
    const state = get();
    const key = squareKey(sq.file, sq.rank);
    if (!state.board[key]) return;
    const newBoard = cloneBoard(state.board);
    delete newBoard[key];
    set({ board: newBoard });
  },
}));
