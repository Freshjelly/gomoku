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
 * 画面サイズに応じた盤面設定を計算（レスポンシブ）
 */
export function getResponsiveBoardConfig(): typeof boardConfig {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // モバイル（縦持ち）の場合は画面幅の90%、横持ちは高さの80%
  const isPortrait = viewportHeight > viewportWidth;
  const maxSize = isPortrait
    ? Math.min(viewportWidth * 0.9, 600)
    : Math.min(viewportHeight * 0.8, 600);

  // タッチターゲット最小44px確保のため、cellPxを計算
  const totalSize = boardConfig.size;
  const minCellPx = 24; // 最小セルサイズ
  const maxCellPx = 50; // 最大セルサイズ

  // マージンを考慮して最適なcellPxを計算
  const margin = Math.max(20, maxSize * 0.05);
  const availableSize = maxSize - margin * 2;
  const cellPx = Math.max(minCellPx, Math.min(maxCellPx, availableSize / (totalSize - 1)));

  return {
    ...boardConfig,
    marginPx: margin,
    cellPx: cellPx,
  };
}

/**
 * 盤の論理サイズを計算
 */
export function getBoardLogicalSize(cfg = boardConfig): number {
  return cfg.marginPx * 2 + cfg.cellPx * (cfg.size - 1);
}
