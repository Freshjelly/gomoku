import { useRef, useEffect, useCallback, useState } from 'react';
import { boardConfig, getBoardLogicalSize, getResponsiveBoardConfig } from '../lib/boardConfig';
import { getCanvasLogicalXY, mapToGrid, gridToLogical } from '../lib/coords';
import { useGameStore } from '../store/gameStore';
import { useGomokuWs } from '../hooks/useGomokuWs';
import { useToast } from '../hooks/useToast';
import { canClick } from '../lib/throttle';

export function BoardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [currentConfig, setCurrentConfig] = useState(getResponsiveBoardConfig());
  const lastClickTime = useRef(0);

  const { board, playerColor, currentTurn, winLine, soundEnabled, gameEnded } = useGameStore();
  const { placeStone } = useGomokuWs();
  const { showToast } = useToast();

  // Canvas初期化と高DPI対応
  const setupCanvas = useCallback((canvas: HTMLCanvasElement, config: typeof boardConfig) => {
    const dpr = window.devicePixelRatio || 1;
    const logicalSize = getBoardLogicalSize(config);

    // CSS表示サイズ
    canvas.style.width = `${logicalSize}px`;
    canvas.style.height = `${logicalSize}px`;

    // 実ピクセルサイズ（高DPI対応）
    canvas.width = logicalSize * dpr;
    canvas.height = logicalSize * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 論理座標系にスケール
      ctx.scale(dpr, dpr);
    }
  }, []);

  // 盤面描画
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { size, marginPx, cellPx, starPoints, stoneSizeRatio } = currentConfig;
    const logicalSize = getBoardLogicalSize(currentConfig);

    // 背景クリア
    ctx.clearRect(0, 0, logicalSize, logicalSize);

    // 背景色
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg-board')
      .trim() || '#f5f7fb';
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    // グリッド線の描画
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-secondary')
      .trim() || '#666666';
    ctx.lineWidth = 1;

    for (let i = 0; i < size; i++) {
      const pos = marginPx + i * cellPx;

      // 縦線
      ctx.beginPath();
      ctx.moveTo(pos, marginPx);
      ctx.lineTo(pos, marginPx + (size - 1) * cellPx);
      ctx.stroke();

      // 横線
      ctx.beginPath();
      ctx.moveTo(marginPx, pos);
      ctx.lineTo(marginPx + (size - 1) * cellPx, pos);
      ctx.stroke();
    }

    // 星（天元）の描画
    ctx.fillStyle = ctx.strokeStyle;
    starPoints.forEach(([gx, gy]) => {
      const { x, y } = gridToLogical(gx, gy, currentConfig);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 石の描画
    const stoneRadius = (cellPx * stoneSizeRatio) / 2;
    for (let gy = 0; gy < size; gy++) {
      for (let gx = 0; gx < size; gx++) {
        const stoneValue = board[gy][gx];
        if (stoneValue === 0) continue;

        const { x, y } = gridToLogical(gx, gy, currentConfig);

        // 石本体
        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, Math.PI * 2);
        ctx.fillStyle = stoneValue === 1
          ? (getComputedStyle(document.documentElement).getPropertyValue('--color-stone-black').trim() || '#111111')
          : (getComputedStyle(document.documentElement).getPropertyValue('--color-stone-white').trim() || '#eaeaea');
        ctx.fill();

        // 石の縁
        ctx.strokeStyle = stoneValue === 1 ? '#333' : '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 勝利ハイライト
        const isWin = winLine?.some(([wx, wy]) => wx === gx && wy === gy);
        if (isWin) {
          ctx.strokeStyle = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-accent')
            .trim() || '#3b82f6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, stoneRadius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // ホバープレビュー
    if (hoveredCell && playerColor && currentTurn === playerColor && !gameEnded) {
      const [gx, gy] = hoveredCell;
      if (board[gy][gx] === 0) {
        const { x, y } = gridToLogical(gx, gy, currentConfig);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, stoneRadius, 0, Math.PI * 2);
        ctx.fillStyle = playerColor === 'black'
          ? (getComputedStyle(document.documentElement).getPropertyValue('--color-stone-black').trim() || '#111111')
          : (getComputedStyle(document.documentElement).getPropertyValue('--color-stone-white').trim() || '#eaeaea');
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  }, [board, winLine, hoveredCell, playerColor, currentTurn, gameEnded, currentConfig]);

  // Pointer down/up ハンドラ
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const now = Date.now();
      if (!canClick(lastClickTime.current, now, 250)) return;
      lastClickTime.current = now;

      const logicalXY = getCanvasLogicalXY(e, canvas);
      const { gx, gy, ok } = mapToGrid(logicalXY, currentConfig);

      if (!ok) return;

      // ゲーム状態チェック
      if (gameEnded) {
        showToast('ゲームは終了しています', 'warning');
        return;
      }

      if (playerColor !== currentTurn) {
        showToast('あなたの手番ではありません', 'warning');
        return;
      }

      if (board[gy][gx] !== 0) {
        showToast('その場所には石を置けません', 'warning');
        return;
      }

      // 石を配置
      const success = placeStone(gx, gy);
      if (success && soundEnabled) {
        try {
          const base = (import.meta as any).env?.BASE_URL || '/';
          const url = new URL('sounds/place.mp3', base.endsWith('/') ? base : `${base}/`).toString();
          const audio = new Audio(url);
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch {}
      }
    },
    [board, playerColor, currentTurn, gameEnded, placeStone, soundEnabled, showToast, currentConfig]
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const logicalXY = getCanvasLogicalXY(e, canvas);
    const { gx, gy, ok } = mapToGrid(logicalXY, currentConfig);

    if (ok) {
      setHoveredCell([gx, gy]);
    } else {
      setHoveredCell(null);
    }
  }, [currentConfig]);

  const handlePointerLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Canvasセットアップとイベント登録
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setupCanvas(canvas, currentConfig);

    canvas.addEventListener('pointerdown', handlePointerDown as any);
    canvas.addEventListener('pointermove', handlePointerMove as any);
    canvas.addEventListener('pointerleave', handlePointerLeave as any);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown as any);
      canvas.removeEventListener('pointermove', handlePointerMove as any);
      canvas.removeEventListener('pointerleave', handlePointerLeave as any);
    };
  }, [setupCanvas, handlePointerDown, handlePointerMove, handlePointerLeave, currentConfig]);

  // リサイズ対応
  useEffect(() => {
    const handleResize = () => {
      const newConfig = getResponsiveBoardConfig();
      setCurrentConfig(newConfig);
      const canvas = canvasRef.current;
      if (canvas) {
        setupCanvas(canvas, newConfig);
        draw();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, draw]);

  // 再描画トリガー
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="flex justify-center items-center">
      <canvas
        ref={canvasRef}
        className="board-canvas"
      />
    </div>
  );
}
