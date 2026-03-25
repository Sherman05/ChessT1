import { create } from 'zustand';
import {
  Piece,
  PieceKind,
  Color,
  Square,
  PromotionContext,
  squareKey,
  isCastleSquare,
  CASTLE_WHITE,
  CASTLE_BLACK,
} from '../types/chess';
import { BoardMap, createInitialBoard, createEmptyBoard, cloneBoard, createPiece, boardPositionKey } from '../logic/board';
import { validateMove } from '../logic/moves';
import { checkPromotion, PromotionState } from '../logic/promotion';
import { HistoryState, createHistory, addMove, goBack, goForward, canGoBack, canGoForward } from '../logic/history';
import { checkGameEnd, checkDraw } from '../logic/gameEnd';

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

  // Game end state
  gameOver: boolean;
  winner: Color | null;
  gameOverReason: string | null;
  isDraw: boolean;

  // Draw tracking
  movesSinceCapture: number;
  positionHistory: string[];

  // Promotion tracking
  whitePrinceToConnetUsed: boolean;
  blackPrinceToConnetUsed: boolean;

  // Delete piece mode for analysis
  deletePieceMode: boolean;
  selectedForDelete: string | null;

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
  offerDraw: () => void;
  toggleDeletePieceMode: () => void;
  selectForDelete: (key: string | null) => void;
  confirmDelete: () => void;
  loadInitialPositionInSetup: () => void;
}

function initialState() {
  const board = createInitialBoard();
  return {
    board,
    turn: 'white' as Color,
    mode: 'party' as GameMode,
    analysisStage: 'play' as AnalysisStage,
    isFlipped: false,
    historyState: createHistory(),
    promotionContext: null as PromotionContext | null,
    boardBeforePromotion: null as BoardMap | null,
    lastMoveFrom: null as string | null,
    lastMoveTo: null as string | null,
    analysisFirstMove: 'white' as Color,
    gameOver: false,
    winner: null as Color | null,
    gameOverReason: null as string | null,
    isDraw: false,
    movesSinceCapture: 0,
    positionHistory: [boardPositionKey(board) + '|white'] as string[],
    whitePrinceToConnetUsed: false,
    blackPrinceToConnetUsed: false,
    deletePieceMode: false,
    selectedForDelete: null as string | null,
  };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initialState(),

  setInitialPosition: () => {
    set(initialState());
  },

  makeMove: (from: Square, to: Square) => {
    const state = get();
    if (state.gameOver || state.isDraw) return false;
    if (state.promotionContext) return false;

    const fromKey = squareKey(from.file, from.rank);
    const toKey = squareKey(to.file, to.rank);
    const piece = state.board[fromKey];
    if (!piece) return false;

    // Validate the move using full Chess-T1 rules
    const validation = validateMove(
      state.board, piece, from.file, from.rank, to.file, to.rank, state.turn,
      { white: state.whitePrinceToConnetUsed, black: state.blackPrinceToConnetUsed }
    );
    if (!validation.valid) return false;

    const captured = validation.captured;
    const scoutExchange = validation.scoutExchange;

    // Check for promotions
    const promoState: PromotionState = {
      whitePrinceToConnetUsed: state.whitePrinceToConnetUsed,
      blackPrinceToConnetUsed: state.blackPrinceToConnetUsed,
    };
    const promo = checkPromotion(piece, from, to, captured, state.board, promoState);

    if (promo.dialog) {
      // Need user choice - show dialog
      const boardBeforePromotion = cloneBoard(state.board);
      const tempBoard = cloneBoard(state.board);
      delete tempBoard[fromKey];
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
      promotionKind, !!promo.auto, state.turn, scoutExchange
    );

    const nextTurn: Color = state.turn === 'white' ? 'black' : 'white';

    // Track prince-to-connet promotion
    let wPtC = state.whitePrinceToConnetUsed;
    let bPtC = state.blackPrinceToConnetUsed;
    if (promo.auto && piece.kind === 'prince' && promo.auto.kind === 'rook') {
      if (piece.color === 'white') wPtC = true;
      else bPtC = true;
    }

    // Check game end
    const endResult = checkGameEnd(newBoard, state.turn, captured, scoutExchange);
    const newMovesSinceCapture = captured ? 0 : state.movesSinceCapture + 1;
    const newPosKey = boardPositionKey(newBoard) + '|' + nextTurn;
    const newPosHistory = [...state.positionHistory, newPosKey];
    const drawResult = endResult.gameOver
      ? { isDraw: false, reason: null }
      : checkDraw(newBoard, nextTurn, newMovesSinceCapture, newPosHistory);

    set({
      board: newBoard,
      turn: nextTurn,
      historyState: newHistory,
      lastMoveFrom: fromKey,
      lastMoveTo: toKey,
      whitePrinceToConnetUsed: wPtC,
      blackPrinceToConnetUsed: bPtC,
      movesSinceCapture: newMovesSinceCapture,
      positionHistory: newPosHistory,
      ...(endResult.gameOver ? {
        gameOver: true,
        winner: endResult.winner,
        gameOverReason: endResult.reason,
        isDraw: false,
      } : drawResult.isDraw ? {
        gameOver: true,
        isDraw: true,
        winner: null,
        gameOverReason: drawResult.reason,
      } : {}),
    });

    return true;
  },

  completePromotion: (chosenKind: PieceKind) => {
    const state = get();
    const ctx = state.promotionContext;
    if (!ctx) return;

    const boardForHistory = state.boardBeforePromotion || state.board;
    const scoutExchange = false;
    const { newHistory, newBoard } = addMove(
      state.historyState, boardForHistory, ctx.piece, ctx.from, ctx.to, ctx.captured,
      chosenKind, false, state.turn, scoutExchange
    );

    const nextTurn: Color = state.turn === 'white' ? 'black' : 'white';

    // Check game end after promotion
    const endResult = checkGameEnd(newBoard, state.turn, ctx.captured, false);
    const newMovesSinceCapture = ctx.captured ? 0 : state.movesSinceCapture + 1;
    const newPosKey = boardPositionKey(newBoard) + '|' + nextTurn;
    const newPosHistory = [...state.positionHistory, newPosKey];
    const drawResult = endResult.gameOver
      ? { isDraw: false, reason: null }
      : checkDraw(newBoard, nextTurn, newMovesSinceCapture, newPosHistory);

    set({
      board: newBoard,
      turn: nextTurn,
      historyState: newHistory,
      promotionContext: null,
      boardBeforePromotion: null,
      lastMoveFrom: squareKey(ctx.from.file, ctx.from.rank),
      lastMoveTo: squareKey(ctx.to.file, ctx.to.rank),
      movesSinceCapture: newMovesSinceCapture,
      positionHistory: newPosHistory,
      ...(endResult.gameOver ? {
        gameOver: true,
        winner: endResult.winner,
        gameOverReason: endResult.reason,
        isDraw: false,
      } : drawResult.isDraw ? {
        gameOver: true,
        isDraw: true,
        winner: null,
        gameOverReason: drawResult.reason,
      } : {}),
    });
  },

  cancelPromotion: () => {
    const state = get();
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
        ...initialState(),
        mode: 'analysis',
        analysisStage: 'setup',
        board: createEmptyBoard(),
      });
    } else {
      set(initialState());
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
      deletePieceMode: false,
      selectedForDelete: null,
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

  offerDraw: () => {
    const state = get();
    if (state.gameOver || state.isDraw) return;
    set({
      gameOver: true,
      isDraw: true,
      gameOverReason: 'Ничья по соглашению сторон.',
      winner: null,
    });
  },

  toggleDeletePieceMode: () => {
    set(state => ({
      deletePieceMode: !state.deletePieceMode,
      selectedForDelete: null,
    }));
  },

  selectForDelete: (key: string | null) => {
    set({ selectedForDelete: key });
  },

  confirmDelete: () => {
    const state = get();
    if (!state.selectedForDelete) return;
    const newBoard = cloneBoard(state.board);
    delete newBoard[state.selectedForDelete];
    set({
      board: newBoard,
      selectedForDelete: null,
    });
  },

  loadInitialPositionInSetup: () => {
    const state = get();
    if (state.mode === 'analysis' && state.analysisStage === 'setup') {
      set({ board: createInitialBoard() });
    }
  },
}));
