import { Piece, PieceKind, PromotionContext, Square } from '../types/chess';

/**
 * Check if a move triggers a promotion.
 * Returns null if no promotion, or a PromotionContext describing what happens.
 *
 * B6: Pawn auto-promotes to Veteran
 *   - White pawn reaching rank 5 (6th row) → auto veteran
 *   - Black pawn reaching rank 2 (3rd row) → auto veteran
 *
 * B7: Veteran promotes on last rank
 *   - Edge squares (a,b,g,h on 8th/1st) → 4 choices: queen, rook, bishop, knight
 *   - Center squares (c,d,e,f on 8th/1st) → 2 choices: queen, prince
 *
 * B8: Prince promotes on center squares of last rank
 *   - Center squares (c,d,e,f on 8th/1st) → 2 choices: queen, prince (becomes queen or stays upgraded)
 */
export function checkPromotion(
  piece: Piece,
  from: Square,
  to: Square,
  captured: Piece | null
): { auto: Piece | null; dialog: PromotionContext | null } {
  // B6: Pawn auto-promotion to Veteran
  if (piece.kind === 'pawn') {
    if (piece.color === 'white' && to.rank === 5) {
      // White pawn reaches 6th row → auto veteran
      return {
        auto: { ...piece, kind: 'veteran', id: piece.id },
        dialog: null,
      };
    }
    if (piece.color === 'black' && to.rank === 2) {
      // Black pawn reaches 3rd row → auto veteran
      return {
        auto: { ...piece, kind: 'veteran', id: piece.id },
        dialog: null,
      };
    }
  }

  // B7: Veteran promotion on last rank
  if (piece.kind === 'veteran') {
    const lastRank = piece.color === 'white' ? 7 : 0;
    if (to.rank === lastRank) {
      const isEdge = to.file === 0 || to.file === 1 || to.file === 6 || to.file === 7;
      if (isEdge) {
        // Edge squares: 4 choices
        return {
          auto: null,
          dialog: {
            piece,
            from,
            to,
            captured,
            options: ['queen', 'rook', 'bishop', 'knight'],
          },
        };
      } else {
        // Center squares (c,d,e,f): 2 choices
        return {
          auto: null,
          dialog: {
            piece,
            from,
            to,
            captured,
            options: ['queen', 'prince'],
          },
        };
      }
    }
  }

  // B8: Prince promotion on center squares of last rank
  if (piece.kind === 'prince') {
    const lastRank = piece.color === 'white' ? 7 : 0;
    if (to.rank === lastRank) {
      const isCenter = to.file >= 2 && to.file <= 5;
      if (isCenter) {
        return {
          auto: null,
          dialog: {
            piece,
            from,
            to,
            captured,
            options: ['queen', 'prince'],
          },
        };
      }
    }
  }

  return { auto: null, dialog: null };
}

/**
 * Get the corner position for the promotion dialog.
 * White promotions: top-right corner
 * Black promotions: bottom-right corner
 */
export function getPromotionDialogPosition(color: 'white' | 'black'): 'top-right' | 'bottom-right' {
  return color === 'white' ? 'top-right' : 'bottom-right';
}
