"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const static_1 = __importDefault(require("@fastify/static"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const types_1 = require("./types");
const token_1 = require("./token");
const room_1 = require("./room");
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
// ルーム管理
const rooms = new Map();
const roomTokens = new Map();
// レート制限管理
const rateLimits = new Map();
// Fastifyアプリケーション作成
const fastify = (0, fastify_1.default)({
    logger: {
        level: 'info',
    },
});
// WebSocket登録
fastify.register(websocket_1.default);
// 静的ファイル配信
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, '../webapp/dist'),
    prefix: '/',
});
// ルーム作成API
fastify.post('/api/rooms', async (request, reply) => {
    const roomId = token_1.TokenManager.generateRoomId();
    const joinToken = token_1.TokenManager.generateJoinToken();
    const wsUrl = `ws://${request.headers.host}/ws`;
    // ルーム作成
    const room = new room_1.Room(roomId);
    rooms.set(roomId, room);
    // トークン情報保存
    const tokenInfo = {
        token: joinToken,
        createdAt: Date.now(),
        used: false,
    };
    roomTokens.set(roomId, tokenInfo);
    const response = {
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
// SPA fallback - 全ての未定義のGETリクエストにindex.htmlを返す
fastify.setNotFoundHandler((request, reply) => {
    // API routes should return 404 JSON
    if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not Found' });
        return;
    }
    // WebSocket routes should not fallback
    if (request.url.startsWith('/ws')) {
        reply.code(404).send({ error: 'Not Found' });
        return;
    }
    // For all other routes, serve index.html for SPA routing
    reply.sendFile('index.html');
});
// WebSocket接続
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
        const sessionId = (0, crypto_1.randomUUID)();
        let currentRoom = null;
        let playerColor = null;
        // レート制限チェック
        const checkRateLimit = () => {
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
        const sendMessage = (message) => {
            connection.socket.send(JSON.stringify(message));
        };
        // エラーメッセージ送信
        const sendError = (code, message) => {
            sendMessage({ type: 'ERROR', code, message });
        };
        // 接続時の処理
        connection.socket.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                switch (data.type) {
                    case 'JOIN': {
                        if (!checkRateLimit()) {
                            sendError(types_1.ErrorCode.RATE_LIMIT);
                            return;
                        }
                        const { roomId, token } = data;
                        const room = rooms.get(roomId);
                        if (!room) {
                            sendError(types_1.ErrorCode.ROOM_NOT_FOUND);
                            return;
                        }
                        const tokenInfo = roomTokens.get(roomId);
                        if (!tokenInfo ||
                            !token_1.TokenManager.validateToken(token, tokenInfo.token, tokenInfo.createdAt)) {
                            sendError(types_1.ErrorCode.INVALID_TOKEN);
                            return;
                        }
                        // プレイヤー色決定
                        const playersStatus = room.getPlayersStatus();
                        let color;
                        if (!playersStatus.blackConnected && !playersStatus.whiteConnected) {
                            color = 'black'; // 最初のプレイヤーは黒
                        }
                        else if (!playersStatus.blackConnected) {
                            color = 'black';
                        }
                        else if (!playersStatus.whiteConnected) {
                            color = 'white';
                        }
                        else {
                            sendError(types_1.ErrorCode.ROOM_FULL);
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
                            sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Not in a room');
                            return;
                        }
                        if (!checkRateLimit()) {
                            sendError(types_1.ErrorCode.RATE_LIMIT);
                            return;
                        }
                        const { x, y } = data;
                        const result = currentRoom.placeStone(sessionId, x, y);
                        if (!result.success) {
                            sendError(types_1.ErrorCode.INVALID_MOVE, result.error);
                            return;
                        }
                        if (result.move) {
                            // 全プレイヤーにMOVE送信
                            const state = currentRoom.getState();
                            const moveMessage = {
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
                            const endMessage = {
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
                            sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Not in a room');
                            return;
                        }
                        const result = currentRoom.resign(sessionId);
                        if (result) {
                            // 全プレイヤーにEND送信
                            const endMessage = {
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
                        sendError(types_1.ErrorCode.INVALID_MESSAGE);
                }
            }
            catch (error) {
                sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Invalid JSON');
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
                const endMessage = {
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
            }
            else {
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
            }
            catch {
                // 無視
            }
        });
    });
});
// サーバー起動
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`🚀 Gomoku server running on http://${HOST}:${PORT}`);
        console.log(`📁 Static files served from /web directory`);
        console.log(`🔌 WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map