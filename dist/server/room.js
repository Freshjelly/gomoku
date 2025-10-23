"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = exports.Board = void 0;
// 盤面クラス
class Board {
    size = 15;
    board;
    constructor() {
        this.board = Array(this.size)
            .fill(null)
            .map(() => Array(this.size).fill(0));
    }
    // 石を配置
    placeStone(x, y, color) {
        if (!this.isValidMove(x, y)) {
            return false;
        }
        this.board[y][x] = color === 'black' ? 1 : 2;
        return true;
    }
    // 有効な手かチェック
    isValidMove(x, y) {
        return (x >= 0 &&
            x < this.size &&
            y >= 0 &&
            y < this.size &&
            this.board[y][x] === 0);
    }
    // 盤面取得
    getBoard() {
        return this.board.map(row => [...row]);
    }
    // 指定位置の石を取得
    getStone(x, y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
            return -1;
        }
        return this.board[y][x];
    }
    // 勝敗判定
    checkWin(x, y, color) {
        const stoneValue = color === 'black' ? 1 : 2;
        const directions = [
            [1, 0], // 横
            [0, 1], // 縦
            [1, 1], // 斜め（右下）
            [1, -1], // 斜め（右上）
        ];
        for (const [dx, dy] of directions) {
            const line = this.checkLine(x, y, dx, dy, stoneValue);
            if (line && line.length >= 5) {
                return line.slice(0, 5); // 5連を返す
            }
        }
        return null;
    }
    // 指定方向の連続石をチェック
    checkLine(startX, startY, dx, dy, stoneValue) {
        const line = [];
        // 指定方向に連続する石をチェック
        for (let i = -4; i <= 4; i++) {
            const x = startX + i * dx;
            const y = startY + i * dy;
            if (this.getStone(x, y) === stoneValue) {
                line.push([x, y]);
            }
            else {
                // 連続が途切れた場合、5連以上なら返す
                if (line.length >= 5) {
                    return line;
                }
                // 連続をリセット
                line.length = 0;
            }
        }
        // 最後まで連続していた場合
        return line.length >= 5 ? line : null;
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
    constructor(roomId) {
        this.roomId = roomId;
        this.board = new Board();
        this.turn = 'black';
        this.players = new Map();
        this.connections = new Map();
        this.gameEnded = false;
        this.winner = null;
        this.winLine = null;
    }
    // プレイヤー参加
    join(sessionId, color, connection) {
        // 既に同じ色のプレイヤーがいる場合は置き換え
        if (this.players.has(color)) {
            const oldSessionId = this.players.get(color);
            this.connections.delete(oldSessionId);
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
}
exports.Room = Room;
//# sourceMappingURL=room.js.map