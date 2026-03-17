import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Board } from './components/Board';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { IntroPage } from './components/IntroPage';
import { MenuPanel } from './components/MenuPanel';
import { PieceTray } from './components/PieceTray';
import { PromotionDialog } from './components/PromotionDialog';
import { MoveList } from './components/MoveList';
import { ChessClock } from './components/ChessClock';
import { useGameStore } from './store/gameStore';
import { useChessClock } from './hooks/useChessClock';
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
  const whiteInCheck = useGameStore(s => s.whiteInCheck);
  const blackInCheck = useGameStore(s => s.blackInCheck);

  const drag = useDragStore(s => s.drag);
  const updateDrag = useDragStore(s => s.updateDrag);
  const endDrag = useDragStore(s => s.endDrag);

  const boardRef = useRef<HTMLDivElement>(null);
  const isSetup = mode === 'analysis' && analysisStage === 'setup';

  // Chess clock
  const [clockEnabled, setClockEnabled] = useState(false);
  const [clockMinutes, setClockMinutes] = useState(10);
  const clock = useChessClock(clockMinutes);
  const historyState = useGameStore(s => s.historyState);
  const moveCount = historyState.history.length;

  // Switch clock when turn changes
  useEffect(() => {
    if (!clockEnabled || gameOver || isSetup) {
      clock.stop();
      return;
    }
    if (moveCount > 0) {
      clock.switchTo(turn);
    }
  }, [turn, moveCount, clockEnabled, gameOver, isSetup]);

  // Stop clock on game over
  useEffect(() => {
    if (gameOver) clock.stop();
  }, [gameOver]);

  // Reset clock when game resets
  useEffect(() => {
    if (moveCount === 0) clock.reset(clockMinutes);
  }, [moveCount, clockMinutes]);

  // Time out detection
  useEffect(() => {
    if (clockEnabled && !gameOver) {
      if (clock.whiteTime <= 0 || clock.blackTime <= 0) {
        // Time ran out - handled by UI indication only (no auto-loss in casual play)
      }
    }
  }, [clock.whiteTime, clock.blackTime, clockEnabled, gameOver]);

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

  // Global pointer move/up for drag-and-drop (covers tray → board drags)
  const handleGlobalPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const sq = getSquareFromPoint(e.clientX, e.clientY);
    updateDrag(e.clientX, e.clientY, sq);
  }, [drag, getSquareFromPoint, updateDrag]);

  const handleGlobalPointerUp = useCallback((e: React.PointerEvent) => {
    const dragData = endDrag();
    if (!dragData) return;

    const targetSquare = getSquareFromPoint(e.clientX, e.clientY);
    if (!targetSquare) return;

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

  // Turn indicator text
  let turnText = '';
  if (isSetup) {
    turnText = 'Расстановка фигур';
  } else if (gameOver) {
    turnText = isDraw ? 'Ничья' : (winner === 'white' ? 'Победа белых' : 'Победа чёрных');
  } else {
    const checkStr = (turn === 'white' && whiteInCheck) || (turn === 'black' && blackInCheck)
      ? ' (ШАХ!)' : '';
    turnText = (turn === 'white' ? 'Ход белых' : 'Ход чёрных') + checkStr;
  }

  return (
    <div
      className="app"
      onPointerMove={handleGlobalPointerMove}
      onPointerUp={handleGlobalPointerUp}
    >
      <TopBar />

      <div className={`main-area ${isSetup ? 'analysis-setup' : ''}`}>
        {showMenu && <MenuPanel />}
        <div className="game-layout">
          {isSetup && (
            <PieceTray
              color={leftTrayColor}
              side="left"
              boardRef={boardRef}
            />
          )}

          {clockEnabled && (
            <ChessClock
              whiteTime={clock.whiteTime}
              blackTime={clock.blackTime}
              activeSide={clock.activeSide}
              isFlipped={isFlipped}
            />
          )}

          <div style={{ position: 'relative' }}>
            <Board ref={boardRef} />
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
            <div className="turn-indicator">
              {turnText}
            </div>
          </div>

          {isSetup ? (
            <PieceTray
              color={rightTrayColor}
              side="right"
              boardRef={boardRef}
            />
          ) : (
            <MoveList />
          )}
        </div>
      </div>

      <BottomBar
        clockEnabled={clockEnabled}
        onToggleClock={() => setClockEnabled(!clockEnabled)}
        clockMinutes={clockMinutes}
        onSetClockMinutes={setClockMinutes}
      />

      {showIntro && <IntroPage />}

      {drag && (
        <FloatingPiece
          piece={drag.piece}
          x={drag.currentX}
          y={drag.currentY}
          size={cellSize * 0.9}
        />
      )}
    </div>
  );
}

export default App;
