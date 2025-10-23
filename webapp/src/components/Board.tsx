import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGomokuWs } from '../hooks/useGomokuWs';
import { Stone } from './Stone';
import { useToast } from '../hooks/useToast';
import { clsx } from 'clsx';

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

      // Rate limiting: prevent rapid clicks
      if (now - lastClickTime.current < 250) {
        return;
      }
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
          const audio = new Audio('/sounds/place.mp3');
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

          {/* Board Grid */}
          <div
            ref={boardRef}
            className="grid gap-0 bg-yellow-100 dark:bg-yellow-900 p-3 sm:p-4 rounded-lg shadow-xl border-4 border-gray-800 dark:border-gray-200"
            style={{
              gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
              aspectRatio: '1 / 1',
              maxWidth: 'min(90vw, 800px)',
              width: '100%',
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
                      'relative aspect-square border-2 border-gray-700 dark:border-gray-400 bg-yellow-100 dark:bg-yellow-900',
                      'hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-all duration-150',
                      'focus:outline-none touch-manipulation',
                      {
                        'ring-4 ring-blue-500 ring-offset-2': isFocused,
                        'bg-blue-100 dark:bg-blue-900': isHovered && canPlace,
                        'cursor-pointer': canPlace,
                        'cursor-not-allowed': !canPlace,
                      }
                    )}
                    onClick={() => handleCellClick(x, y)}
                    onMouseEnter={() => setHoveredCell([x, y])}
                    onMouseLeave={() => setHoveredCell(null)}
                    onFocus={() => setFocusedCell([x, y])}
                    disabled={!canPlace}
                    aria-label={`位置 ${xLabels[x]}${yLabels[y]}`}
                    tabIndex={isFocused ? 0 : -1}
                  >
                    {/* Stone */}
                    {stoneValue !== 0 && (
                      <Stone color={stoneValue === 1 ? 'black' : 'white'} isWin={isWin} />
                    )}

                    {/* Preview stone on hover */}
                    {isHovered && isEmpty && canPlace && playerColor && (
                      <div
                        className={clsx(
                          'absolute inset-0.5 rounded-full opacity-60 border-2',
                          playerColor === 'black'
                            ? 'bg-stone-black border-gray-600'
                            : 'bg-stone-white border-gray-400'
                        )}
                      />
                    )}

                    {/* Win line highlight */}
                    {isWin && (
                      <div className="absolute inset-0 border-4 border-accent rounded-full animate-pulse shadow-lg shadow-accent/50" />
                    )}
                  </button>
                );
              })
            )}
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
