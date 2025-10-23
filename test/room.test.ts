import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '../server/room';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('石の配置', () => {
    it('有効な位置に石を配置できる', () => {
      expect(board.placeStone(7, 7, 'black')).toBe(true);
      expect(board.getStone(7, 7)).toBe(1);
    });

    it('範囲外の位置には石を配置できない', () => {
      expect(board.placeStone(-1, 7, 'black')).toBe(false);
      expect(board.placeStone(15, 7, 'black')).toBe(false);
      expect(board.placeStone(7, -1, 'black')).toBe(false);
      expect(board.placeStone(7, 15, 'black')).toBe(false);
    });

    it('既に石がある位置には石を配置できない', () => {
      board.placeStone(7, 7, 'black');
      expect(board.placeStone(7, 7, 'white')).toBe(false);
    });

    it('白い石を正しく配置できる', () => {
      expect(board.placeStone(7, 7, 'white')).toBe(true);
      expect(board.getStone(7, 7)).toBe(2);
    });
  });

  describe('勝敗判定 - 横5連', () => {
    it('横5連で勝利判定される（中央）', () => {
      // 中央から横に5連
      board.placeStone(5, 7, 'black');
      board.placeStone(6, 7, 'black');
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 7, 'black');
      
      const result = board.checkWin(9, 7, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [5, 7], [6, 7], [7, 7], [8, 7], [9, 7]
      ]);
    });

    it('横5連で勝利判定される（左端）', () => {
      // 左端から横に5連
      board.placeStone(0, 7, 'white');
      board.placeStone(1, 7, 'white');
      board.placeStone(2, 7, 'white');
      board.placeStone(3, 7, 'white');
      
      const result = board.checkWin(4, 7, 'white');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [0, 7], [1, 7], [2, 7], [3, 7], [4, 7]
      ]);
    });

    it('横5連で勝利判定される（右端）', () => {
      // 右端から横に5連（左方向）
      board.placeStone(14, 7, 'black');
      board.placeStone(13, 7, 'black');
      board.placeStone(12, 7, 'black');
      board.placeStone(11, 7, 'black');
      
      const result = board.checkWin(10, 7, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [14, 7], [13, 7], [12, 7], [11, 7], [10, 7]
      ]);
    });

    it('横4連では勝利判定されない', () => {
      board.placeStone(5, 7, 'black');
      board.placeStone(6, 7, 'black');
      board.placeStone(7, 7, 'black');
      
      const result = board.checkWin(8, 7, 'black');
      expect(result).toBeNull();
    });

    it('横6連以上でも5連として判定される', () => {
      board.placeStone(4, 7, 'black');
      board.placeStone(5, 7, 'black');
      board.placeStone(6, 7, 'black');
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 7, 'black');
      
      const result = board.checkWin(9, 7, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });
  });

  describe('勝敗判定 - 縦5連', () => {
    it('縦5連で勝利判定される（中央）', () => {
      board.placeStone(7, 5, 'white');
      board.placeStone(7, 6, 'white');
      board.placeStone(7, 7, 'white');
      board.placeStone(7, 8, 'white');
      
      const result = board.checkWin(7, 9, 'white');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [7, 5], [7, 6], [7, 7], [7, 8], [7, 9]
      ]);
    });

    it('縦5連で勝利判定される（上端）', () => {
      // 上端から縦に5連
      board.placeStone(7, 0, 'black');
      board.placeStone(7, 1, 'black');
      board.placeStone(7, 2, 'black');
      board.placeStone(7, 3, 'black');
      
      const result = board.checkWin(7, 4, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [7, 0], [7, 1], [7, 2], [7, 3], [7, 4]
      ]);
    });

    it('縦5連で勝利判定される（下端）', () => {
      // 下端から縦に5連（上方向）
      board.placeStone(7, 14, 'white');
      board.placeStone(7, 13, 'white');
      board.placeStone(7, 12, 'white');
      board.placeStone(7, 11, 'white');
      
      const result = board.checkWin(7, 10, 'white');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [7, 14], [7, 13], [7, 12], [7, 11], [7, 10]
      ]);
    });

    it('縦4連では勝利判定されない', () => {
      board.placeStone(7, 5, 'white');
      board.placeStone(7, 6, 'white');
      board.placeStone(7, 7, 'white');
      
      const result = board.checkWin(7, 8, 'white');
      expect(result).toBeNull();
    });
  });

  describe('勝敗判定 - 斜め5連', () => {
    it('右下斜め5連で勝利判定される（中央）', () => {
      board.placeStone(5, 5, 'black');
      board.placeStone(6, 6, 'black');
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 8, 'black');
      
      const result = board.checkWin(9, 9, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]
      ]);
    });

    it('右上斜め5連で勝利判定される（中央）', () => {
      board.placeStone(5, 9, 'white');
      board.placeStone(6, 8, 'white');
      board.placeStone(7, 7, 'white');
      board.placeStone(8, 6, 'white');
      
      const result = board.checkWin(9, 5, 'white');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [5, 9], [6, 8], [7, 7], [8, 6], [9, 5]
      ]);
    });

    it('斜め5連で勝利判定される（左上端）', () => {
      // 左上端から右下斜めに5連
      board.placeStone(0, 0, 'black');
      board.placeStone(1, 1, 'black');
      board.placeStone(2, 2, 'black');
      board.placeStone(3, 3, 'black');
      
      const result = board.checkWin(4, 4, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [0, 0], [1, 1], [2, 2], [3, 3], [4, 4]
      ]);
    });

    it('斜め4連では勝利判定されない', () => {
      board.placeStone(5, 5, 'black');
      board.placeStone(6, 6, 'black');
      board.placeStone(7, 7, 'black');
      
      const result = board.checkWin(8, 8, 'black');
      expect(result).toBeNull();
    });
  });

  describe('境界ケース', () => {
    it('盤面の端での5連判定', () => {
      // 左上端から横5連
      board.placeStone(0, 0, 'black');
      board.placeStone(1, 0, 'black');
      board.placeStone(2, 0, 'black');
      board.placeStone(3, 0, 'black');
      
      const result = board.checkWin(4, 0, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('盤面の端での縦5連判定', () => {
      // 左上端から縦5連
      board.placeStone(0, 0, 'white');
      board.placeStone(0, 1, 'white');
      board.placeStone(0, 2, 'white');
      board.placeStone(0, 3, 'white');
      
      const result = board.checkWin(0, 4, 'white');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('盤面の右下端での5連判定', () => {
      // 右下端から横5連（左方向）
      board.placeStone(14, 14, 'black');
      board.placeStone(13, 14, 'black');
      board.placeStone(12, 14, 'black');
      board.placeStone(11, 14, 'black');
      
      const result = board.checkWin(10, 14, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });
  });

  describe('複数方向の同時判定', () => {
    it('複数方向に5連があっても最初に見つかったものを返す', () => {
      // 横5連と縦5連が同時に成立する状況
      board.placeStone(5, 7, 'black');
      board.placeStone(6, 7, 'black');
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 7, 'black');
      
      board.placeStone(7, 5, 'black');
      board.placeStone(7, 6, 'black');
      board.placeStone(7, 8, 'black');
      
      const result = board.checkWin(7, 7, 'black');
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });
  });

  describe('異なる色の石', () => {
    it('異なる色の石は連続としてカウントされない', () => {
      board.placeStone(5, 7, 'black');
      board.placeStone(6, 7, 'white'); // 異なる色
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 7, 'black');
      
      const result = board.checkWin(9, 7, 'black');
      expect(result).toBeNull();
    });
  });

  describe('盤面状態の取得', () => {
    it('盤面の状態を正しく取得できる', () => {
      board.placeStone(7, 7, 'black');
      board.placeStone(8, 8, 'white');
      
      const boardState = board.getBoard();
      expect(boardState[7][7]).toBe(1);
      expect(boardState[8][8]).toBe(2);
      expect(boardState[0][0]).toBe(0);
    });

    it('盤面の状態はコピーを返す', () => {
      board.placeStone(7, 7, 'black');
      const boardState1 = board.getBoard();
      const boardState2 = board.getBoard();
      
      boardState1[7][7] = 999; // 変更
      expect(boardState2[7][7]).toBe(1); // 元の値が保持される
    });
  });
});
