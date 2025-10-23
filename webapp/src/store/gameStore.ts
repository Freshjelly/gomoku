import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PlayerColor = 'black' | 'white';
export type GameResult = 'black_win' | 'white_win' | 'resign' | 'opponent_left';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface GameState {
  // Connection state
  connectionStatus: ConnectionStatus;
  latency: number;

  // Game state
  roomId: string | null;
  playerColor: PlayerColor | null;
  currentTurn: PlayerColor | null;
  board: number[][];
  gameEnded: boolean;
  winner: PlayerColor | null;
  winLine: Array<[number, number]> | null;

  // Player states
  players: {
    blackConnected: boolean;
    whiteConnected: boolean;
  };

  // UI state
  isDarkMode: boolean;
  soundEnabled: boolean;
  showInviteModal: boolean;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setLatency: (latency: number) => void;
  setRoomId: (roomId: string | null) => void;
  setPlayerColor: (color: PlayerColor | null) => void;
  setCurrentTurn: (turn: PlayerColor | null) => void;
  setBoard: (board: number[][]) => void;
  setGameEnded: (ended: boolean) => void;
  setWinner: (winner: PlayerColor | null) => void;
  setWinLine: (line: Array<[number, number]> | null) => void;
  setPlayers: (players: { blackConnected: boolean; whiteConnected: boolean }) => void;
  toggleDarkMode: () => void;
  toggleSound: () => void;
  setShowInviteModal: (show: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    // Initial state
    connectionStatus: 'disconnected',
    latency: 0,
    roomId: null,
    playerColor: null,
    currentTurn: null,
    board: Array(15)
      .fill(null)
      .map(() => Array(15).fill(0)),
    gameEnded: false,
    winner: null,
    winLine: null,
    players: {
      blackConnected: false,
      whiteConnected: false,
    },
    isDarkMode: false,
    soundEnabled: false,
    showInviteModal: false,

    // Actions
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setLatency: (latency) => set({ latency }),
    setRoomId: (roomId) => set({ roomId }),
    setPlayerColor: (color) => set({ playerColor: color }),
    setCurrentTurn: (turn) => set({ currentTurn: turn }),
    setBoard: (board) => set({ board }),
    setGameEnded: (ended) => set({ gameEnded: ended }),
    setWinner: (winner) => set({ winner }),
    setWinLine: (line) => set({ winLine: line }),
    setPlayers: (players) => set({ players }),
    toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    setShowInviteModal: (show) => set({ showInviteModal: show }),
    resetGame: () =>
      set({
        connectionStatus: 'disconnected',
        latency: 0,
        roomId: null,
        playerColor: null,
        currentTurn: null,
        board: Array(15)
          .fill(null)
          .map(() => Array(15).fill(0)),
        gameEnded: false,
        winner: null,
        winLine: null,
        players: {
          blackConnected: false,
          whiteConnected: false,
        },
        showInviteModal: false,
      }),
  }))
);
