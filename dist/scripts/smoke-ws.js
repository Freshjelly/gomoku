"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSmokeTest = runSmokeTest;
const ws_1 = __importDefault(require("ws"));
const picocolors_1 = __importDefault(require("picocolors"));
const undici_1 = require("undici");
/**
 * WebSocket接続のスモークテストを実行
 */
async function runSmokeTest(options) {
    const { roomId, token, wsUrl, timeout = 10000 } = options;
    const steps = [];
    return new Promise((resolve) => {
        let ws = null;
        let testTimeout = null;
        let stateReceived = false;
        let moveReceived = false;
        const cleanup = () => {
            if (testTimeout)
                clearTimeout(testTimeout);
            if (ws)
                ws.close();
        };
        const fail = (error) => {
            cleanup();
            resolve({
                success: false,
                error,
                steps,
            });
        };
        const succeed = () => {
            cleanup();
            resolve({
                success: true,
                steps,
            });
        };
        try {
            steps.push('Connecting to WebSocket...');
            ws = new ws_1.default(wsUrl);
            testTimeout = setTimeout(() => {
                fail('Test timeout (10s)');
            }, timeout);
            ws.on('open', () => {
                steps.push('WebSocket connected');
                // JOIN メッセージを送信
                const joinMessage = {
                    type: 'JOIN',
                    roomId,
                    token,
                };
                steps.push('Sending JOIN message...');
                ws.send(JSON.stringify(joinMessage));
            });
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    switch (message.type) {
                        case 'STATE':
                            if (!stateReceived) {
                                steps.push('Received STATE message');
                                stateReceived = true;
                                // 少し待ってからPLACEメッセージを送信
                                setTimeout(() => {
                                    const placeMessage = {
                                        type: 'PLACE',
                                        x: 0,
                                        y: 0,
                                    };
                                    steps.push('Sending PLACE(0,0) message...');
                                    ws.send(JSON.stringify(placeMessage));
                                }, 500);
                            }
                            break;
                        case 'MOVE':
                            if (!moveReceived) {
                                steps.push('Received MOVE message');
                                moveReceived = true;
                                succeed();
                            }
                            break;
                        case 'ERROR':
                            fail(`Server error: ${message.code} - ${message.message || 'Unknown error'}`);
                            break;
                        case 'PING':
                            // PONGを返す
                            ws.send(JSON.stringify({ type: 'PONG' }));
                            break;
                    }
                }
                catch (error) {
                    fail(`Failed to parse message: ${error}`);
                }
            });
            ws.on('error', (error) => {
                const msg = error?.message || String(error);
                fail(`WebSocket error: ${msg}`);
            });
            ws.on('close', (code, reason) => {
                if (!stateReceived || !moveReceived) {
                    const r = typeof reason === 'string' ? reason : reason.toString();
                    fail(`WebSocket closed unexpectedly: code=${code} reason=${r}`);
                }
            });
        }
        catch (error) {
            fail(`Test setup error: ${error}`);
        }
    });
}
/**
 * CLI用のスモークテスト実行
 */
async function main() {
    const args = process.argv.slice(2);
    let roomId = '';
    let token = '';
    let wsUrl = 'ws://localhost:3000/ws';
    let baseUrl = '';
    // コマンドライン引数をパース
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--room':
                roomId = args[i + 1];
                i++;
                break;
            case '--token':
                token = args[i + 1];
                i++;
                break;
            case '--ws':
                wsUrl = args[i + 1];
                i++;
                break;
            case '--base':
                baseUrl = args[i + 1];
                i++;
                break;
        }
    }
    // 自動部屋作成（room/token未指定時）
    if (!roomId || !token) {
        try {
            if (!baseUrl) {
                // derive base from ws URL
                const w = new URL(wsUrl);
                const httpProto = w.protocol.replace('ws', 'http');
                baseUrl = `${httpProto}//${w.host}`;
            }
            const res = await (0, undici_1.fetch)(`${baseUrl}/api/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                console.error(picocolors_1.default.red(`❌ Failed to create room: HTTP ${res.status} ${res.statusText} ${body.slice(0, 120)}`));
                process.exit(1);
            }
            const data = (await res.json());
            roomId = data.roomId;
            token = data.joinToken;
            console.log(picocolors_1.default.gray(`Auto-created room ${roomId}.`));
        }
        catch (e) {
            console.error(picocolors_1.default.red(`❌ Room creation error: ${e?.message || e}`));
            process.exit(1);
        }
    }
    console.log(picocolors_1.default.blue('🧪 Running smoke test...'));
    console.log(picocolors_1.default.gray(`Room: ${roomId}`));
    console.log(picocolors_1.default.gray(`WS URL: ${wsUrl}`));
    const result = await runSmokeTest({ roomId, token, wsUrl });
    if (result.success) {
        console.log(picocolors_1.default.green('✅ Smoke test PASSED'));
        console.log(picocolors_1.default.gray('Steps:'));
        result.steps.forEach((step) => {
            console.log(picocolors_1.default.gray(`  ${step}`));
        });
        process.exit(0);
    }
    else {
        console.log(picocolors_1.default.red('❌ Smoke test FAILED'));
        console.log(picocolors_1.default.red(`Error: ${result.error}`));
        console.log(picocolors_1.default.gray('Steps completed:'));
        result.steps.forEach((step) => {
            console.log(picocolors_1.default.gray(`  ${step}`));
        });
        process.exit(1);
    }
}
// CLI実行時のみmainを呼び出す
if (require.main === module) {
    main().catch((error) => {
        console.error(picocolors_1.default.red('❌ Smoke test error:'), error);
        process.exit(1);
    });
}
//# sourceMappingURL=smoke-ws.js.map