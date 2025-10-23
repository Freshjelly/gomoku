import { randomBytes } from 'crypto';

// トークン管理
export class TokenManager {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10分
  private static readonly ROOM_ID_LENGTH = 8;
  private static readonly ROOM_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  // 8桁英数ランダムルームID生成
  static generateRoomId(): string {
    let result = '';
    for (let i = 0; i < this.ROOM_ID_LENGTH; i++) {
      result += this.ROOM_ID_CHARS.charAt(
        Math.floor(Math.random() * this.ROOM_ID_CHARS.length)
      );
    }
    return result;
  }

  // 32バイトランダム招待トークン生成
  static generateJoinToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  // トークン有効期限チェック
  static isTokenValid(token: string, createdAt: number): boolean {
    const now = Date.now();
    return now - createdAt < this.TOKEN_EXPIRY_MS;
  }

  // トークン検証
  static validateToken(token: string, expectedToken: string, createdAt: number): boolean {
    return token === expectedToken && this.isTokenValid(token, createdAt);
  }
}

// トークン情報
export interface TokenInfo {
  token: string;
  createdAt: number;
  used: boolean;
}

// ルーム情報
export interface RoomInfo {
  roomId: string;
  tokenInfo: TokenInfo;
  createdAt: number;
}
