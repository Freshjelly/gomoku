import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { ClientMessage, ServerMessage } from '../types/websocket';

export function useGomokuWs() {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const lastJoinRef = useRef<{ roomId: string; token: string } | null>(null);

  const {
    setConnectionStatus,
    setLatency,
    setRoomId,
    setPlayerColor,
    setCurrentTurn,
    setBoard,
    setGameEnded,
    setWinner,
    setWinLine,
    setPlayers,
    soundEnabled,
  } = useGameStore();

  // Send message to WebSocket
  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(
    (roomId: string, token: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      // Build WS URL with relative scheme (http->ws / https->wss)
      const wsUrl = new URL('/ws', window.location.href);
      wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');

      setConnectionStatus('connecting');
      setError(null);
      lastJoinRef.current = { roomId, token };

      try {
        wsRef.current = new WebSocket(wsUrl.toString());

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;

          // Send JOIN message
          sendMessage({
            type: 'JOIN',
            roomId,
            token,
          });

          // Start ping interval
          pingIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              const startTime = Date.now();
              sendMessage({ type: 'PING' });

              // Store start time for latency calculation
              (wsRef.current as any).pingStartTime = startTime;
            }
          }, 30000);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            handleMessage(message);
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
            setError('メッセージの解析に失敗しました');
          }
        };

        wsRef.current.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setConnectionStatus('disconnected');

          // Clear ping interval
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }

          // Auto-reconnect if not a clean close
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            setConnectionStatus('reconnecting');
            reconnectAttempts.current++;

            // Backoff schedule: 0.5s, 1s, 2s, 5s, 10s (max 5 attempts)
            const schedule = [500, 1000, 2000, 5000, 10000];
            const delay = schedule[Math.min(reconnectAttempts.current - 1, schedule.length - 1)];
            reconnectTimeoutRef.current = setTimeout(() => {
              connect(roomId, token);
            }, delay);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('接続エラーが発生しました');
          setConnectionStatus('disconnected');
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        setError('WebSocket接続に失敗しました');
        setConnectionStatus('disconnected');
      }
    },
    [sendMessage, setConnectionStatus]
  );

  // Reconnect helpers for visibility/network changes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const info = lastJoinRef.current;
        if (info && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
          // Try immediate reconnect when visible again
          reconnectAttempts.current = 0;
          connect(info.roomId, info.token);
        }
      }
    };
    const handleOnline = () => {
      const info = lastJoinRef.current;
      if (navigator.onLine && info && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        reconnectAttempts.current = 0;
        connect(info.roomId, info.token);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility, { passive: true } as any);
    window.addEventListener('online', handleOnline, { passive: true } as any);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility as any);
      window.removeEventListener('online', handleOnline as any);
    };
  }, [connect]);

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'STATE':
          setRoomId(message.roomId || null);
          setPlayerColor(message.you);
          setCurrentTurn(message.turn);
          setBoard(message.board);
          setPlayers(message.players);
          setGameEnded(false);
          setWinner(null);
          setWinLine(null);
          break;

        case 'MOVE':
          setCurrentTurn(message.nextTurn);
          // Board will be updated by the game store
          break;

        case 'END':
          setGameEnded(true);
          setWinner(message.result === 'black_win' ? 'black' : 'white');
          setWinLine(message.line || null);

          // Play win sound if enabled
          if (soundEnabled && message.result !== 'opponent_left') {
            playSound('win');
          }
          break;

        case 'ERROR':
          setError(getErrorMessage(message.code));
          break;

        case 'PING':
          sendMessage({ type: 'PONG' });
          break;

        case 'PONG':
          // Calculate latency
          const pingStartTime = (wsRef.current as any)?.pingStartTime;
          if (pingStartTime) {
            const latency = Date.now() - pingStartTime;
            setLatency(latency);
          }
          break;
      }
    },
    [
      setRoomId,
      setPlayerColor,
      setCurrentTurn,
      setBoard,
      setPlayers,
      setGameEnded,
      setWinner,
      setWinLine,
      soundEnabled,
      sendMessage,
      setLatency,
    ]
  );

  // Place stone
  const placeStone = useCallback(
    (x: number, y: number) => {
      return sendMessage({
        type: 'PLACE',
        x,
        y,
      });
    },
    [sendMessage]
  );

  // Resign
  const resign = useCallback(() => {
    return sendMessage({ type: 'RESIGN' });
  }, [sendMessage]);

  // Start new game
  const startNewGame = useCallback(() => {
    return sendMessage({ type: 'NEW_GAME' });
  }, [sendMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [setConnectionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    placeStone,
    resign,
    startNewGame,
    sendMessage,
  };
}

// Error message mapping
function getErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    INVALID_TOKEN: '無効な招待トークンです',
    TOKEN_EXPIRED: '招待トークンの有効期限が切れています',
    ROOM_NOT_FOUND: 'ルームが見つかりません',
    ROOM_FULL: 'ルームが満員です',
    INVALID_MOVE: '無効な手です',
    NOT_YOUR_TURN: 'あなたの手番ではありません',
    GAME_ENDED: 'ゲームは終了しています',
    RATE_LIMIT: '操作が早すぎます',
    INVALID_MESSAGE: '無効なメッセージです',
  };

  return errorMessages[code] || '不明なエラーが発生しました';
}

// Sound utilities
function playSound(type: 'place' | 'win') {
  try {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const url = new URL(`sounds/${type}.mp3`, base.endsWith('/') ? base : `${base}/`).toString();
    const audio = new Audio(url);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore audio play errors
    });
  } catch {
    // Ignore audio errors
  }
}
