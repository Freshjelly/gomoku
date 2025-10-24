"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BASE_HTTP = void 0;
exports.logInfo = logInfo;
exports.logStep = logStep;
exports.logPass = logPass;
exports.logFail = logFail;
exports.createRoom = createRoom;
exports.getDiag = getDiag;
exports.connect = connect;
exports.waitForMessage = waitForMessage;
exports.send = send;
exports.join = join;
exports.expectClose = expectClose;
exports.wait = wait;
exports.collectMessages = collectMessages;
const ws_1 = __importDefault(require("ws"));
const picocolors_1 = __importDefault(require("picocolors"));
const promises_1 = require("node:timers/promises");
const undici_1 = require("undici");
exports.DEFAULT_BASE_HTTP = process.env.BASE_HTTP || 'http://localhost:3000';
function logInfo(msg) {
    process.stdout.write(picocolors_1.default.gray(`• ${msg}\n`));
}
function logStep(msg) {
    process.stdout.write(picocolors_1.default.blue(`➤ ${msg}\n`));
}
function logPass(msg) {
    process.stdout.write(picocolors_1.default.green(`✔ ${msg}\n`));
}
function logFail(msg) {
    process.stdout.write(picocolors_1.default.red(`✘ ${msg}\n`));
}
async function createRoom(base = exports.DEFAULT_BASE_HTTP) {
    const res = await (0, undici_1.fetch)(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return (await res.json());
}
async function getDiag(base = exports.DEFAULT_BASE_HTTP) {
    const res = await (0, undici_1.fetch)(`${base}/diag`);
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    return (await res.json());
}
function connect(wsUrl, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const ws = new ws_1.default(wsUrl);
        const t = setTimeout(() => {
            ws.close();
            reject(new Error(`Timeout opening ${wsUrl}`));
        }, timeoutMs);
        ws.once('open', () => {
            clearTimeout(t);
            resolve(ws);
        });
        ws.once('error', (err) => {
            clearTimeout(t);
            reject(err);
        });
    });
}
function waitForMessage(ws, predicate, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
        const onMessage = (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (predicate(msg)) {
                    cleanup();
                    resolve(msg);
                }
            }
            catch (e) {
                // ignore
            }
        };
        const onError = (err) => {
            cleanup();
            reject(err);
        };
        const onTimeout = () => {
            cleanup();
            reject(new Error('Timeout waiting for message'));
        };
        const cleanup = () => {
            ws.off('message', onMessage);
            ws.off('error', onError);
            clearTimeout(timer);
        };
        ws.on('message', onMessage);
        ws.on('error', onError);
        const timer = setTimeout(onTimeout, timeoutMs);
    });
}
async function send(ws, msg) {
    await new Promise((resolve, reject) => {
        ws.send(JSON.stringify(msg), (err) => (err ? reject(err) : resolve()));
    });
}
async function join(ws, roomId, token) {
    await send(ws, { type: 'JOIN', roomId, token });
    await waitForMessage(ws, (m) => m.type === 'STATE');
}
async function expectClose(ws, expected, timeoutMs = 5000) {
    const { code, reasonIncludes } = expected;
    await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for close')), timeoutMs);
        ws.once('close', (c, r) => {
            clearTimeout(timer);
            const reasonStr = (typeof r === 'string' ? r : r.toString()).toString();
            if (code !== undefined && c !== code) {
                reject(new Error(`Unexpected close code: ${c}, reason=${reasonStr}`));
                return;
            }
            if (reasonIncludes && !reasonStr.includes(reasonIncludes)) {
                reject(new Error(`Unexpected close reason: ${reasonStr}`));
                return;
            }
            resolve();
        });
    });
}
async function wait(ms) {
    await (0, promises_1.setTimeout)(ms);
}
function collectMessages(ws, out) {
    const onMessage = (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'MOVE')
                out.moves.push(msg);
            if (msg.type === 'ERROR')
                out.errors.push(msg);
        }
        catch { }
    };
    ws.on('message', onMessage);
    return () => ws.off('message', onMessage);
}
//# sourceMappingURL=common.js.map