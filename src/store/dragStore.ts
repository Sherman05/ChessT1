import { create } from 'zustand';
import { Piece, PieceKind, Color, Square } from '../types/chess';

export interface DragState {
  piece: Piece;
  sourceSquare: Square | null; // null = from tray
  traySource: { kind: PieceKind; color: Color } | null;
  currentX: number;
  currentY: number;
  hoveredSquare: Square | null;
}

interface DragStoreState {
  drag: DragState | null;

  startDrag: (
    piece: Piece,
    sourceSquare: Square | null,
    clientX: number,
    clientY: number,
    traySource?: { kind: PieceKind; color: Color }
  ) => void;
  updateDrag: (clientX: number, clientY: number, hoveredSquare: Square | null) => void;
  endDrag: () => DragState | null;
}

export const useDragStore = create<DragStoreState>((set, get) => ({
  drag: null,

  startDrag: (piece, sourceSquare, clientX, clientY, traySource) => {
    set({
      drag: {
        piece,
        sourceSquare,
        traySource: traySource || null,
        currentX: clientX,
        currentY: clientY,
        hoveredSquare: sourceSquare,
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
