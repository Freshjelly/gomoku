interface CreateRoomResponse {
    roomId: string;
    joinToken: string;
    wsUrl: string;
}
/**
 * サーバーに新しいルームを作成する
 */
export declare function createRoom(baseUrl?: string): Promise<CreateRoomResponse>;
/**
 * 招待URLを生成する
 */
export declare function generateInviteUrls(roomId: string, token: string, port: number, lanIp?: string, tunnelUrl?: string): {
    localhost: string;
    lan: string | null;
    tunnel: string | null;
};
/**
 * 招待URLを表示する
 */
export declare function printInviteUrls(urls: ReturnType<typeof generateInviteUrls>): void;
/**
 * クリップボードに招待URLをコピーする
 */
export declare function copyInviteUrl(url: string, label?: string): Promise<boolean>;
export {};
//# sourceMappingURL=invite.d.ts.map