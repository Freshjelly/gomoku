"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const static_1 = __importDefault(require("@fastify/static"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const types_1 = require("./types");
const token_1 = require("./token");
const room_1 = require("./room");
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) || 3000 : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
function normalizeBasePath(input) {
    let bp = (input || '/').trim();
    if (!bp.startsWith('/'))
        bp = `/${bp}`;
    // Ensure no trailing slash except root
    if (bp.length > 1 && bp.endsWith('/'))
        bp = bp.slice(0, -1);
    return bp;
}
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);
const WEBSOCKET_PATH = `${BASE_PATH === '/' ? '' : BASE_PATH}/ws`;
// ルーム管理
const rooms = new Map();
const roomTokens = new Map();
// レート制限管理
const rateLimits = new Map();
// Fastifyアプリケーション作成
const isDev = (process.env.NODE_ENV || 'development') !== 'production';
const loggerOptions = { level: LOG_LEVEL };
if (isDev) {
    // Pretty logs in development
    loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    };
}
const fastify = (0, fastify_1.default)({ logger: loggerOptions });
// WebSocket登録
fastify.register(websocket_1.default);
// 静的ファイル配信（BASE_PATH 配下に配信）
function resolveWebRoot() {
    // 実行形態の違いに耐える（ts-node: server/, compiled: dist/server/）
    const candidates = [
        path_1.default.join(__dirname, '../../webapp/dist'), // compiled dist/server -> dist/webapp/dist（1つ上の上）
        path_1.default.join(__dirname, '../webapp/dist'), // ts-node 実行時 server/../webapp/dist
        path_1.default.join(process.cwd(), 'webapp/dist'), // CWD 基準
    ];
    for (const p of candidates) {
        try {
            if (fs_1.default.existsSync(p))
                return p;
        }
        catch { }
    }
    // 最後の手段として CWD
    return path_1.default.join(process.cwd(), 'webapp/dist');
}
fastify.register(static_1.default, {
    root: resolveWebRoot(),
    prefix: BASE_PATH === '/' ? '/' : `${BASE_PATH}/`,
});
// ルーム作成API
fastify.post('/api/rooms', async (request, reply) => {
    const roomId = token_1.TokenManager.generateRoomId();
    const joinToken = token_1.TokenManager.generateJoinToken();
    const scheme = resolveForwardedProto(request.headers);
    const host = resolveForwardedHost(request.headers, `${HOST}:${PORT}`);
    const wsProtocol = scheme === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${host}${WEBSOCKET_PATH}`;
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
    fastify.log.info({ roomId }, 'Room created');
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
    tokenTtlMinutes: token_1.TokenManager.tokenTtlMinutes,
    basePath: BASE_PATH,
    logLevel: LOG_LEVEL,
    roomsOnline: rooms.size,
    now: new Date().toISOString(),
    allowedOrigins: getAllowedOrigins(),
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
    // For SPA routing under BASE_PATH only, serve index.html
    if (request.method === 'GET' &&
        (request.headers.accept || '').toString().includes('text/html') &&
        (BASE_PATH === '/' || request.url.startsWith(BASE_PATH))) {
        reply.sendFile('index.html');
        return;
    }
    reply.code(404).send({ error: 'Not Found' });
});
// WebSocket接続
fastify.register(async function (fastify) {
    const registerWsRoute = (path) => fastify.get(path, { websocket: true }, (connection, req) => {
        const sessionId = (0, crypto_1.randomUUID)();
        let currentRoom = null;
        let playerColor = null;
        let lastPong = Date.now();
        let pingInterval = null;
        let pongWatchdog = null;
        // Origin check (DEV relaxed / PROD whitelist or same-origin)
        if (!isOriginAllowed(req.headers)) {
            try {
                connection.socket.close(4403, 'Origin not allowed');
            }
            catch { }
            return;
        }
        fastify.log.info({ sessionId }, 'WS connected');
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
            if (connection.socket.readyState === 1) {
                connection.socket.send(JSON.stringify(message));
            }
        };
        // エラーメッセージ送信
        const sendError = (code, message) => {
            sendMessage({ type: 'ERROR', code, message });
        };
        // 接続時の処理
        connection.socket.on('message', async (message) => {
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
                        if (!tokenInfo) {
                            sendError(types_1.ErrorCode.INVALID_TOKEN);
                            return;
                        }
                        if (token !== tokenInfo.token) {
                            sendError(types_1.ErrorCode.INVALID_TOKEN);
                            return;
                        }
                        if (!token_1.TokenManager.isTokenValid(token, tokenInfo.createdAt)) {
                            sendError(types_1.ErrorCode.TOKEN_EXPIRED);
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
                        // ルームに参加（同色の既存接続は切断して置き換え）
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
                            roomId: room.roomId,
                        });
                        fastify.log.info({ sessionId, roomId, color }, 'JOIN accepted');
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
                        const result = await currentRoom.enqueue(() => currentRoom.placeStone(sessionId, x, y));
                        if (!result.success) {
                            sendError(types_1.ErrorCode.INVALID_MOVE, result.error);
                            return;
                        }
                        if (result.move) {
                            // 全プレイヤーにMOVE送信
                            const moveMessage = {
                                type: 'MOVE',
                                x: result.move.x,
                                y: result.move.y,
                                color: result.move.color,
                                nextTurn: result.move.nextTurn,
                            };
                            // 全接続に送信
                            for (const [, conn] of currentRoom.getConnections().entries()) {
                                if (conn && conn.socket && conn.socket.readyState === 1) {
                                    conn.socket.send(JSON.stringify(moveMessage));
                                }
                            }
                            fastify.log.info({ sessionId, roomId: currentRoom.roomId, x, y }, 'PLACE accepted');
                        }
                        if (result.end) {
                            // 全プレイヤーにEND送信
                            const endMessage = {
                                type: 'END',
                                result: result.end.result,
                                line: result.end.line,
                            };
                            for (const [, conn] of currentRoom.getConnections().entries()) {
                                if (conn && conn.socket && conn.socket.readyState === 1) {
                                    conn.socket.send(JSON.stringify(endMessage));
                                }
                            }
                            fastify.log.info({ sessionId, roomId: currentRoom.roomId }, 'END broadcast');
                        }
                        break;
                    }
                    case 'NEW_GAME': {
                        if (!currentRoom || !playerColor) {
                            sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Not in a room');
                            return;
                        }
                        // 新規ゲーム開始
                        await currentRoom.enqueue(() => currentRoom.startNewGame());
                        // 全プレイヤーに新しい盤面状態を送信
                        const state = currentRoom.getState();
                        const stateMessage = {
                            type: 'STATE',
                            board: state.board,
                            turn: state.turn,
                            you: playerColor,
                            players: state.players,
                            roomId: currentRoom.roomId,
                        };
                        for (const [sid, conn] of currentRoom.getConnections().entries()) {
                            if (conn && conn.socket && conn.socket.readyState === 1) {
                                // 各プレイヤーに自分の色情報を含めて送信
                                const color = currentRoom['players'].get('black') === sid ? 'black' : 'white';
                                const msg = { ...stateMessage, you: color };
                                conn.socket.send(JSON.stringify(msg));
                            }
                        }
                        fastify.log.info({ sessionId, roomId: currentRoom.roomId }, 'NEW_GAME started');
                        break;
                    }
                    case 'RESIGN': {
                        if (!currentRoom || !playerColor) {
                            sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Not in a room');
                            return;
                        }
                        const result = await currentRoom.enqueue(() => currentRoom.resign(sessionId));
                        if (result) {
                            // 全プレイヤーにEND送信
                            const endMessage = {
                                type: 'END',
                                result: result.result,
                            };
                            for (const [, conn] of currentRoom.getConnections().entries()) {
                                if (conn && conn.socket && conn.socket.readyState === 1) {
                                    conn.socket.send(JSON.stringify(endMessage));
                                }
                            }
                            fastify.log.info({ sessionId, roomId: currentRoom.roomId }, 'RESIGN');
                        }
                        break;
                    }
                    case 'PING': {
                        // Client ping -> reply pong
                        sendMessage({ type: 'PONG' });
                        break;
                    }
                    case 'PONG': {
                        // Update last pong for latency/heartbeat
                        lastPong = Date.now();
                        if (pongWatchdog) {
                            clearTimeout(pongWatchdog);
                            pongWatchdog = null;
                        }
                        break;
                    }
                    default:
                        sendError(types_1.ErrorCode.INVALID_MESSAGE);
                        fastify.log.warn({ sessionId }, 'Invalid message');
                }
            }
            catch (error) {
                sendError(types_1.ErrorCode.INVALID_MESSAGE, 'Invalid JSON');
                fastify.log.warn({ sessionId }, 'Invalid JSON');
            }
        });
        // 接続切断時の処理
        connection.socket.on('close', () => {
            if (pingInterval)
                clearInterval(pingInterval);
            if (pongWatchdog)
                clearTimeout(pongWatchdog);
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
                for (const [, conn] of currentRoom.getConnections().entries()) {
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
            fastify.log.info({ sessionId }, 'WS disconnected');
        });
        // PING送信（30秒間隔） + PONG監視（15秒でタイムアウト）
        pingInterval = setInterval(() => {
            if (connection.socket.readyState === 1) {
                lastPong = Date.now();
                sendMessage({ type: 'PING' });
                if (pongWatchdog)
                    clearTimeout(pongWatchdog);
                pongWatchdog = setTimeout(() => {
                    try {
                        connection.socket.close(4001, 'PONG timeout');
                    }
                    catch { }
                }, 15000);
            }
            else if (pingInterval) {
                clearInterval(pingInterval);
                pingInterval = null;
            }
        }, 30000);
    });
    // Register primary WS path and compatibility '/ws' if BASE_PATH != '/'
    registerWsRoute(WEBSOCKET_PATH);
    if (BASE_PATH !== '/') {
        registerWsRoute('/ws');
    }
});
function resolveForwardedProto(headers) {
    const proto = headers['x-forwarded-proto'];
    const pickString = (value) => {
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
        }
        catch {
            // ignore malformed JSON
        }
    }
    return 'http';
}
function resolveForwardedHost(headers, fallback) {
    const pickString = (value) => {
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
function isOriginAllowed(headers) {
    const env = process.env.NODE_ENV || 'development';
    if (env !== 'production')
        return true;
    const allowed = (process.env.ALLOWED_ORIGINS || process.env.ORIGIN_ALLOW || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const originRaw = headers['origin'];
    const origin = typeof originRaw === 'string' ? originRaw : Array.isArray(originRaw) ? originRaw[0] : '';
    if (!origin)
        return true; // non-browser clients
    try {
        const originUrl = new URL(origin);
        const scheme = resolveForwardedProto(headers);
        const host = resolveForwardedHost(headers, `${HOST}:${PORT}`);
        const selfUrl = new URL(`${scheme}://${host}`);
        if (originUrl.origin === selfUrl.origin)
            return true; // same-origin
    }
    catch {
        // malformed origin: reject unless explicitly allowed
    }
    if (allowed.length > 0) {
        return allowed.some((o) => {
            try {
                return new URL(o).origin === new URL(origin).origin;
            }
            catch {
                return false;
            }
        });
    }
    return false;
}
function getAllowedOrigins() {
    return (process.env.ALLOWED_ORIGINS || process.env.ORIGIN_ALLOW || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
// サーバー起動
const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`🚀 Gomoku server running on http://${HOST}:${PORT}`);
        console.log(`📁 Static files served at prefix ${BASE_PATH === '/' ? '/' : BASE_PATH + '/'}`);
        console.log(`🔌 WebSocket endpoints: ws://${HOST}:${PORT}${WEBSOCKET_PATH}${BASE_PATH !== '/' ? ' (and /ws for compatibility)' : ''}`);
    }
    catch (err) {
        if (err && err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${PORT} is already in use. Set PORT to a different value.`);
        }
        else if (err && err.code === 'EACCES') {
            console.error(`❌ Permission denied binding to ${HOST}:${PORT}. Try a different port or elevated privileges.`);
        }
        else {
            fastify.log.error(err);
        }
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map