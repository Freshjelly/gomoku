/**
 * 碁盤の描画・判定に使う設定を一元管理
 */
export const boardConfig = {
  /** 盤のサイズ（15×15） */
  size: 15,

  /** 盤の外枠マージン（論理ピクセル） */
  marginPx: 32,

  /** 交点間の距離（論理ピクセル） */
  cellPx: 40,

  /** 交点へのスナップ許容半径（cellPxに対する比率） */
  snapThresholdRatio: 0.4,

  /** 石のサイズ（cellPxに対する比率） */
  stoneSizeRatio: 0.75,

  /** 星（天元）の位置 */
  starPoints: [
    [7, 7],   // 天元
    [3, 3],   // 左上
    [3, 11],  // 左下
    [11, 3],  // 右上
    [11, 11], // 右下
  ] as const,
};

/**
 * 盤の論理サイズを計算
 */
export function getBoardLogicalSize(cfg = boardConfig): number {
  return cfg.marginPx * 2 + cfg.cellPx * (cfg.size - 1);
}
