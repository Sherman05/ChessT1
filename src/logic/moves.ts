import { Piece, Color, Square, squareKey, keyToSquare, isCastleSquare, isRoyalPiece, getCastleSquares } from '../types/chess';
import { BoardMap } from './board';
import { getMovementSquares } from './movement';
import { computeForceMap, canCaptureByForce, ForceMap } from './force';

export interface MoveValidation {
  valid: boolean;
  captured: Piece | null;
  scoutExchange: boolean; // Scout exchange on castle square (both removed)
}

/**
 * Validate a single move according to full Chess-T1 rules.
 */
export function validateMove(
  board: BoardMap,
  piece: Piece,
  fromFile: number,
  fromRank: number,
  toFile: number,
  toRank: number,
  currentTurn: Color,
  princeToConnetUsed?: { white: boolean; black: boolean }
): MoveValidation {
  const invalid: MoveValidation = { valid: false, captured: null, scoutExchange: false };

  // Must be this player's turn
  if (piece.color !== currentTurn) return invalid;

  // Cannot stay on same square
  if (fromFile === toFile && fromRank === toRank) return invalid;

  // Must be within board bounds
  if (toFile < 0 || toFile > 7 || toRank < 0 || toRank > 7) return invalid;

  // Check movement pattern
  const reachable = getMovementSquares(board, piece, fromFile, fromRank);
  const canReach = reachable.some(sq => sq.file === toFile && sq.rank === toRank);
  if (!canReach) return invalid;

  // Castle square restriction: only royal pieces can enter
  // Exceptions:
  //   - Veteran can enter EMPTY castle squares on last rank for promotion (book2 lines 803-806)
  //   - Scout can enter castle square if enemy piece there (exchange)
  if (isCastleSquare(toFile, toRank) && !isRoyalPiece(piece.kind)) {
    const targetKey = squareKey(toFile, toRank);
    const target = board[targetKey];
    const isVeteranPromotion = piece.kind === 'veteran' && !target &&
      ((piece.color === 'white' && toRank === 7) || (piece.color === 'black' && toRank === 0));
    const isScoutExchange = piece.kind === 'bishop' && target && target.color !== piece.color;
    if (!isVeteranPromotion && !isScoutExchange) {
      return invalid;
    }
  }

  // Castle exit restriction
  if (!canLeaveCastle(board, piece, fromFile, fromRank, toFile, toRank)) {
    return invalid;
  }

  const targetKey = squareKey(toFile, toRank);
  const targetPiece = board[targetKey];

  // Cannot move to a square with own piece
  if (targetPiece && targetPiece.color === piece.color) return invalid;

  // Capture validation
  if (targetPiece && targetPiece.color !== piece.color) {
    const fm = computeForceMap(board);
    if (!canCaptureByForce(board, fm, piece.color, toFile, toRank, piece)) {
      return invalid;
    }

    // Scout exchange on castle square
    if (piece.kind === 'bishop' && isCastleSquare(toFile, toRank)) {
      return { valid: true, captured: targetPiece, scoutExchange: true };
    }

    return { valid: true, captured: targetPiece, scoutExchange: false };
  }

  return { valid: true, captured: null, scoutExchange: false };
}

/**
 * Castle exit restriction: if an enemy royal piece is in your castle
 * and you have only one own ROYAL piece there, that royal piece cannot leave.
 * Moving within the castle (between castle squares) is allowed.
 * Only applies to royal pieces — non-royal pieces are never restricted.
 */
function canLeaveCastle(board: BoardMap, piece: Piece, fromFile: number, fromRank: number, toFile?: number, toRank?: number): boolean {
  // Only royal pieces can be restricted
  if (!isRoyalPiece(piece.kind)) return true;

  const fromKey = squareKey(fromFile, fromRank);
  const myCastle = getCastleSquares(piece.color);

  // Only applies if the piece is in its own castle
  if (!myCastle.includes(fromKey)) return true;

  // Moving within the castle is always allowed
  if (toFile !== undefined && toRank !== undefined) {
    const toKey = squareKey(toFile, toRank);
    if (myCastle.includes(toKey)) return true;
  }

  const enemyColor: Color = piece.color === 'white' ? 'black' : 'white';

  // Check if there's an enemy royal piece in my castle
  let enemyRoyalInCastle = false;
  let myRoyalPiecesInCastle = 0;

  for (const cKey of myCastle) {
    const p = board[cKey];
    if (!p) continue;
    if (p.color === piece.color && isRoyalPiece(p.kind)) myRoyalPiecesInCastle++;
    if (p.color === enemyColor && isRoyalPiece(p.kind)) enemyRoyalInCastle = true;
  }

  // If enemy royal is in my castle and I'm the only royal defender, can't leave
  if (enemyRoyalInCastle && myRoyalPiecesInCastle <= 1) return false;

  return true;
}

/**
 * Get all legal moves for a specific piece.
 */
export function getLegalMovesForPiece(
  board: BoardMap,
  piece: Piece,
  file: number,
  rank: number,
  turn: Color
): Square[] {
  const reachable = getMovementSquares(board, piece, file, rank);
  const fm = computeForceMap(board);
  const legal: Square[] = [];

  for (const sq of reachable) {
    const toKey = squareKey(sq.file, sq.rank);
    const targetPiece = board[toKey];

    // Can't move to square with own piece
    if (targetPiece && targetPiece.color === piece.color) continue;

    // Castle restriction: non-royal can't enter (except Veteran promotion on EMPTY square, Scout exchange)
    if (isCastleSquare(sq.file, sq.rank) && !isRoyalPiece(piece.kind)) {
      const isVeteranPromotion = piece.kind === 'veteran' && !targetPiece &&
        ((piece.color === 'white' && sq.rank === 7) || (piece.color === 'black' && sq.rank === 0));
      const isScoutExchange = piece.kind === 'bishop' && targetPiece && targetPiece.color !== piece.color;
      if (!isVeteranPromotion && !isScoutExchange) continue;
    }

    // Castle exit restriction
    if (!canLeaveCastle(board, piece, file, rank, sq.file, sq.rank)) continue;

    // Capture check
    if (targetPiece && targetPiece.color !== piece.color) {
      if (!canCaptureByForce(board, fm, piece.color, sq.file, sq.rank, piece)) continue;
    }

    legal.push(sq);
  }

  return legal;
}

/**
 * Check if the given color has any legal move.
 */
export function hasAnyLegalMove(board: BoardMap, color: Color): boolean {
  for (const key in board) {
    const piece = board[key];
    if (piece.color !== color) continue;
    const { file, rank } = keyToSquare(key);
    const moves = getLegalMovesForPiece(board, piece, file, rank, color);
    if (moves.length > 0) return true;
  }
  return false;
}
