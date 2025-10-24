/**
 * 五目並べコアエンジン
 * 純粋なゲームロジックを提供（副作用なし）
 */

export type Cell = 0 | 1 | 2; // 0:空, 1:黒, 2:白
export type Board = Cell[][];
export type Pos = { x: number; y: number };

/**
 * 空の盤面を初期化
 */
export function initBoard(size: number = 15): Board {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill(0) as Cell[]);
}

/**
 * 指定位置が盤面内かチェック
 */
export function isInBounds(board: Board, x: number, y: number): boolean {
  const H = board.length;
  const W = board[0]?.length ?? 0;
  return x >= 0 && x < W && y >= 0 && y < H;
}

/**
 * 有効な手かチェック（盤面内 & 空き）
 */
export function isValidMove(board: Board, x: number, y: number): boolean {
  return isInBounds(board, x, y) && board[y][x] === 0;
}

/**
 * 石を配置（イミュータブル更新）
 */
export function applyMove(board: Board, pos: Pos, color: 1 | 2): Board {
  const newBoard = board.map(row => [...row]);
  newBoard[pos.y][pos.x] = color;
  return newBoard;
}

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
export function checkWin(
  board: Board,
  last: Pos,
  color: 1 | 2,
  need: number = 5
): Array<[number, number]> | null {
  const dirs = [
    { dx: 1, dy: 0 },   // 横
    { dx: 0, dy: 1 },   // 縦
    { dx: 1, dy: 1 },   // 斜め ↘
    { dx: 1, dy: -1 },  // 斜め ↗
  ];
  const H = board.length;
  const W = board[0]?.length ?? 0;

  /**
   * 指定方向の連続数をカウント（正方向+逆方向）
   */
  function countLine(dx: number, dy: number): { count: number; line: Array<[number, number]> } {
    const line: Array<[number, number]> = [[last.x, last.y]];
    let count = 1; // 自身を含む

    // 正方向に走査
    let x = last.x + dx;
    let y = last.y + dy;
    while (x >= 0 && x < W && y >= 0 && y < H && board[y][x] === color) {
      line.push([x, y]);
      count++;
      x += dx;
      y += dy;
    }

    // 逆方向に走査
    x = last.x - dx;
    y = last.y - dy;
    while (x >= 0 && x < W && y >= 0 && y < H && board[y][x] === color) {
      line.unshift([x, y]); // 前方に追加
      count++;
      x -= dx;
      y -= dy;
    }

    return { count, line };
  }

  // 4方向を順次チェック
  for (const d of dirs) {
    const { count, line } = countLine(d.dx, d.dy);
    if (count >= need) {
      // 勝利ラインを返す（最初の5個のみ）
      return line.slice(0, 5) as Array<[number, number]>;
    }
  }

  return null;
}

/**
 * 引き分け判定（盤面が満杯か）
 */
export function isDraw(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell === 0) {
        return false; // 空きマスが1つでもあれば引き分けではない
      }
    }
  }
  return true;
}

/**
 * 盤面のディープコピー
 */
export function copyBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/**
 * 指定位置の石を取得（範囲外は-1）
 */
export function getStone(board: Board, x: number, y: number): number {
  if (!isInBounds(board, x, y)) {
    return -1;
  }
  return board[y][x];
}
