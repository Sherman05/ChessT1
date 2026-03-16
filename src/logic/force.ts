import { Color, Piece, PieceKind, squareKey, keyToSquare, isCastleSquare, isRoyalPiece, PIECE_FORCE } from '../types/chess';
import { BoardMap } from './board';
import { getMovementSquares } from './movement';

export interface ForceMap {
  // Total force projected by each color (excluding Scout)
  whiteTotal: Record<string, number>;
  blackTotal: Record<string, number>;
  // Force from royal pieces only
  whiteRoyal: Record<string, number>;
  blackRoyal: Record<string, number>;
}

/**
 * Compute force projection for the entire board.
 * Each piece (except Scout) projects its force value to its reachable squares + own square.
 * Scout projects 0 force (handled specially in capture logic).
 */
export function computeForceMap(board: BoardMap): ForceMap {
  const fm: ForceMap = {
    whiteTotal: {},
    blackTotal: {},
    whiteRoyal: {},
    blackRoyal: {},
  };

  for (const key in board) {
    const piece = board[key];
    // Scout doesn't project force
    if (piece.kind === 'bishop') continue;

    const { file, rank } = keyToSquare(key);
    const force = PIECE_FORCE[piece.kind];
    if (force <= 0) continue;

    const totalMap = piece.color === 'white' ? fm.whiteTotal : fm.blackTotal;
    const royalMap = piece.color === 'white' ? fm.whiteRoyal : fm.blackRoyal;
    const royal = isRoyalPiece(piece.kind);

    // Project to own square
    totalMap[key] = (totalMap[key] || 0) + force;
    if (royal) royalMap[key] = (royalMap[key] || 0) + force;

    // Project to reachable squares
    const squares = getMovementSquares(board, piece, file, rank);
    for (const sq of squares) {
      const sqKey = squareKey(sq.file, sq.rank);
      totalMap[sqKey] = (totalMap[sqKey] || 0) + force;
      if (royal) royalMap[sqKey] = (royalMap[sqKey] || 0) + force;
    }
  }

  return fm;
}

/**
 * Get effective attack force on a square for the given attacker color.
 * On castle squares: non-royal attack force only counts if at least one royal piece also attacks.
 */
export function getEffectiveAttack(fm: ForceMap, attackerColor: Color, file: number, rank: number): number {
  const key = squareKey(file, rank);
  const totalForce = attackerColor === 'white' ? (fm.whiteTotal[key] || 0) : (fm.blackTotal[key] || 0);
  const royalForce = attackerColor === 'white' ? (fm.whiteRoyal[key] || 0) : (fm.blackRoyal[key] || 0);

  if (isCastleSquare(file, rank)) {
    // On castle squares: non-royal force only counts if royal force > 0
    return royalForce > 0 ? totalForce : royalForce;
  }

  return totalForce;
}

/**
 * Get effective defense force on a square for the given defender color.
 * Defense is always the total force (non-royal defends normally everywhere).
 */
export function getEffectiveDefense(fm: ForceMap, defenderColor: Color, file: number, rank: number): number {
  const key = squareKey(file, rank);
  return defenderColor === 'white' ? (fm.whiteTotal[key] || 0) : (fm.blackTotal[key] || 0);
}

/**
 * Check if a capture is possible on the given square by the attacker color.
 * movingPiece is the piece attempting to capture.
 * Returns true if force superiority allows the capture.
 */
export function canCaptureByForce(
  board: BoardMap,
  fm: ForceMap,
  attackerColor: Color,
  targetFile: number,
  targetRank: number,
  movingPiece: Piece
): boolean {
  // Scout special: always captures on regular squares, exchange on castle squares
  if (movingPiece.kind === 'bishop') {
    return true; // Scout's direct attack = infinite
  }

  const defenderColor: Color = attackerColor === 'white' ? 'black' : 'white';
  const attack = getEffectiveAttack(fm, attackerColor, targetFile, targetRank);
  const defense = getEffectiveDefense(fm, defenderColor, targetFile, targetRank);

  return attack > defense;
}

/**
 * Check if the king of the given color is in check.
 * Check = enemy could capture the king (force superiority or Scout can reach).
 */
export function isKingInCheck(board: BoardMap, color: Color): boolean {
  // Find king
  let kingFile = -1, kingRank = -1;
  for (const key in board) {
    const p = board[key];
    if (p.kind === 'king' && p.color === color) {
      const sq = keyToSquare(key);
      kingFile = sq.file;
      kingRank = sq.rank;
      break;
    }
  }
  if (kingFile < 0) return false; // No king (shouldn't happen)

  const enemyColor: Color = color === 'white' ? 'black' : 'white';

  // Check if any enemy Scout can reach the king
  // Scout has infinite direct attack. On castle squares it exchanges (both die).
  // Either way, the king is threatened.
  for (const key in board) {
    const p = board[key];
    if (p.kind === 'bishop' && p.color === enemyColor) {
      const { file, rank } = keyToSquare(key);
      const squares = getMovementSquares(board, p, file, rank);
      const canReach = squares.some(sq => sq.file === kingFile && sq.rank === kingRank);
      if (canReach) {
        return true;
      }
    }
  }

  // Check force superiority
  const fm = computeForceMap(board);
  const enemyAttack = getEffectiveAttack(fm, enemyColor, kingFile, kingRank);
  const myDefense = getEffectiveDefense(fm, color, kingFile, kingRank);

  return enemyAttack > myDefense;
}
