export declare class TokenManager {
    private static readonly TOKEN_LENGTH;
    private static readonly TOKEN_EXPIRY_MS;
    private static readonly ROOM_ID_LENGTH;
    private static readonly ROOM_ID_CHARS;
    static generateRoomId(): string;
    static generateJoinToken(): string;
    static isTokenValid(token: string, createdAt: number): boolean;
    static validateToken(token: string, expectedToken: string, createdAt: number): boolean;
}
export interface TokenInfo {
    token: string;
    createdAt: number;
    used: boolean;
}
export interface RoomInfo {
    roomId: string;
    tokenInfo: TokenInfo;
    createdAt: number;
}
//# sourceMappingURL=token.d.ts.map