import { create } from 'zustand';
import { Piece, PieceKind, Color, Square, squareKey } from '../types/chess';

export interface DragState {
  piece: Piece;
  sourceSquare: Square | null; // null = from tray
  traySource: { kind: PieceKind; color: Color } | null;
  currentX: number;
  currentY: number;
  hoveredSquare: Square | null;
  legalMoveKeys: Set<string>; // keys of squares where the piece can legally move
}

interface DragStoreState {
  drag: DragState | null;

  startDrag: (
    piece: Piece,
    sourceSquare: Square | null,
    clientX: number,
    clientY: number,
    traySource?: { kind: PieceKind; color: Color },
    legalMoves?: Square[]
  ) => void;
  updateDrag: (clientX: number, clientY: number, hoveredSquare: Square | null) => void;
  endDrag: () => DragState | null;
}

export const useDragStore = create<DragStoreState>((set, get) => ({
  drag: null,

  startDrag: (piece, sourceSquare, clientX, clientY, traySource, legalMoves) => {
    const legalMoveKeys = new Set<string>();
    if (legalMoves) {
      for (const sq of legalMoves) {
        legalMoveKeys.add(squareKey(sq.file, sq.rank));
      }
    }
    set({
      drag: {
        piece,
        sourceSquare,
        traySource: traySource || null,
        currentX: clientX,
        currentY: clientY,
        hoveredSquare: sourceSquare,
        legalMoveKeys,
      },
    });
  },

  updateDrag: (clientX, clientY, hoveredSquare) => {
    const current = get().drag;
    if (!current) return;
    set({
      drag: { ...current, currentX: clientX, currentY: clientY, hoveredSquare },
    });
  },

  endDrag: () => {
    const current = get().drag;
    set({ drag: null });
    return current;
  },
}));
