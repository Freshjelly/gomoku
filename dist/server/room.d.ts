import { PlayerColor, GameResult } from './types';
import { GameRules } from './engine/rules';
export declare class Board {
    private readonly size;
    private board;
    private readonly rules;
    constructor(rules?: GameRules);
    placeStone(x: number, y: number, color: PlayerColor): boolean;
    isValidMove(x: number, y: number): boolean;
    getBoard(): number[][];
    getStone(x: number, y: number): number;
    checkWin(x: number, y: number, color: PlayerColor): Array<[number, number]> | null;
    isDraw(): boolean;
}
export declare class Room {
    readonly roomId: string;
    private board;
    private turn;
    private players;
    private connections;
    private gameEnded;
    private winner;
    private winLine;
    private queueTail;
    constructor(roomId: string);
    join(sessionId: string, color: PlayerColor, connection: any): boolean;
    disconnect(sessionId: string): void;
    placeStone(sessionId: string, x: number, y: number): {
        success: boolean;
        move?: {
            x: number;
            y: number;
            color: PlayerColor;
            nextTurn: PlayerColor;
        };
        end?: {
            result: GameResult;
            line?: Array<[number, number]>;
        };
        error?: string;
    };
    resign(sessionId: string): {
        result: GameResult;
    } | null;
    getCurrentPlayerColor(): PlayerColor | null;
    getPlayersStatus(): {
        blackConnected: boolean;
        whiteConnected: boolean;
    };
    getState(): {
        board: number[][];
        turn: PlayerColor;
        players: {
            blackConnected: boolean;
            whiteConnected: boolean;
        };
        gameEnded: boolean;
        winner: PlayerColor | null;
        winLine: Array<[number, number]> | null;
    };
    getConnections(): Map<string, any>;
    enqueue<T>(fn: () => T | Promise<T>): Promise<T>;
    isEmpty(): boolean;
    getPlayerCount(): number;
    getConnectionCount(): number;
    startNewGame(): void;
}
//# sourceMappingURL=room.d.ts.map