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
  winCondition: number; // 勝利に必要な連続数（通常5）
}

/**
 * デフォルトルール（標準五目並べ）
 */
export const DEFAULT_RULES: GameRules = {
  variant: 'standard',
  boardSize: 15,
  winCondition: 5,
};

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
export function validateMove(
  rules: GameRules,
  board: Board,
  pos: Pos,
  color: 1 | 2
): MoveValidation {
  const { x, y } = pos;
  const H = board.length;
  const W = board[0]?.length ?? 0;

  // 盤面内チェック
  if (x < 0 || x >= W || y < 0 || y >= H) {
    return { valid: false, error: 'OUT_OF_BOUNDS' };
  }

  // 空きマスチェック
  if (board[y][x] !== 0) {
    return { valid: false, error: 'CELL_OCCUPIED' };
  }

  // レンジュルールの禁手チェック（黒石のみ）
  if (rules.variant === 'renju' && color === 1) {
    const forbidden = checkRenjuForbidden(board, pos);
    if (forbidden.isForbidden) {
      return { valid: false, error: forbidden.reason };
    }
  }

  return { valid: true };
}

/**
 * レンジュの禁手判定（黒石のみ）
 * TODO: 初期版は常に許可（将来実装）
 *
 * - 3-3（ダブルスリー）: 2つ以上の三が同時に成立
 * - 4-4（ダブルフォー）: 2つ以上の四が同時に成立
 * - 長連（6連以上）: 6個以上連続で並ぶ
 */
function checkRenjuForbidden(
  board: Board,
  pos: Pos
): { isForbidden: boolean; reason?: string } {
  // TODO: レンジュ禁手の実装
  // 現在は全て許可
  return { isForbidden: false };
}

/**
 * ルール設定の検証
 */
export function validateRules(rules: Partial<GameRules>): GameRules {
  const variant = rules.variant ?? DEFAULT_RULES.variant;
  const boardSize = rules.boardSize ?? DEFAULT_RULES.boardSize;
  const winCondition = rules.winCondition ?? DEFAULT_RULES.winCondition;

  // 盤面サイズの検証（5〜25の範囲）
  if (boardSize < 5 || boardSize > 25) {
    throw new Error('Board size must be between 5 and 25');
  }

  // 勝利条件の検証（3〜盤面サイズ以下）
  if (winCondition < 3 || winCondition > boardSize) {
    throw new Error('Win condition must be between 3 and board size');
  }

  return {
    variant,
    boardSize,
    winCondition,
  };
}
