"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = exports.Board = void 0;
const Gomoku = __importStar(require("./engine/gomoku"));
const rules_1 = require("./engine/rules");
// 盤面クラス
class Board {
    size;
    board;
    rules;
    constructor(rules = rules_1.DEFAULT_RULES) {
        this.rules = rules;
        this.size = rules.boardSize;
        this.board = Gomoku.initBoard(this.size);
    }
    // 石を配置
    placeStone(x, y, color) {
        if (!this.isValidMove(x, y)) {
            return false;
        }
        const colorNum = color === 'black' ? 1 : 2;
        this.board = Gomoku.applyMove(this.board, { x, y }, colorNum);
        return true;
    }
    // 有効な手かチェック
    isValidMove(x, y) {
        return Gomoku.isValidMove(this.board, x, y);
    }
    // 盤面取得
    getBoard() {
        return this.board.map(row => [...row]);
    }
    // 指定位置の石を取得
    getStone(x, y) {
        return Gomoku.getStone(this.board, x, y);
    }
    // 勝敗判定（エンジンを使用）
    checkWin(x, y, color) {
        const colorNum = color === 'black' ? 1 : 2;
        return Gomoku.checkWin(this.board, { x, y }, colorNum, this.rules.winCondition);
    }
    // 引き分け判定（盤面が満杯か）
    isDraw() {
        return Gomoku.isDraw(this.board);
    }
}
exports.Board = Board;
// ルームクラス
class Room {
    roomId;
    board;
    turn;
    players; // color -> sessionId
    connections; // sessionId -> WebSocket
    gameEnded;
    winner;
    winLine;
    queueTail;
    constructor(roomId) {
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
    join(sessionId, color, connection) {
        // 既に同じ色のプレイヤーがいる場合は置き換え
        if (this.players.has(color)) {
            const oldSessionId = this.players.get(color);
            const oldConn = this.connections.get(oldSessionId);
            this.connections.delete(oldSessionId);
            // 旧接続を明示的に切断（新しい接続を優先）
            try {
                if (oldConn && oldConn.socket && oldConn.socket.readyState === 1) {
                    oldConn.socket.close(4001, 'superseded');
                }
            }
            catch { }
        }
        this.players.set(color, sessionId);
        this.connections.set(sessionId, connection);
        return true;
    }
    // プレイヤー切断
    disconnect(sessionId) {
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
    placeStone(sessionId, x, y) {
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
    resign(sessionId) {
        if (this.gameEnded) {
            return null;
        }
        // 投了したプレイヤーの色を取得
        let resignerColor = null;
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
    getCurrentPlayerColor() {
        return this.turn;
    }
    // プレイヤーの接続状態
    getPlayersStatus() {
        return {
            blackConnected: this.players.has('black') && this.connections.has(this.players.get('black')),
            whiteConnected: this.players.has('white') && this.connections.has(this.players.get('white')),
        };
    }
    // ゲーム状態取得
    getState() {
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
    getConnections() {
        return this.connections;
    }
    // ルーム内操作を直列化するキュー
    async enqueue(fn) {
        // 直前の処理が終わった後に実行
        let resolveNext;
        const next = new Promise((r) => (resolveNext = r));
        const prev = this.queueTail;
        this.queueTail = next;
        await prev.catch(() => { });
        try {
            const result = await fn();
            // 次の処理を解放
            // @ts-ignore - resolveNext is always set
            resolveNext(null);
            return result;
        }
        catch (e) {
            // @ts-ignore - resolveNext is always set
            resolveNext(null);
            throw e;
        }
    }
    // ルームが空かチェック
    isEmpty() {
        return this.players.size === 0;
    }
    // プレイヤー数
    getPlayerCount() {
        return this.players.size;
    }
    // 接続数
    getConnectionCount() {
        return this.connections.size;
    }
    // 新規ゲーム開始（盤面リセット）
    startNewGame() {
        this.board = new Board();
        this.turn = 'black';
        this.gameEnded = false;
        this.winner = null;
        this.winLine = null;
    }
}
exports.Room = Room;
//# sourceMappingURL=room.js.map