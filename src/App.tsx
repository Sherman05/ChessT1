import React, { useRef, useCallback, useState } from 'react';
import { Board } from './components/Board';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { IntroPage } from './components/IntroPage';
import { MenuPanel } from './components/MenuPanel';
import { PieceTray } from './components/PieceTray';
import { PromotionDialog } from './components/PromotionDialog';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';
import { useDragStore } from './store/dragStore';
import { Color, squareKey } from './types/chess';
import { FloatingPiece } from './components/Piece';
import './App.css';

function App() {
  const showIntro = useUIStore(s => s.showIntro);
  const showMenu = useUIStore(s => s.showMenu);
  const mode = useGameStore(s => s.mode);
  const analysisStage = useGameStore(s => s.analysisStage);
  const isFlipped = useGameStore(s => s.isFlipped);
  const turn = useGameStore(s => s.turn);
  const promotionContext = useGameStore(s => s.promotionContext);
  const placePieceFromTray = useGameStore(s => s.placePieceFromTray);
  const makeMove = useGameStore(s => s.makeMove);
  const removePieceFromBoard = useGameStore(s => s.removePieceFromBoard);
  const board = useGameStore(s => s.board);
  const gameOver = useGameStore(s => s.gameOver);
  const winner = useGameStore(s => s.winner);
  const gameOverReason = useGameStore(s => s.gameOverReason);
  const isDraw = useGameStore(s => s.isDraw);
  const setInitialPosition = useGameStore(s => s.setInitialPosition);

  const drag = useDragStore(s => s.drag);
  const updateDrag = useDragStore(s => s.updateDrag);
  const endDrag = useDragStore(s => s.endDrag);

  const boardRef = useRef<HTMLDivElement>(null);
  const isSetup = mode === 'analysis' && analysisStage === 'setup';
  const [outOfBoundsArrow, setOutOfBoundsArrow] = useState<{ x: number; y: number; side: string } | null>(null);

  const getSquareFromPoint = useCallback((clientX: number, clientY: number) => {
    const boardEl = boardRef.current;
    if (!boardEl) return null;
    const rect = boardEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellSize = rect.width / 8;
    let file = Math.floor(x / cellSize);
    let rank = 7 - Math.floor(y / cellSize);
    if (isFlipped) { file = 7 - file; rank = 7 - rank; }
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return { file, rank };
  }, [isFlipped]);

  const handleGlobalPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const sq = getSquareFromPoint(e.clientX, e.clientY);
    updateDrag(e.clientX, e.clientY, sq);
  }, [drag, getSquareFromPoint, updateDrag]);

  const handleGlobalPointerUp = useCallback((e: React.PointerEvent) => {
    const dragData = endDrag();
    if (!dragData) return;

    let targetSquare = getSquareFromPoint(e.clientX, e.clientY);

    // If dropped outside the board
    if (!targetSquare) {
      // Check if cursor is completely outside the board area
      const boardEl = boardRef.current;
      if (boardEl) {
        const rect = boardEl.getBoundingClientRect();
        const isOutside = e.clientX < rect.left || e.clientX > rect.right ||
                          e.clientY < rect.top || e.clientY > rect.bottom;

        if (isOutside && dragData.sourceSquare) {
          // Figure dragged outside board — remove it, show arrow indicator
          removePieceFromBoard(dragData.sourceSquare);
          // Determine which side the piece left from
          let side = 'right';
          if (e.clientX < rect.left) side = 'left';
          else if (e.clientX > rect.right) side = 'right';
          else if (e.clientY < rect.top) side = 'top';
          else side = 'bottom';
          // Show arrow at the edge
          const arrowX = Math.max(rect.left, Math.min(e.clientX, rect.right));
          const arrowY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
          setOutOfBoundsArrow({ x: arrowX, y: arrowY, side });
          setTimeout(() => setOutOfBoundsArrow(null), 1500);
          return;
        }
      }

      // Dropped between cells — "stick" to last valid square
      if (dragData.lastValidSquare) {
        targetSquare = dragData.lastValidSquare;
      } else {
        return;
      }
    }

    if (dragData.traySource) {
      placePieceFromTray(dragData.traySource.kind, dragData.traySource.color, targetSquare);
    } else if (dragData.sourceSquare) {
      if (isSetup) {
        const fromKey = squareKey(dragData.sourceSquare.file, dragData.sourceSquare.rank);
        const piece = board[fromKey];
        if (piece) {
          removePieceFromBoard(dragData.sourceSquare);
          placePieceFromTray(piece.kind, piece.color, targetSquare);
        }
      } else {
        makeMove(dragData.sourceSquare, targetSquare);
      }
    }
  }, [endDrag, getSquareFromPoint, placePieceFromTray, removePieceFromBoard, board, makeMove, isSetup]);

  // Determine tray positions based on flip state
  const leftTrayColor: Color = isFlipped ? 'black' : 'white';
  const rightTrayColor: Color = isFlipped ? 'white' : 'black';

  // Cell size for floating piece
  const boardEl = boardRef.current;
  const cellSize = boardEl ? boardEl.getBoundingClientRect().width / 8 : 60;

  return (
    <div
      className="app"
      onPointerMove={handleGlobalPointerMove}
      onPointerUp={handleGlobalPointerUp}
    >
      <TopBar />

      <div className={`main-area ${isSetup ? 'analysis-setup' : ''}`}>
        <div className="game-layout">
          {isSetup && (
            <PieceTray
              color={leftTrayColor}
              side="left"
              boardRef={boardRef}
            />
          )}

          <div style={{ position: 'relative' }}>
            <Board ref={boardRef} />
            {showMenu && <MenuPanel />}
            {promotionContext && <PromotionDialog />}
            {gameOver && (
              <div className="game-over-overlay">
                <div className="game-over-panel">
                  <h2>{isDraw ? 'Ничья' : (winner === 'white' ? 'Белые победили!' : 'Чёрные победили!')}</h2>
                  <p>{gameOverReason}</p>
                  <button onClick={setInitialPosition}>Новая партия</button>
                </div>
              </div>
            )}
            {/* Turn indicator with circles (Q29) */}
            <div className="turn-indicator">
              {isSetup ? (
                <span>Расстановка фигур</span>
              ) : (
                <div className="turn-lamps">
                  <div className={`turn-lamp ${turn === 'white' ? 'active' : ''}`}>
                    <div className="lamp-inner white" />
                  </div>
                  <span className="turn-text">
                    {gameOver
                      ? (isDraw ? 'Ничья' : (winner === 'white' ? 'Победа белых' : 'Победа чёрных'))
                      : (turn === 'white' ? 'Ход белых' : 'Ход чёрных')
                    }
                  </span>
                  <div className={`turn-lamp ${turn === 'black' ? 'active' : ''}`}>
                    <div className="lamp-inner black" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {isSetup && (
            <PieceTray
              color={rightTrayColor}
              side="right"
              boardRef={boardRef}
            />
          )}
        </div>
      </div>

      <BottomBar />

      {showIntro && <IntroPage />}

      {drag && (
        <FloatingPiece
          piece={drag.piece}
          x={drag.currentX}
          y={drag.currentY}
          size={cellSize * 0.9}
        />
      )}

      {outOfBoundsArrow && (
        <div
          className="out-of-bounds-arrow"
          style={{
            left: outOfBoundsArrow.x,
            top: outOfBoundsArrow.y,
          }}
        >
          ↔
        </div>
      )}
    </div>
  );
}

export default App;
