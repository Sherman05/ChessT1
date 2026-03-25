export type PieceKind = 'king' | 'prince' | 'rook' | 'bishop' | 'knight' | 'pawn' | 'veteran';
export type Color = 'white' | 'black';
export type GameMode = 'party' | 'analysis';
export type AnalysisStage = 'setup' | 'play';

export interface Piece {
  kind: PieceKind;
  color: Color;
  id: string;
}

export interface Square {
  file: number; // 0=a, 7=h
  rank: number; // 0=1, 7=8
}

export interface Move {
  piece: Piece;
  from: Square;
  to: Square;
  captured: Piece | null;
  promotion: PieceKind | null;
  autoPromotion: boolean;
  boardSnapshot: Record<string, Piece>;
  turnAfter: Color;
  scoutExchange: boolean; // Scout exchange on castle square
}

export interface PromotionContext {
  piece: Piece;
  from: Square;
  to: Square;
  captured: Piece | null;
  options: PieceKind[];
}

export function squareKey(file: number, rank: number): string {
  return `${file},${rank}`;
}

export function squareToKey(sq: Square): string {
  return `${sq.file},${sq.rank}`;
}

export function keyToSquare(key: string): Square {
  const [f, r] = key.split(',').map(Number);
  return { file: f, rank: r };
}

export function fileToLetter(file: number): string {
  return String.fromCharCode(97 + file); // a=0, h=7
}

export function rankToNumber(rank: number): string {
  return String(rank + 1); // 0->1, 7->8
}

export function squareNotation(file: number, rank: number): string {
  return `${fileToLetter(file)}${rankToNumber(rank)}`;
}

export const CASTLE_WHITE: string[] = [
  squareKey(2, 0), // c1
  squareKey(3, 0), // d1
  squareKey(4, 0), // e1
  squareKey(5, 0), // f1
];

export const CASTLE_BLACK: string[] = [
  squareKey(2, 7), // c8
  squareKey(3, 7), // d8
  squareKey(4, 7), // e8
  squareKey(5, 7), // f8
];

export function isCastleSquare(file: number, rank: number): boolean {
  const key = squareKey(file, rank);
  return CASTLE_WHITE.includes(key) || CASTLE_BLACK.includes(key);
}

export function isWhiteCastle(file: number, rank: number): boolean {
  return CASTLE_WHITE.includes(squareKey(file, rank));
}

export function isBlackCastle(file: number, rank: number): boolean {
  return CASTLE_BLACK.includes(squareKey(file, rank));
}

export function getCastleSquares(color: Color): string[] {
  return color === 'white' ? CASTLE_WHITE : CASTLE_BLACK;
}

export function getEnemyCastleSquares(color: Color): string[] {
  return color === 'white' ? CASTLE_BLACK : CASTLE_WHITE;
}

export const ROYAL_PIECES: PieceKind[] = ['king', 'prince', 'rook'];

export function isRoyalPiece(kind: PieceKind): boolean {
  return ROYAL_PIECES.includes(kind);
}

// Force values for each piece type
// Scout (bishop) has 0 — handled specially (infinite direct attack, 0 support/defense)
export const PIECE_FORCE: Record<PieceKind, number> = {
  pawn: 1,
  veteran: 1.5,
  prince: 1.5,
  king: 1.5,
  knight: 2,    // Ritter
  rook: 3,      // Connet
  bishop: 0,    // Scout — special rules
};

export const PIECE_NAMES: Record<PieceKind, string> = {
  king: 'Король',
  prince: 'Принц',
  rook: 'Коннет',
  bishop: 'Разведчик',
  knight: 'Риттер',
  pawn: 'Кнехт',
  veteran: 'Вер Кнехт',
};

export const PIECE_SHORT: Record<PieceKind, string> = {
  king: 'Кр',
  prince: 'Пр',
  rook: 'Кт',
  bishop: 'Рк',
  knight: 'Рт',
  pawn: 'Кн',
  veteran: 'ВК',
};

export function getPieceImagePath(kind: PieceKind, color: Color): string {
  return `${import.meta.env.BASE_URL}pieces/${color}-${kind}.svg`;
}

export const ALL_PIECE_KINDS: PieceKind[] = ['king', 'prince', 'rook', 'bishop', 'knight', 'pawn', 'veteran'];
