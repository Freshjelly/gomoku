// WebSocket message types
export type PlayerColor = 'black' | 'white';
export type GameResult = 'black_win' | 'white_win' | 'resign' | 'opponent_left';

// Client -> Server messages
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

export interface PingMessage {
  type: 'PING';
}

export interface PongMessage {
  type: 'PONG';
}

export type ClientMessage = JoinMessage | PlaceMessage | ResignMessage | NewGameMessage | PingMessage | PongMessage;

// Server -> Client messages
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

export type ServerMessage =
  | StateMessage
  | MoveMessage
  | EndMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// API response types
export interface CreateRoomResponse {
  roomId: string;
  joinToken: string;
  wsUrl: string;
}
