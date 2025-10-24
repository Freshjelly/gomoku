import { boardConfig } from './boardConfig';

/**
 * Pointer座標をCanvas論理座標に変換
 * @param e PointerEvent
 * @param canvas Canvas要素
 * @returns Canvas内の論理座標（CSSピクセル基準）
 */
export function getCanvasLogicalXY(
  e: PointerEvent,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

/**
 * Canvas論理座標をグリッド座標に変換し、スナップ判定を実行
 * @param coords 論理座標
 * @param cfg 盤設定
 * @returns グリッド座標とスナップ可否
 */
export function mapToGrid(
  { x, y }: { x: number; y: number },
  cfg = boardConfig
): { gx: number; gy: number; ok: boolean; dist: number } {
  // 最も近い交点のグリッド座標を計算
  const gx = Math.round((x - cfg.marginPx) / cfg.cellPx);
  const gy = Math.round((y - cfg.marginPx) / cfg.cellPx);

  // スナップ先の論理座標（交点の中心）
  const sx = cfg.marginPx + gx * cfg.cellPx;
  const sy = cfg.marginPx + gy * cfg.cellPx;

  // 交点までの距離を計算
  const dist = Math.hypot(x - sx, y - sy);

  // しきい値内かつ盤面内なら配置可能
  const threshold = cfg.cellPx * cfg.snapThresholdRatio;
  const onBoard = gx >= 0 && gx < cfg.size && gy >= 0 && gy < cfg.size;
  const ok = onBoard && dist <= threshold;

  return { gx, gy, ok, dist };
}

/**
 * グリッド座標を論理座標に変換（交点の中心座標を取得）
 * @param gx グリッドX座標
 * @param gy グリッドY座標
 * @param cfg 盤設定
 * @returns 論理座標
 */
export function gridToLogical(
  gx: number,
  gy: number,
  cfg = boardConfig
): { x: number; y: number } {
  return {
    x: cfg.marginPx + gx * cfg.cellPx,
    y: cfg.marginPx + gy * cfg.cellPx,
  };
}
