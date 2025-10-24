import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGomokuWs } from '../hooks/useGomokuWs';
import { Stone } from './Stone';
import { useToast } from '../hooks/useToast';
import { clsx } from 'clsx';
import { canClick } from '../lib/throttle';

export function Board() {
  const { board, playerColor, currentTurn, winLine, soundEnabled } = useGameStore();

  const { placeStone } = useGomokuWs();
  const { showToast } = useToast();

  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef(0);

  // Handle cell click
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      // Rate limiting: prevent rapid clicks (>=250ms)
      if (!canClick(lastClickTime.current, now, 250)) return;
      lastClickTime.current = now;

      // Check if it's player's turn
      if (playerColor !== currentTurn) {
        showToast('あなたの手番ではありません', 'warning');
        return;
      }

      // Check if cell is empty
      if (board[y][x] !== 0) {
        showToast('その場所には石を置けません', 'warning');
        return;
      }

      // Place stone
      const success = placeStone(x, y);
      if (success && soundEnabled) {
        // Play place sound
        try {
          const base = (import.meta as any).env?.BASE_URL || '/';
          const url = new URL('sounds/place.mp3', base.endsWith('/') ? base : `${base}/`).toString();
          const audio = new Audio(url);
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {}
      }
    },
    [board, playerColor, currentTurn, placeStone, soundEnabled, showToast]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!focusedCell) return;

      const [x, y] = focusedCell;
      let newX = x;
      let newY = y;

      switch (event.key) {
        case 'ArrowUp':
          newY = Math.max(0, y - 1);
          break;
        case 'ArrowDown':
          newY = Math.min(14, y + 1);
          break;
        case 'ArrowLeft':
          newX = Math.max(0, x - 1);
          break;
        case 'ArrowRight':
          newX = Math.min(14, x + 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleCellClick(x, y);
          return;
        default:
          return;
      }

      if (newX !== x || newY !== y) {
        setFocusedCell([newX, newY]);
      }
    },
    [focusedCell, handleCellClick]
  );

  // Set up keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Initialize focused cell
  useEffect(() => {
    if (!focusedCell) {
      setFocusedCell([7, 7]); // Center of board
    }
  }, [focusedCell]);

  // Check if cell is in win line
  const isWinCell = useCallback(
    (x: number, y: number) => {
      return winLine?.some(([wx, wy]) => wx === x && wy === y) || false;
    },
    [winLine]
  );

  // Generate coordinate labels
  const xLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  const yLabels = Array.from({ length: 15 }, (_, i) => (i + 1).toString());

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col items-center">
        {/* Board Container */}
        <div className="relative w-full max-w-4xl">
          {/* X-axis labels */}
          <div className="absolute -top-10 left-10 right-10 flex justify-between pointer-events-none">
            {xLabels.map((label, index) => (
              <div
                key={index}
                className="flex items-center justify-center text-sm sm:text-base font-semibold text-text-primary"
                style={{ width: 'calc(100% / 15)' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute -left-10 top-10 bottom-10 flex flex-col justify-between pointer-events-none">
            {yLabels.map((label, index) => (
              <div
                key={index}
                className="flex items-center justify-center text-sm sm:text-base font-semibold text-text-primary"
                style={{ height: 'calc(100% / 15)' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Board Grid - 線の交点方式 */}
          <div
            ref={boardRef}
            className="relative bg-yellow-100 dark:bg-yellow-900 p-8 sm:p-12 rounded-lg shadow-xl border-4 border-gray-800 dark:border-gray-200"
            style={{
              aspectRatio: '1 / 1',
              maxWidth: 'min(90vw, 800px)',
              width: '100%',
            }}
          >
            {/* 碁盤の線 */}
            <svg
              className="absolute inset-8 sm:inset-12 w-[calc(100%-4rem)] sm:w-[calc(100%-6rem)] h-[calc(100%-4rem)] sm:h-[calc(100%-6rem)]"
              viewBox="0 0 14 14"
              preserveAspectRatio="none"
            >
              {/* 縦線 */}
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i}
                  y1={0}
                  x2={i}
                  y2={14}
                  stroke="currentColor"
                  strokeWidth="0.05"
                  className="text-gray-700 dark:text-gray-400"
                />
              ))}
              {/* 横線 */}
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1={0}
                  y1={i}
                  x2={14}
                  y2={i}
                  stroke="currentColor"
                  strokeWidth="0.05"
                  className="text-gray-700 dark:text-gray-400"
                />
              ))}
              {/* 星（天元と4隅） */}
              {[[7, 7], [3, 3], [3, 11], [11, 3], [11, 11]].map(([cx, cy], idx) => (
                <circle
                  key={`star${idx}`}
                  cx={cx}
                  cy={cy}
                  r="0.15"
                  fill="currentColor"
                  className="text-gray-700 dark:text-gray-400"
                />
              ))}
            </svg>

            {/* 交点のクリック可能エリア */}
            <div
              className="absolute inset-8 sm:inset-12"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(15, 1fr)',
                gridTemplateRows: 'repeat(15, 1fr)',
                gap: 0,
              }}
            >
              {Array.from({ length: 15 }, (_, y) =>
                Array.from({ length: 15 }, (_, x) => {
                  const stoneValue = board[y][x];
                  const isHovered = hoveredCell?.[0] === x && hoveredCell?.[1] === y;
                  const isFocused = focusedCell?.[0] === x && focusedCell?.[1] === y;
                  const isWin = isWinCell(x, y);
                  const isEmpty = stoneValue === 0;
                  const canPlace = isEmpty && playerColor === currentTurn;

                  return (
                    <button
                      key={`${x}-${y}`}
                      className={clsx(
                        'relative flex items-center justify-center',
                        'hover:bg-blue-200/30 dark:hover:bg-blue-800/30 transition-all duration-150',
                        'focus:outline-none touch-manipulation',
                        'w-full h-full',
                        {
                          'ring-2 ring-blue-500 rounded-full': isFocused,
                          'bg-blue-100/50 dark:bg-blue-900/50 rounded-full': isHovered && canPlace,
                          'cursor-pointer': canPlace,
                          'cursor-not-allowed': !canPlace,
                        }
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCellClick(x, y);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCellClick(x, y);
                      }}
                      onMouseEnter={() => setHoveredCell([x, y])}
                      onMouseLeave={() => setHoveredCell(null)}
                      onFocus={() => setFocusedCell([x, y])}
                      aria-label={`位置 ${xLabels[x]}${yLabels[y]}`}
                      tabIndex={isFocused ? 0 : -1}
                    >
                      {/* Stone - 交点中央に配置、25%縮小 */}
                      {stoneValue !== 0 && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="w-3/4 h-3/4">
                            <Stone color={stoneValue === 1 ? 'black' : 'white'} isWin={isWin} />
                          </div>
                        </div>
                      )}

                      {/* Preview stone on hover */}
                      {isHovered && isEmpty && canPlace && playerColor && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div
                            className={clsx(
                              'w-6 h-6 sm:w-7 sm:h-7 rounded-full opacity-60 border-2',
                              playerColor === 'black'
                                ? 'bg-stone-black border-gray-600'
                                : 'bg-stone-white border-gray-400'
                            )}
                          />
                        </div>
                      )}

                      {/* Win line highlight */}
                      {isWin && (
                        <div
                          className="absolute w-8 h-8 sm:w-9 sm:h-9 border-4 border-accent rounded-full animate-pulse shadow-lg shadow-accent/50 pointer-events-none"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Board Info */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm sm:text-base text-text-secondary font-medium">
            マウスでクリック、または矢印キーで移動してEnterで石を置く
          </p>
          <div className="flex items-center justify-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-black border-2 border-gray-600"></div>
              <span className="text-text-secondary">黒石</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-white border-2 border-gray-400"></div>
              <span className="text-text-secondary">白石</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
