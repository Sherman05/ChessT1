import { Piece, PieceKind, PromotionContext, Square, isCastleSquare } from '../types/chess';
import { BoardMap } from './board';

export interface PromotionState {
  whitePrinceToConnetUsed: boolean;
  blackPrinceToConnetUsed: boolean;
}

/**
 * Count pieces of a specific kind and color on the board.
 */
function countPieces(board: BoardMap, kind: PieceKind, color: string): number {
  let count = 0;
  for (const key in board) {
    const p = board[key];
    if (p.kind === kind && p.color === color) count++;
  }
  return count;
}

/**
 * Check if a move triggers a promotion.
 *
 * Rules:
 * B6: Pawn → Veteran (auto): white pawn reaching rank 5, black pawn reaching rank 2
 * B7: Veteran promotion on last rank:
 *     - Flank squares (a,b,g,h): choose from Ritter, Prince, Connet, Scout
 *       (limited: max 3 Princes, max 3 Connets total)
 *     - Castle squares (c,d,e,f, must be free): choose from Prince, Connet
 *       (limited: max 3 Princes, max 3 Connets total)
 * B8: Prince → Connet auto-promotion when entering any castle square (first time per game per color)
 */
export function checkPromotion(
  piece: Piece,
  from: Square,
  to: Square,
  captured: Piece | null,
  board: BoardMap,
  promoState: PromotionState
): { auto: Piece | null; dialog: PromotionContext | null; moveBlocked?: boolean } {
  // B6: Pawn auto-promotion to Veteran
  if (piece.kind === 'pawn') {
    if (piece.color === 'white' && to.rank === 5) {
      return { auto: { ...piece, kind: 'veteran' }, dialog: null };
    }
    if (piece.color === 'black' && to.rank === 2) {
      return { auto: { ...piece, kind: 'veteran' }, dialog: null };
    }
  }

  // B7: Veteran promotion on last rank
  if (piece.kind === 'veteran') {
    const lastRank = piece.color === 'white' ? 7 : 0;
    if (to.rank === lastRank) {
      const isFlank = to.file === 0 || to.file === 1 || to.file === 6 || to.file === 7;
      const isCastle = isCastleSquare(to.file, to.rank);

      if (isFlank) {
        // Flank: Ritter, Prince, Connet, Scout (with limits)
        const options = buildPromotionOptions(board, piece.color, ['knight', 'prince', 'rook', 'bishop']);
        if (options.length === 0) return { auto: null, dialog: null };
        if (options.length === 1) return { auto: { ...piece, kind: options[0] }, dialog: null };
        return {
          auto: null,
          dialog: { piece, from, to, captured, options },
        };
      }

      if (isCastle) {
        // Castle squares: Prince, Connet (with limits)
        // Veteran can enter castle for promotion (exception to non-royal restriction)
        // If no options available, moveBlocked=true signals the move should be invalid
        const options = buildPromotionOptions(board, piece.color, ['prince', 'rook']);
        if (options.length === 0) return { auto: null, dialog: null, moveBlocked: true };
        if (options.length === 1) return { auto: { ...piece, kind: options[0] }, dialog: null };
        return {
          auto: null,
          dialog: { piece, from, to, captured, options },
        };
      }
    }
  }

  // B8: Prince → Connet auto-promotion on castle square entry (first time per game per color)
  if (piece.kind === 'prince' && isCastleSquare(to.file, to.rank)) {
    const used = piece.color === 'white' ? promoState.whitePrinceToConnetUsed : promoState.blackPrinceToConnetUsed;
    if (!used) {
      // Check max 3 Connets
      const connetCount = countPieces(board, 'rook', piece.color);
      if (connetCount < 3) {
        return { auto: { ...piece, kind: 'rook' }, dialog: null };
      }
    }
  }

  return { auto: null, dialog: null };
}

/**
 * Build promotion options respecting max limits (3 Princes, 3 Connets).
 */
function buildPromotionOptions(board: BoardMap, color: string, candidates: PieceKind[]): PieceKind[] {
  const options: PieceKind[] = [];
  for (const kind of candidates) {
    if (kind === 'prince') {
      if (countPieces(board, 'prince', color) >= 3) continue;
    }
    if (kind === 'rook') {
      if (countPieces(board, 'rook', color) >= 3) continue;
    }
    options.push(kind);
  }
  return options;
}

/**
 * Get the corner position for the promotion dialog.
 */
export function getPromotionDialogPosition(color: 'white' | 'black'): 'top-right' | 'bottom-right' {
  return color === 'white' ? 'top-right' : 'bottom-right';
}
