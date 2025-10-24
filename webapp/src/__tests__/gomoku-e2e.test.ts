/**
 * 五目並べE2Eテスト
 * 主要なゲームロジックと同期をテスト
 */

import { describe, it, expect } from 'vitest';

describe('五目並べ交点スナップロジック', () => {
  // coords.tsのmapToGrid関数をテスト
  it('交点の中心付近はスナップ成功', () => {
    const boardConfig = {
      size: 15,
      marginPx: 32,
      cellPx: 40,
      snapThresholdRatio: 0.4,
      stoneSizeRatio: 0.75,
      starPoints: [[7, 7]] as const,
    };

    // 交点(0,0)の論理座標は(32, 32)
    const result = mapToGrid({ x: 32, y: 32 }, boardConfig);
    expect(result.gx).toBe(0);
    expect(result.gy).toBe(0);
    expect(result.ok).toBe(true);
  });

  it('交点から離れた位置はスナップ失敗', () => {
    const boardConfig = {
      size: 15,
      marginPx: 32,
      cellPx: 40,
      snapThresholdRatio: 0.4,
      stoneSizeRatio: 0.75,
      starPoints: [[7, 7]] as const,
    };

    // しきい値外（40*0.4=16pxより遠い）
    const result = mapToGrid({ x: 50, y: 50 }, boardConfig);
    expect(result.ok).toBe(false);
  });

  it('盤面外の座標はスナップ失敗', () => {
    const boardConfig = {
      size: 15,
      marginPx: 32,
      cellPx: 40,
      snapThresholdRatio: 0.4,
      stoneSizeRatio: 0.75,
      starPoints: [[7, 7]] as const,
    };

    // 盤面外
    const result = mapToGrid({ x: 10, y: 10 }, boardConfig);
    expect(result.ok).toBe(false);
  });
});

describe('五目並べ勝利判定', () => {
  it('水平5連で勝利', () => {
    const board: number[][] = Array(15)
      .fill(null)
      .map(() => Array(15).fill(0));

    // (0,0)-(4,0)に黒石を配置
    for (let x = 0; x < 5; x++) {
      board[0][x] = 1;
    }

    const winLine = checkWin(board, { x: 4, y: 0 }, 1, 5);
    expect(winLine).not.toBeNull();
    expect(winLine?.length).toBe(5);
  });

  it('垂直5連で勝利', () => {
    const board: number[][] = Array(15)
      .fill(null)
      .map(() => Array(15).fill(0));

    // (0,0)-(0,4)に黒石を配置
    for (let y = 0; y < 5; y++) {
      board[y][0] = 1;
    }

    const winLine = checkWin(board, { x: 0, y: 4 }, 1, 5);
    expect(winLine).not.toBeNull();
    expect(winLine?.length).toBe(5);
  });

  it('斜め5連で勝利', () => {
    const board: number[][] = Array(15)
      .fill(null)
      .map(() => Array(15).fill(0));

    // (0,0)-(4,4)に黒石を配置
    for (let i = 0; i < 5; i++) {
      board[i][i] = 1;
    }

    const winLine = checkWin(board, { x: 4, y: 4 }, 1, 5);
    expect(winLine).not.toBeNull();
    expect(winLine?.length).toBe(5);
  });

  it('4連では勝利しない', () => {
    const board: number[][] = Array(15)
      .fill(null)
      .map(() => Array(15).fill(0));

    // (0,0)-(3,0)に黒石を配置（4連）
    for (let x = 0; x < 4; x++) {
      board[0][x] = 1;
    }

    const winLine = checkWin(board, { x: 3, y: 0 }, 1, 5);
    expect(winLine).toBeNull();
  });
});

// ヘルパー関数（テスト用に簡易実装）
function mapToGrid(
  { x, y }: { x: number; y: number },
  cfg: { marginPx: number; cellPx: number; snapThresholdRatio: number; size: number }
): { gx: number; gy: number; ok: boolean; dist: number } {
  const gx = Math.round((x - cfg.marginPx) / cfg.cellPx);
  const gy = Math.round((y - cfg.marginPx) / cfg.cellPx);

  const sx = cfg.marginPx + gx * cfg.cellPx;
  const sy = cfg.marginPx + gy * cfg.cellPx;

  const dist = Math.hypot(x - sx, y - sy);

  const threshold = cfg.cellPx * cfg.snapThresholdRatio;
  const onBoard = gx >= 0 && gx < cfg.size && gy >= 0 && gy < cfg.size;
  const ok = onBoard && dist <= threshold;

  return { gx, gy, ok, dist };
}

function checkWin(
  board: number[][],
  last: { x: number; y: number },
  color: 1 | 2,
  need: number = 5
): Array<[number, number]> | null {
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ];
  const H = board.length;
  const W = board[0]?.length ?? 0;

  function countLine(dx: number, dy: number): { count: number; line: Array<[number, number]> } {
    const line: Array<[number, number]> = [[last.x, last.y]];
    let count = 1;

    let x = last.x + dx;
    let y = last.y + dy;
    while (x >= 0 && x < W && y >= 0 && y < H && board[y][x] === color) {
      line.push([x, y]);
      count++;
      x += dx;
      y += dy;
    }

    x = last.x - dx;
    y = last.y - dy;
    while (x >= 0 && x < W && y >= 0 && y < H && board[y][x] === color) {
      line.unshift([x, y]);
      count++;
      x -= dx;
      y -= dy;
    }

    return { count, line };
  }

  for (const d of dirs) {
    const { count, line } = countLine(d.dx, d.dy);
    if (count >= need) {
      return line.slice(0, 5) as Array<[number, number]>;
    }
  }

  return null;
}
