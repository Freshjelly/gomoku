import { describe, it, expect } from 'vitest';
import { mapToGrid, gridToLogical } from '../lib/coords';
import { boardConfig } from '../lib/boardConfig';

describe('coords.ts - 座標変換ロジック', () => {
  const { marginPx, cellPx, size } = boardConfig;

  describe('mapToGrid', () => {
    it('交点の中心座標は正確にグリッド座標に変換される', () => {
      // (0, 0) の交点
      const result1 = mapToGrid({ x: marginPx, y: marginPx });
      expect(result1).toEqual({ gx: 0, gy: 0, ok: true, dist: 0 });

      // (7, 7) の交点（天元）
      const x7 = marginPx + 7 * cellPx;
      const y7 = marginPx + 7 * cellPx;
      const result2 = mapToGrid({ x: x7, y: y7 });
      expect(result2).toEqual({ gx: 7, gy: 7, ok: true, dist: 0 });

      // (14, 14) の交点（右下隅）
      const x14 = marginPx + 14 * cellPx;
      const y14 = marginPx + 14 * cellPx;
      const result3 = mapToGrid({ x: x14, y: y14 });
      expect(result3).toEqual({ gx: 14, gy: 14, ok: true, dist: 0 });
    });

    it('しきい値内のオフセットは交点にスナップされる', () => {
      const threshold = cellPx * boardConfig.snapThresholdRatio;

      // 交点から少しずれた位置
      const x = marginPx + 5;  // (0,0)から5px右
      const y = marginPx + 5;  // (0,0)から5px下
      const dist = Math.hypot(5, 5); // 約7.07px

      const result = mapToGrid({ x, y });
      expect(result.gx).toBe(0);
      expect(result.gy).toBe(0);

      if (dist <= threshold) {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
      }
    });

    it('しきい値外の座標はスナップ不可', () => {
      const threshold = cellPx * boardConfig.snapThresholdRatio;

      // 交点から大きくずれた位置
      const x = marginPx + threshold + 10;
      const y = marginPx + threshold + 10;

      const result = mapToGrid({ x, y });
      expect(result.ok).toBe(false);
    });

    it('盤外の座標は不可', () => {
      const threshold = cellPx * boardConfig.snapThresholdRatio;

      // 左上の盤外（閾値外の距離）
      const result1 = mapToGrid({ x: marginPx - threshold - 5, y: marginPx - threshold - 5 });
      expect(result1.ok).toBe(false);

      // 右下の盤外（完全に盤外）
      const x = marginPx + size * cellPx;
      const y = marginPx + size * cellPx;
      const result2 = mapToGrid({ x, y });
      expect(result2.ok).toBe(false);
    });

    it('境界の交点は有効', () => {
      // 左上隅 (0, 0)
      const result1 = mapToGrid({ x: marginPx, y: marginPx });
      expect(result1.gx).toBe(0);
      expect(result1.gy).toBe(0);
      expect(result1.ok).toBe(true);

      // 右上隅 (14, 0)
      const x14 = marginPx + 14 * cellPx;
      const result2 = mapToGrid({ x: x14, y: marginPx });
      expect(result2.gx).toBe(14);
      expect(result2.gy).toBe(0);
      expect(result2.ok).toBe(true);

      // 左下隅 (0, 14)
      const y14 = marginPx + 14 * cellPx;
      const result3 = mapToGrid({ x: marginPx, y: y14 });
      expect(result3.gx).toBe(0);
      expect(result3.gy).toBe(14);
      expect(result3.ok).toBe(true);

      // 右下隅 (14, 14)
      const result4 = mapToGrid({ x: x14, y: y14 });
      expect(result4.gx).toBe(14);
      expect(result4.gy).toBe(14);
      expect(result4.ok).toBe(true);
    });

    it('中間の交点は正確に判定される', () => {
      for (let gx = 0; gx < size; gx++) {
        for (let gy = 0; gy < size; gy++) {
          const x = marginPx + gx * cellPx;
          const y = marginPx + gy * cellPx;
          const result = mapToGrid({ x, y });
          expect(result.gx).toBe(gx);
          expect(result.gy).toBe(gy);
          expect(result.ok).toBe(true);
          expect(result.dist).toBe(0);
        }
      }
    });

    it('最も近い交点へスナップされる', () => {
      // (5, 5)の交点に近い座標
      const x5 = marginPx + 5 * cellPx;
      const y5 = marginPx + 5 * cellPx;

      // 少し右上にずれた位置
      const result = mapToGrid({ x: x5 + 5, y: y5 + 5 });
      expect(result.gx).toBe(5);
      expect(result.gy).toBe(5);
    });
  });

  describe('gridToLogical', () => {
    it('グリッド座標を論理座標に変換', () => {
      const result1 = gridToLogical(0, 0);
      expect(result1).toEqual({ x: marginPx, y: marginPx });

      const result2 = gridToLogical(7, 7);
      expect(result2).toEqual({
        x: marginPx + 7 * cellPx,
        y: marginPx + 7 * cellPx,
      });

      const result3 = gridToLogical(14, 14);
      expect(result3).toEqual({
        x: marginPx + 14 * cellPx,
        y: marginPx + 14 * cellPx,
      });
    });

    it('すべてのグリッド座標が正確に変換される', () => {
      for (let gx = 0; gx < size; gx++) {
        for (let gy = 0; gy < size; gy++) {
          const { x, y } = gridToLogical(gx, gy);
          expect(x).toBe(marginPx + gx * cellPx);
          expect(y).toBe(marginPx + gy * cellPx);
        }
      }
    });
  });

  describe('往復変換の整合性', () => {
    it('gridToLogical → mapToGrid で元に戻る', () => {
      for (let gx = 0; gx < size; gx++) {
        for (let gy = 0; gy < size; gy++) {
          const logical = gridToLogical(gx, gy);
          const grid = mapToGrid(logical);
          expect(grid.gx).toBe(gx);
          expect(grid.gy).toBe(gy);
          expect(grid.ok).toBe(true);
          expect(grid.dist).toBe(0);
        }
      }
    });
  });
});
