export type PlayerColor = 'black' | 'white';
export type GameResult = 'black_win' | 'white_win' | 'draw' | 'resign' | 'opponent_left';
export interface JoinMessage {
    type: 'JOIN';
    roomId: string;
    token: string;
}
export interface PlaceMessage {
    type: 'PLACE';
    x: number;
    y: number;
}
export interface ResignMessage {
    type: 'RESIGN';
}
export interface NewGameMessage {
    type: 'NEW_GAME';
}
export type ClientMessage = JoinMessage | PlaceMessage | ResignMessage | NewGameMessage | PingMessage | PongMessage;
export interface StateMessage {
    type: 'STATE';
    board: number[][];
    turn: PlayerColor;
    you: PlayerColor;
    players: {
        blackConnected: boolean;
        whiteConnected: boolean;
    };
    roomId?: string;
}
export interface MoveMessage {
    type: 'MOVE';
    x: number;
    y: number;
    color: PlayerColor;
    nextTurn: PlayerColor;
}
export interface EndMessage {
    type: 'END';
    result: GameResult;
    line?: Array<[number, number]>;
}
export interface ErrorMessage {
    type: 'ERROR';
    code: string;
    message?: string;
}
export interface PingMessage {
    type: 'PING';
}
export interface PongMessage {
    type: 'PONG';
}
export type ServerMessage = StateMessage | MoveMessage | EndMessage | ErrorMessage | PingMessage | PongMessage;
export interface CreateRoomResponse {
    roomId: string;
    joinToken: string;
    wsUrl: string;
}
export declare enum ErrorCode {
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
    ROOM_FULL = "ROOM_FULL",
    INVALID_MOVE = "INVALID_MOVE",
    NOT_YOUR_TURN = "NOT_YOUR_TURN",
    GAME_ENDED = "GAME_ENDED",
    RATE_LIMIT = "RATE_LIMIT",
    INVALID_MESSAGE = "INVALID_MESSAGE"
}
//# sourceMappingURL=types.d.ts.map