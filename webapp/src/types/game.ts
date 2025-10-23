// WebSocketメッセージ型定義
export type PlayerColor = 'black' | 'white';
export type GameResult = 'black_win' | 'white_win' | 'resign' | 'opponent_left';

// Client -> Server メッセージ
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

export type ClientMessage = JoinMessage | PlaceMessage | ResignMessage;

// Server -> Client メッセージ
export interface StateMessage {
  type: 'STATE';
  board: number[][];
  turn: PlayerColor;
  you: PlayerColor;
  players: {
    blackConnected: boolean;
    whiteConnected: boolean;
  };
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

export type ServerMessage =
  | StateMessage
  | MoveMessage
  | EndMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// ルーム作成APIレスポンス
export interface CreateRoomResponse {
  roomId: string;
  joinToken: string;
  wsUrl: string;
}

// エラーコード
export enum ErrorCode {
  INVALID_TOKEN = 'INVALID_TOKEN',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  INVALID_MOVE = 'INVALID_MOVE',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  GAME_ENDED = 'GAME_ENDED',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
}

// ゲーム状態
export interface GameState {
  // 接続状態
  isConnected: boolean;
  isReconnecting: boolean;
  latency: number;
  
  // ルーム情報
  roomId: string | null;
  joinToken: string | null;
  
  // プレイヤー情報
  you: PlayerColor | null;
  currentTurn: PlayerColor | null;
  
  // 盤面
  board: number[][];
  
  // ゲーム状態
  gameEnded: boolean;
  winner: PlayerColor | null;
  winLine: Array<[number, number]> | null;
  
  // プレイヤー接続状態
  players: {
    blackConnected: boolean;
    whiteConnected: boolean;
  };
  
  // UI状態
  showResultModal: boolean;
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  
  // 設定
  soundEnabled: boolean;
}

// アクション型
export type GameAction =
  | { type: 'CONNECT'; payload: { roomId: string; joinToken: string } }
  | { type: 'DISCONNECT' }
  | { type: 'SET_CONNECTION_STATE'; payload: { isConnected: boolean; isReconnecting: boolean } }
  | { type: 'SET_LATENCY'; payload: number }
  | { type: 'SET_GAME_STATE'; payload: Partial<GameState> }
  | { type: 'PLACE_STONE'; payload: { x: number; y: number } }
  | { type: 'RESIGN' }
  | { type: 'SHOW_TOAST'; payload: { message: string; type: 'success' | 'error' | 'info' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'SHOW_RESULT_MODAL' }
  | { type: 'HIDE_RESULT_MODAL' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RESET_GAME' };
