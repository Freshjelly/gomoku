"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
const crypto_1 = require("crypto");
// トークン管理
class TokenManager {
    static TOKEN_LENGTH = 32;
    static TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10分
    static ROOM_ID_LENGTH = 8;
    static ROOM_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    // 8桁英数ランダムルームID生成
    static generateRoomId() {
        let result = '';
        for (let i = 0; i < this.ROOM_ID_LENGTH; i++) {
            result += this.ROOM_ID_CHARS.charAt(Math.floor(Math.random() * this.ROOM_ID_CHARS.length));
        }
        return result;
    }
    // 32バイトランダム招待トークン生成
    static generateJoinToken() {
        return (0, crypto_1.randomBytes)(this.TOKEN_LENGTH).toString('hex');
    }
    // トークン有効期限チェック
    static isTokenValid(token, createdAt) {
        const now = Date.now();
        return now - createdAt < this.TOKEN_EXPIRY_MS;
    }
    // トークン検証
    static validateToken(token, expectedToken, createdAt) {
        return token === expectedToken && this.isTokenValid(token, createdAt);
    }
}
exports.TokenManager = TokenManager;
//# sourceMappingURL=token.js.map