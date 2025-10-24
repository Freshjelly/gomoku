/**
 * 五目並べのルール定義
 * バリアント（標準/レンジュ）の切り替えと禁手チェック
 */
import { Board, Pos } from './gomoku';
/**
 * ルールバリアント
 * - standard: 標準五目並べ（長連OK、禁手なし）
 * - renju: レンジュ（黒石に禁手あり: 3-3, 4-4, 長連NG）
 */
export type Variant = 'standard' | 'renju';
/**
 * ゲームルール設定
 */
export interface GameRules {
    variant: Variant;
    boardSize: number;
    winCondition: number;
}
/**
 * デフォルトルール（標準五目並べ）
 */
export declare const DEFAULT_RULES: GameRules;
/**
 * 着手の検証結果
 */
export interface MoveValidation {
    valid: boolean;
    error?: string;
}
/**
 * 着手が有効かを検証
 * - 盤面内チェック
 * - 空きマスチェック
 * - 禁手チェック（renjuの場合のみ）
 *
 * @param rules ゲームルール
 * @param board 現在の盤面
 * @param pos 着手位置
 * @param color 石の色（1:黒, 2:白）
 */
export declare function validateMove(rules: GameRules, board: Board, pos: Pos, color: 1 | 2): MoveValidation;
/**
 * ルール設定の検証
 */
export declare function validateRules(rules: Partial<GameRules>): GameRules;
//# sourceMappingURL=rules.d.ts.map