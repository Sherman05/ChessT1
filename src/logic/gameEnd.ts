import { Color, Piece, isRoyalPiece, getEnemyCastleSquares } from '../types/chess';
import { BoardMap, boardPositionKey } from './board';
import { hasAnyLegalMove } from './moves';

export interface GameEndResult {
  gameOver: boolean;
  winner: Color | null;
  reason: string | null;
}

/**
 * Check if the game has ended after a move.
 *
 * Victory conditions:
 * 1. King captured → winner is the capturer
 * 2. Royal piece on enemy castle square → winner is the mover
 * 3. Opponent has no legal moves (blockade) → winner is the mover
 */
export function checkGameEnd(
  board: BoardMap,
  moverColor: Color,
  captured: Piece | null,
  scoutExchange: boolean
): GameEndResult {
  const opponentColor: Color = moverColor === 'white' ? 'black' : 'white';

  // 1. King captured
  if (captured && captured.kind === 'king') {
    return {
      gameOver: true,
      winner: moverColor,
      reason: moverColor === 'white' ? 'Белые взяли Короля!' : 'Чёрные взяли Короля!',
    };
  }

  // Scout exchange might have removed a king
  if (scoutExchange) {
    let whiteKingExists = false;
    let blackKingExists = false;
    for (const key in board) {
      if (board[key].kind === 'king') {
        if (board[key].color === 'white') whiteKingExists = true;
        else blackKingExists = true;
      }
    }
    if (!whiteKingExists) {
      return { gameOver: true, winner: 'black', reason: 'Разведчик уничтожил Короля белых в размене!' };
    }
    if (!blackKingExists) {
      return { gameOver: true, winner: 'white', reason: 'Разведчик уничтожил Короля чёрных в размене!' };
    }
  }

  // 2. Castle capture: mover has a royal piece on enemy castle,
  //    AND the opponent has NO royal piece defending the castle.
  const enemyCastle = getEnemyCastleSquares(moverColor);
  let moverRoyalInEnemyCastle = false;
  let defenderRoyalInOwnCastle = false;
  for (const cKey of enemyCastle) {
    const p = board[cKey];
    if (!p) continue;
    if (p.color === moverColor && isRoyalPiece(p.kind)) moverRoyalInEnemyCastle = true;
    if (p.color === opponentColor && isRoyalPiece(p.kind)) defenderRoyalInOwnCastle = true;
  }
  if (moverRoyalInEnemyCastle && !defenderRoyalInOwnCastle) {
    return {
      gameOver: true,
      winner: moverColor,
      reason: moverColor === 'white' ? 'Белые захватили замок!' : 'Чёрные захватили замок!',
    };
  }

  // 3. Blockade — opponent has no legal moves
  if (!hasAnyLegalMove(board, opponentColor)) {
    return {
      gameOver: true,
      winner: moverColor,
      reason: moverColor === 'white' ? 'Блокада! У чёрных нет ходов.' : 'Блокада! У белых нет ходов.',
    };
  }

  return { gameOver: false, winner: null, reason: null };
}

/**
 * Check draw conditions.
 *
 * Draw conditions:
 * 1. 40 moves without capture (80 half-moves)
 * 2. Threefold repetition
 */
export function checkDraw(
  board: BoardMap,
  turn: Color,
  movesSinceCapture: number,
  positionHistory: string[]
): { isDraw: boolean; reason: string | null } {
  // 40-move rule (80 half-moves without capture)
  if (movesSinceCapture >= 80) {
    return { isDraw: true, reason: 'Ничья: 40 ходов без взятий.' };
  }

  // Threefold repetition
  const currentPos = boardPositionKey(board) + '|' + turn;
  const count = positionHistory.filter(p => p === currentPos).length;
  if (count >= 3) {
    return { isDraw: true, reason: 'Ничья: троекратное повторение позиции.' };
  }

  return { isDraw: false, reason: null };
}
