import { describe, it, expect, beforeEach } from 'vitest';
import * as Gomoku from '../server/engine/gomoku';
import { GameRules, DEFAULT_RULES } from '../server/engine/rules';

describe('Gomoku Engine', () => {
  let board: Gomoku.Board;

  beforeEach(() => {
    board = Gomoku.initBoard(15);
  });

  describe('盤面初期化', () => {
    it('指定サイズの空盤面を作成できる', () => {
      const board15 = Gomoku.initBoard(15);
      expect(board15.length).toBe(15);
      expect(board15[0].length).toBe(15);
      expect(board15.every(row => row.every(cell => cell === 0))).toBe(true);
    });

    it('19x19の盤面も作成できる', () => {
      const board19 = Gomoku.initBoard(19);
      expect(board19.length).toBe(19);
      expect(board19[0].length).toBe(19);
    });
  });

  describe('石の配置', () => {
    it('有効な位置に石を配置できる', () => {
      const newBoard = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      expect(newBoard[7][7]).toBe(1);
      // イミュータブル更新を確認
      expect(board[7][7]).toBe(0);
    });

    it('白い石も配置できる', () => {
      const newBoard = Gomoku.applyMove(board, { x: 3, y: 5 }, 2);
      expect(newBoard[5][3]).toBe(2);
    });
  });

  describe('有効な手のチェック', () => {
    it('空きマスは有効', () => {
      expect(Gomoku.isValidMove(board, 7, 7)).toBe(true);
    });

    it('既に石がある場所は無効', () => {
      const newBoard = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      expect(Gomoku.isValidMove(newBoard, 7, 7)).toBe(false);
    });

    it('範囲外は無効', () => {
      expect(Gomoku.isValidMove(board, -1, 7)).toBe(false);
      expect(Gomoku.isValidMove(board, 15, 7)).toBe(false);
      expect(Gomoku.isValidMove(board, 7, -1)).toBe(false);
      expect(Gomoku.isValidMove(board, 7, 15)).toBe(false);
    });
  });

  describe('勝敗判定 - 横5連', () => {
    it('横5連で勝利判定される（中央）', () => {
      // 中央から横に5連
      board = Gomoku.applyMove(board, { x: 5, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 8, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 9, y: 7 }, 1);

      const result = Gomoku.checkWin(board, { x: 9, y: 7 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
      expect(result).toEqual([
        [5, 7], [6, 7], [7, 7], [8, 7], [9, 7]
      ]);
    });

    it('横5連で勝利判定される（左端）', () => {
      board = Gomoku.applyMove(board, { x: 0, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 1, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 2, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 3, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 4, y: 7 }, 2);

      const result = Gomoku.checkWin(board, { x: 4, y: 7 }, 2);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('横5連で勝利判定される（右端）', () => {
      board = Gomoku.applyMove(board, { x: 14, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 13, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 12, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 11, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 10, y: 7 }, 1);

      const result = Gomoku.checkWin(board, { x: 10, y: 7 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('横4連では勝利判定されない', () => {
      board = Gomoku.applyMove(board, { x: 5, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 8, y: 7 }, 1);

      const result = Gomoku.checkWin(board, { x: 8, y: 7 }, 1);
      expect(result).toBeNull();
    });

    it('横6連以上でも勝利判定される', () => {
      board = Gomoku.applyMove(board, { x: 4, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 5, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 8, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 9, y: 7 }, 1);

      const result = Gomoku.checkWin(board, { x: 9, y: 7 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5); // 最初の5個を返す
    });

    it('横7連以上でも勝利判定される', () => {
      for (let x = 3; x <= 9; x++) {
        board = Gomoku.applyMove(board, { x, y: 7 }, 1);
      }
      const result = Gomoku.checkWin(board, { x: 9, y: 7 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });
  });

  describe('勝敗判定 - 縦5連', () => {
    it('縦5連で勝利判定される（中央）', () => {
      board = Gomoku.applyMove(board, { x: 7, y: 5 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 6 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 8 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 9 }, 2);

      const result = Gomoku.checkWin(board, { x: 7, y: 9 }, 2);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('縦5連で勝利判定される（上端）', () => {
      board = Gomoku.applyMove(board, { x: 7, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 1 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 2 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 3 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 4 }, 1);

      const result = Gomoku.checkWin(board, { x: 7, y: 4 }, 1);
      expect(result).not.toBeNull();
    });

    it('縦5連で勝利判定される（下端）', () => {
      board = Gomoku.applyMove(board, { x: 7, y: 14 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 13 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 12 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 11 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 10 }, 2);

      const result = Gomoku.checkWin(board, { x: 7, y: 10 }, 2);
      expect(result).not.toBeNull();
    });
  });

  describe('勝敗判定 - 斜め5連', () => {
    it('右下斜め5連で勝利判定される', () => {
      board = Gomoku.applyMove(board, { x: 5, y: 5 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 6 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 8, y: 8 }, 1);
      board = Gomoku.applyMove(board, { x: 9, y: 9 }, 1);

      const result = Gomoku.checkWin(board, { x: 9, y: 9 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('右上斜め5連で勝利判定される', () => {
      board = Gomoku.applyMove(board, { x: 5, y: 9 }, 2);
      board = Gomoku.applyMove(board, { x: 6, y: 8 }, 2);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 2);
      board = Gomoku.applyMove(board, { x: 8, y: 6 }, 2);
      board = Gomoku.applyMove(board, { x: 9, y: 5 }, 2);

      const result = Gomoku.checkWin(board, { x: 9, y: 5 }, 2);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });

    it('左上端から右下斜め5連', () => {
      board = Gomoku.applyMove(board, { x: 0, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 1, y: 1 }, 1);
      board = Gomoku.applyMove(board, { x: 2, y: 2 }, 1);
      board = Gomoku.applyMove(board, { x: 3, y: 3 }, 1);
      board = Gomoku.applyMove(board, { x: 4, y: 4 }, 1);

      const result = Gomoku.checkWin(board, { x: 4, y: 4 }, 1);
      expect(result).not.toBeNull();
    });
  });

  describe('引き分け判定', () => {
    it('空き盤面は引き分けではない', () => {
      expect(Gomoku.isDraw(board)).toBe(false);
    });

    it('1マスでも空きがあれば引き分けではない', () => {
      // 盤面をほぼ埋める
      for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
          if (x === 7 && y === 7) continue; // 中央を空ける
          board = Gomoku.applyMove(board, { x, y }, (x + y) % 2 === 0 ? 1 : 2);
        }
      }
      expect(Gomoku.isDraw(board)).toBe(false);
    });

    it('全マス埋まったら引き分け', () => {
      // 全マスを埋める（勝利条件にならないように）
      for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
          board = Gomoku.applyMove(board, { x, y }, (x + y) % 2 === 0 ? 1 : 2);
        }
      }
      expect(Gomoku.isDraw(board)).toBe(true);
    });
  });

  describe('異なる色の石', () => {
    it('異なる色の石は連続としてカウントされない', () => {
      board = Gomoku.applyMove(board, { x: 5, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 7 }, 2); // 異なる色
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 8, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 9, y: 7 }, 1);

      const result = Gomoku.checkWin(board, { x: 9, y: 7 }, 1);
      expect(result).toBeNull();
    });
  });

  describe('効率性テスト', () => {
    it('最後の一手から判定するため高速', () => {
      // 大量の石を配置
      for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * 15);
        const y = Math.floor(Math.random() * 15);
        if (Gomoku.isValidMove(board, x, y)) {
          board = Gomoku.applyMove(board, { x, y }, 1);
        }
      }

      // 最後の一手で判定（即座に完了すること）
      const start = Date.now();
      const result = Gomoku.checkWin(board, { x: 7, y: 7 }, 1);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(10); // 10ms以内
    });
  });

  describe('境界ケース', () => {
    it('盤面の四隅での5連判定', () => {
      // 左上から横
      board = Gomoku.applyMove(board, { x: 0, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 1, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 2, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 3, y: 0 }, 1);
      board = Gomoku.applyMove(board, { x: 4, y: 0 }, 1);

      const result = Gomoku.checkWin(board, { x: 4, y: 0 }, 1);
      expect(result).not.toBeNull();
    });

    it('中央の手から両方向に広がる5連', () => {
      // 中央から左右2個ずつ
      board = Gomoku.applyMove(board, { x: 5, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 6, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1); // 中央
      board = Gomoku.applyMove(board, { x: 8, y: 7 }, 1);
      board = Gomoku.applyMove(board, { x: 9, y: 7 }, 1);

      // 中央の手で判定
      const result = Gomoku.checkWin(board, { x: 7, y: 7 }, 1);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(5);
    });
  });

  describe('getStone関数', () => {
    it('範囲内の石を取得できる', () => {
      board = Gomoku.applyMove(board, { x: 7, y: 7 }, 1);
      expect(Gomoku.getStone(board, 7, 7)).toBe(1);
    });

    it('範囲外は-1を返す', () => {
      expect(Gomoku.getStone(board, -1, 7)).toBe(-1);
      expect(Gomoku.getStone(board, 15, 7)).toBe(-1);
    });
  });
});
