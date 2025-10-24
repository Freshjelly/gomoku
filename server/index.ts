import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { randomUUID } from 'crypto';
import { ClientMessage, ServerMessage, CreateRoomResponse, ErrorCode, PlayerColor } from './types';
import { TokenManager, TokenInfo } from './token';
import { Room } from './room';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) || 3000 : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const WEBSOCKET_PATH = '/ws';

// ルーム管理
const rooms = new Map<string, Room>();
const roomTokens = new Map<string, TokenInfo>();

// レート制限管理
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Fastifyアプリケーション作成
const fastify = Fastify({
  logger: {
    level: LOG_LEVEL,
  },
});

// WebSocket登録
fastify.register(websocket);

// 静的ファイル配信
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../webapp/dist'),
  prefix: '/',
});

// ルーム作成API
fastify.post('/api/rooms', async (request, reply) => {
  const roomId = TokenManager.generateRoomId();
  const joinToken = TokenManager.generateJoinToken();

  const scheme = resolveForwardedProto(request.headers);
  const host = resolveForwardedHost(request.headers, `${HOST}:${PORT}`);
  const wsProtocol = scheme === 'https' ? 'wss' : 'ws';
  const wsUrl = `${wsProtocol}://${host}${WEBSOCKET_PATH}`;

  // ルーム作成
  const room = new Room(roomId);
  rooms.set(roomId, room);

  // トークン情報保存
  const tokenInfo: TokenInfo = {
    token: joinToken,
    createdAt: Date.now(),
    used: false,
  };
  roomTokens.set(roomId, tokenInfo);

  const response: CreateRoomResponse = {
    roomId,
    joinToken,
    wsUrl,
  };

  reply.send(response);
});

// ヘルスチェック
fastify.get('/health', async (request, reply) => {
  reply.send('ok');
});

// 診断情報
fastify.get('/diag', async () => ({
  status: 'ok',
  port: PORT,
  host: HOST,
  websocketPath: WEBSOCKET_PATH,
  tokenTtlMinutes: TokenManager.tokenTtlMinutes,
  basePath: '/',
  logLevel: LOG_LEVEL,
  roomsOnline: rooms.size,
  uptimeSeconds: Math.round(process.uptime()),
}));

// SPA fallback - 全ての未定義のGETリクエストにindex.htmlを返す
fastify.setNotFoundHandler((request, reply) => {
  // API routes should return 404 JSON
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'Not Found' });
    return;
  }

  // WebSocket routes should not fallback
  if (request.url.startsWith(WEBSOCKET_PATH)) {
    reply.code(404).send({ error: 'Not Found' });
    return;
  }

  // For all other routes, serve index.html for SPA routing
  reply.sendFile('index.html');
});

// WebSocket接続
fastify.register(async function (fastify) {
  fastify.get(WEBSOCKET_PATH, { websocket: true }, (connection, req) => {
    const sessionId = randomUUID();
    let currentRoom: Room | null = null;
    let playerColor: PlayerColor | null = null;

    // レート制限チェック
    const checkRateLimit = (): boolean => {
      const now = Date.now();
      const limit = rateLimits.get(sessionId);

      if (!limit || now > limit.resetTime) {
        rateLimits.set(sessionId, { count: 1, resetTime: now + 1000 });
        return true;
      }

      if (limit.count >= 10) {
        return false;
      }

      limit.count++;
      return true;
    };

    // メッセージ送信
    const sendMessage = (message: ServerMessage) => {
      connection.socket.send(JSON.stringify(message));
    };

    // エラーメッセージ送信
    const sendError = (code: string, message?: string) => {
      sendMessage({ type: 'ERROR', code, message });
    };

    // 接続時の処理
    connection.socket.on('message', (message) => {
      try {
        const data: ClientMessage = JSON.parse(message.toString());

        switch (data.type) {
          case 'JOIN': {
            if (!checkRateLimit()) {
              sendError(ErrorCode.RATE_LIMIT);
              return;
            }

            const { roomId, token } = data;
            const room = rooms.get(roomId);

            if (!room) {
              sendError(ErrorCode.ROOM_NOT_FOUND);
              return;
            }

            const tokenInfo = roomTokens.get(roomId);
            if (
              !tokenInfo ||
              !TokenManager.validateToken(token, tokenInfo.token, tokenInfo.createdAt)
            ) {
              sendError(ErrorCode.INVALID_TOKEN);
              return;
            }

            // プレイヤー色決定
            const playersStatus = room.getPlayersStatus();
            let color: PlayerColor;

            if (!playersStatus.blackConnected && !playersStatus.whiteConnected) {
              color = 'black'; // 最初のプレイヤーは黒
            } else if (!playersStatus.blackConnected) {
              color = 'black';
            } else if (!playersStatus.whiteConnected) {
              color = 'white';
            } else {
              sendError(ErrorCode.ROOM_FULL);
              return;
            }

            // ルームに参加
            room.join(sessionId, color, connection);
            currentRoom = room;
            playerColor = color;

            // トークン使用済みマーク
            tokenInfo.used = true;

            // ゲーム状態送信
            const state = room.getState();
            sendMessage({
              type: 'STATE',
              board: state.board,
              turn: state.turn,
              you: color,
              players: state.players,
            });

            break;
          }

          case 'PLACE': {
            if (!currentRoom || !playerColor) {
              sendError(ErrorCode.INVALID_MESSAGE, 'Not in a room');
              return;
            }

            if (!checkRateLimit()) {
              sendError(ErrorCode.RATE_LIMIT);
              return;
            }

            const { x, y } = data;
            const result = currentRoom.placeStone(sessionId, x, y);

            if (!result.success) {
              sendError(ErrorCode.INVALID_MOVE, result.error);
              return;
            }

            if (result.move) {
              // 全プレイヤーにMOVE送信
              const state = currentRoom.getState();
              const moveMessage: ServerMessage = {
                type: 'MOVE',
                x: result.move.x,
                y: result.move.y,
                color: result.move.color,
                nextTurn: result.move.nextTurn,
              };

              // 全接続に送信
              for (const [id, conn] of currentRoom['connections'].entries()) {
                if (conn && conn.socket && conn.socket.readyState === 1) {
                  conn.socket.send(JSON.stringify(moveMessage));
                }
              }
            }

            if (result.end) {
              // 全プレイヤーにEND送信
              const endMessage: ServerMessage = {
                type: 'END',
                result: result.end.result,
                line: result.end.line,
              };

              for (const [id, conn] of currentRoom['connections'].entries()) {
                if (conn && conn.socket && conn.socket.readyState === 1) {
                  conn.socket.send(JSON.stringify(endMessage));
                }
              }
            }

            break;
          }

          case 'RESIGN': {
            if (!currentRoom || !playerColor) {
              sendError(ErrorCode.INVALID_MESSAGE, 'Not in a room');
              return;
            }

            const result = currentRoom.resign(sessionId);
            if (result) {
              // 全プレイヤーにEND送信
              const endMessage: ServerMessage = {
                type: 'END',
                result: result.result,
              };

              for (const [id, conn] of currentRoom['connections'].entries()) {
                if (conn && conn.socket && conn.socket.readyState === 1) {
                  conn.socket.send(JSON.stringify(endMessage));
                }
              }
            }

            break;
          }

          default:
            sendError(ErrorCode.INVALID_MESSAGE);
        }
      } catch (error) {
        sendError(ErrorCode.INVALID_MESSAGE, 'Invalid JSON');
      }
    });

    // 接続切断時の処理
    connection.socket.on('close', () => {
      if (currentRoom) {
        currentRoom.disconnect(sessionId);

        // 相手が切断された場合の処理
        const playersStatus = currentRoom.getPlayersStatus();
        if (playersStatus.blackConnected && playersStatus.whiteConnected) {
          // 両方接続中なら何もしない
          return;
        }

        // 相手に切断通知
        const endMessage: ServerMessage = {
          type: 'END',
          result: 'opponent_left',
        };

        for (const [id, conn] of currentRoom['connections'].entries()) {
          if (conn && conn.socket && conn.socket.readyState === 1) {
            conn.socket.send(JSON.stringify(endMessage));
          }
        }

        // ルームが空になったら削除
        if (currentRoom.isEmpty()) {
          rooms.delete(currentRoom.roomId);
          roomTokens.delete(currentRoom.roomId);
        }
      }

      // レート制限情報削除
      rateLimits.delete(sessionId);
    });

    // PING送信（30秒間隔）
    const pingInterval = setInterval(() => {
      if (connection.socket.readyState === 1) {
        sendMessage({ type: 'PING' });
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    // PONG受信時の処理
    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PONG') {
          // PONG受信時の特別な処理は不要
        }
      } catch {
        // 無視
      }
    });
  });
});

function resolveForwardedProto(headers: Record<string, unknown>): 'http' | 'https' {
  const proto = headers['x-forwarded-proto'];

  const pickString = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
      return value.split(',')[0].trim();
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  };

  const directProto = pickString(proto);
  if (directProto) {
    return directProto.toLowerCase() === 'https' ? 'https' : 'http';
  }

  const cfVisitor = headers['cf-visitor'];
  if (typeof cfVisitor === 'string') {
    try {
      const parsed = JSON.parse(cfVisitor);
      if (parsed && typeof parsed.scheme === 'string') {
        return parsed.scheme === 'https' ? 'https' : 'http';
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return 'http';
}

function resolveForwardedHost(headers: Record<string, unknown>, fallback: string): string {
  const pickString = (value: unknown): string | undefined => {
    if (typeof value === 'string') {
      return value.split(',')[0].trim();
    }
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  };

  const forwardedHost = pickString(headers['x-forwarded-host']);
  if (forwardedHost && forwardedHost.length > 0) {
    return forwardedHost;
  }

  const host = pickString(headers['host']);
  if (host && host.length > 0) {
    return host;
  }

  return fallback;
}

// サーバー起動
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Gomoku server running on http://${HOST}:${PORT}`);
    console.log(`📁 Static files served from /web directory`);
    console.log(`🔌 WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
