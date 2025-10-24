import WebSocket from 'ws';
export interface CreateRoomResponse {
    roomId: string;
    joinToken: string;
    wsUrl: string;
}
export interface DiagResponse {
    status: string;
    port: number;
    host: string;
    websocketPath: string;
    tokenTtlMinutes: number;
    basePath: string;
    logLevel: string;
    roomsOnline: number;
    uptimeSeconds: number;
}
export declare const DEFAULT_BASE_HTTP: string;
export declare function logInfo(msg: string): void;
export declare function logStep(msg: string): void;
export declare function logPass(msg: string): void;
export declare function logFail(msg: string): void;
export declare function createRoom(base?: string): Promise<CreateRoomResponse>;
export declare function getDiag(base?: string): Promise<DiagResponse>;
export declare function connect(wsUrl: string, timeoutMs?: number): Promise<WebSocket>;
export declare function waitForMessage<T = any>(ws: WebSocket, predicate: (m: any) => boolean, timeoutMs?: number): Promise<T>;
export declare function send(ws: WebSocket, msg: any): Promise<void>;
export declare function join(ws: WebSocket, roomId: string, token: string): Promise<void>;
export declare function expectClose(ws: WebSocket, expected: {
    code?: number;
    reasonIncludes?: string;
}, timeoutMs?: number): Promise<void>;
export declare function wait(ms: number): Promise<void>;
export interface PlaceResult {
    moveCount: number;
    rateLimitCount: number;
    errors: Array<{
        code: string;
        message?: string;
    }>;
}
export declare function collectMessages(ws: WebSocket, out: {
    moves: any[];
    errors: any[];
}): () => WebSocket;
//# sourceMappingURL=common.d.ts.map