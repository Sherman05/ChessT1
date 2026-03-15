import { Piece, Color, squareKey } from '../types/chess';
import { BoardMap } from './board';

/**
 * Check if a move is valid according to Chess-T1 basic rules:
 * - Correct turn (piece color matches current turn)
 * - Cannot move to a square occupied by own piece
 * - Can capture opponent's piece
 */
export function validateMove(
  board: BoardMap,
  piece: Piece,
  fromFile: number,
  fromRank: number,
  toFile: number,
  toRank: number,
  currentTurn: Color
): { valid: boolean; captured: Piece | null } {
  // Must be this player's turn
  if (piece.color !== currentTurn) {
    return { valid: false, captured: null };
  }

  // Cannot stay on same square
  if (fromFile === toFile && fromRank === toRank) {
    return { valid: false, captured: null };
  }

  // Must be within board bounds
  if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) {
    return { valid: false, captured: null };
  }

  const targetKey = squareKey(toFile, toRank);
  const targetPiece = board[targetKey];

  // Cannot move to a square with own piece
  if (targetPiece && targetPiece.color === piece.color) {
    return { valid: false, captured: null };
  }

  // Can capture opponent's piece
  const captured = targetPiece && targetPiece.color !== piece.color ? targetPiece : null;

  return { valid: true, captured };
}
