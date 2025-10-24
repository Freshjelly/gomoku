/**
 * 五目並べコアエンジン
 * 純粋なゲームロジックを提供（副作用なし）
 */
export type Cell = 0 | 1 | 2;
export type Board = Cell[][];
export type Pos = {
    x: number;
    y: number;
};
/**
 * 空の盤面を初期化
 */
export declare function initBoard(size?: number): Board;
/**
 * 指定位置が盤面内かチェック
 */
export declare function isInBounds(board: Board, x: number, y: number): boolean;
/**
 * 有効な手かチェック（盤面内 & 空き）
 */
export declare function isValidMove(board: Board, x: number, y: number): boolean;
/**
 * 石を配置（イミュータブル更新）
 */
export declare function applyMove(board: Board, pos: Pos, color: 1 | 2): Board;
/**
 * 最後の一手から勝利判定（5連以上）
 * 効率的なアルゴリズム：4方向×2走査でO(1)相当
 *
 * @param board 盤面
 * @param last 最後に置かれた座標
 * @param color 判定する色（1:黒, 2:白）
 * @param need 必要な連続数（デフォルト5）
 * @returns 勝利した場合は勝利ライン、そうでない場合はnull
 */
export declare function checkWin(board: Board, last: Pos, color: 1 | 2, need?: number): Array<[number, number]> | null;
/**
 * 引き分け判定（盤面が満杯か）
 */
export declare function isDraw(board: Board): boolean;
/**
 * 盤面のディープコピー
 */
export declare function copyBoard(board: Board): Board;
/**
 * 指定位置の石を取得（範囲外は-1）
 */
export declare function getStone(board: Board, x: number, y: number): number;
//# sourceMappingURL=gomoku.d.ts.map