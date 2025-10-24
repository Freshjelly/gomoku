import { PlayerColor, GameResult } from './types';
import * as Gomoku from './engine/gomoku';
import { GameRules, DEFAULT_RULES } from './engine/rules';

// 盤面クラス
export class Board {
  private readonly size: number;
  private board: Gomoku.Board;
  private readonly rules: GameRules;

  constructor(rules: GameRules = DEFAULT_RULES) {
    this.rules = rules;
    this.size = rules.boardSize;
    this.board = Gomoku.initBoard(this.size);
  }

  // 石を配置
  placeStone(x: number, y: number, color: PlayerColor): boolean {
    if (!this.isValidMove(x, y)) {
      return false;
    }
    const colorNum = color === 'black' ? 1 : 2;
    this.board = Gomoku.applyMove(this.board, { x, y }, colorNum as 1 | 2);
    return true;
  }

  // 有効な手かチェック
  isValidMove(x: number, y: number): boolean {
    return Gomoku.isValidMove(this.board, x, y);
  }

  // 盤面取得
  getBoard(): number[][] {
    return this.board.map(row => [...row]);
  }

  // 指定位置の石を取得
  getStone(x: number, y: number): number {
    return Gomoku.getStone(this.board, x, y);
  }

  // 勝敗判定（エンジンを使用）
  checkWin(x: number, y: number, color: PlayerColor): Array<[number, number]> | null {
    const colorNum = color === 'black' ? 1 : 2;
    return Gomoku.checkWin(this.board, { x, y }, colorNum as 1 | 2, this.rules.winCondition);
  }

  // 引き分け判定（盤面が満杯か）
  isDraw(): boolean {
    return Gomoku.isDraw(this.board);
  }
}

// ルームクラス
export class Room {
  public readonly roomId: string;
  private board: Board;
  private turn: PlayerColor;
  private players: Map<PlayerColor, string>; // color -> sessionId
  private connections: Map<string, any>; // sessionId -> WebSocket
  private gameEnded: boolean;
  private winner: PlayerColor | null;
  private winLine: Array<[number, number]> | null;
  private queueTail: Promise<unknown>;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.board = new Board();
    this.turn = 'black';
    this.players = new Map();
    this.connections = new Map();
    this.gameEnded = false;
    this.winner = null;
    this.winLine = null;
    this.queueTail = Promise.resolve();
  }

  // プレイヤー参加
  join(sessionId: string, color: PlayerColor, connection: any): boolean {
    // 既に同じ色のプレイヤーがいる場合は置き換え
    if (this.players.has(color)) {
      const oldSessionId = this.players.get(color)!;
      const oldConn = this.connections.get(oldSessionId);
      this.connections.delete(oldSessionId);
      // 旧接続を明示的に切断（新しい接続を優先）
      try {
        if (oldConn && oldConn.socket && oldConn.socket.readyState === 1) {
          oldConn.socket.close(4001, 'superseded');
        }
      } catch {}
    }

    this.players.set(color, sessionId);
    this.connections.set(sessionId, connection);
    return true;
  }

  // プレイヤー切断
  disconnect(sessionId: string): void {
    this.connections.delete(sessionId);
    
    // プレイヤーを削除
    for (const [color, id] of this.players.entries()) {
      if (id === sessionId) {
        this.players.delete(color);
        break;
      }
    }
  }

  // 石を配置
  placeStone(sessionId: string, x: number, y: number): {
    success: boolean;
    move?: { x: number; y: number; color: PlayerColor; nextTurn: PlayerColor };
    end?: { result: GameResult; line?: Array<[number, number]> };
    error?: string;
  } {
    if (this.gameEnded) {
      return { success: false, error: 'Game has ended' };
    }

    // 手番のプレイヤーかチェック
    const currentPlayerColor = this.getCurrentPlayerColor();
    if (!currentPlayerColor || this.players.get(currentPlayerColor) !== sessionId) {
      return { success: false, error: 'Not your turn' };
    }

    // 有効な手かチェック
    if (!this.board.isValidMove(x, y)) {
      return { success: false, error: 'Invalid move' };
    }

    // 石を配置
    if (!this.board.placeStone(x, y, currentPlayerColor)) {
      return { success: false, error: 'Failed to place stone' };
    }

    // 勝敗判定
    const winLine = this.board.checkWin(x, y, currentPlayerColor);
    if (winLine) {
      this.gameEnded = true;
      this.winner = currentPlayerColor;
      this.winLine = winLine;
      return {
        success: true,
        end: {
          result: currentPlayerColor === 'black' ? 'black_win' : 'white_win',
          line: winLine,
        },
      };
    }

    // 引き分け判定（盤面が満杯）
    if (this.board.isDraw()) {
      this.gameEnded = true;
      this.winner = null;
      return {
        success: true,
        end: {
          result: 'draw',
        },
      };
    }

    // 手番交代
    this.turn = currentPlayerColor === 'black' ? 'white' : 'black';

    return {
      success: true,
      move: {
        x,
        y,
        color: currentPlayerColor,
        nextTurn: this.turn,
      },
    };
  }

  // 投了
  resign(sessionId: string): { result: GameResult } | null {
    if (this.gameEnded) {
      return null;
    }

    // 投了したプレイヤーの色を取得
    let resignerColor: PlayerColor | null = null;
    for (const [color, id] of this.players.entries()) {
      if (id === sessionId) {
        resignerColor = color;
        break;
      }
    }

    if (!resignerColor) {
      return null;
    }

    this.gameEnded = true;
    this.winner = resignerColor === 'black' ? 'white' : 'black';

    return {
      result: this.winner === 'black' ? 'black_win' : 'white_win',
    };
  }

  // 現在の手番プレイヤーの色
  getCurrentPlayerColor(): PlayerColor | null {
    return this.turn;
  }

  // プレイヤーの接続状態
  getPlayersStatus(): { blackConnected: boolean; whiteConnected: boolean } {
    return {
      blackConnected: this.players.has('black') && this.connections.has(this.players.get('black')!),
      whiteConnected: this.players.has('white') && this.connections.has(this.players.get('white')!),
    };
  }

  // ゲーム状態取得
  getState(): {
    board: number[][];
    turn: PlayerColor;
    players: { blackConnected: boolean; whiteConnected: boolean };
    gameEnded: boolean;
    winner: PlayerColor | null;
    winLine: Array<[number, number]> | null;
  } {
    return {
      board: this.board.getBoard(),
      turn: this.turn,
      players: this.getPlayersStatus(),
      gameEnded: this.gameEnded,
      winner: this.winner,
      winLine: this.winLine,
    };
  }

  // 現在の接続一覧（読み取り専用）
  getConnections(): Map<string, any> {
    return this.connections;
  }

  // ルーム内操作を直列化するキュー
  async enqueue<T>(fn: () => T | Promise<T>): Promise<T> {
    // 直前の処理が終わった後に実行
    let resolveNext: (value: unknown) => void;
    const next = new Promise((r) => (resolveNext = r));
    const prev = this.queueTail;
    this.queueTail = next;

    await prev.catch(() => {});
    try {
      const result = await fn();
      // 次の処理を解放
      // @ts-ignore - resolveNext is always set
      resolveNext(null);
      return result;
    } catch (e) {
      // @ts-ignore - resolveNext is always set
      resolveNext(null);
      throw e;
    }
  }

  // ルームが空かチェック
  isEmpty(): boolean {
    return this.players.size === 0;
  }

  // プレイヤー数
  getPlayerCount(): number {
    return this.players.size;
  }

  // 接続数
  getConnectionCount(): number {
    return this.connections.size;
  }

  // 新規ゲーム開始（盤面リセット）
  startNewGame(): void {
    this.board = new Board();
    this.turn = 'black';
    this.gameEnded = false;
    this.winner = null;
    this.winLine = null;
  }
}
