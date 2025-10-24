"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const undici_1 = require("undici");
const common_1 = require("./common");
async function measureRtt(ws, attempts = 3) {
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < attempts; i++) {
        const start = Date.now();
        ws.send(JSON.stringify({ type: 'PING' }));
        await (0, common_1.waitForMessage)(ws, (m) => m.type === 'PONG', 2000);
        const rtt = Date.now() - start;
        min = Math.min(min, rtt);
    }
    return min;
}
async function main() {
    try {
        // Health check
        const ok = await (0, undici_1.fetch)('http://localhost:3000/health');
        if (!ok.ok)
            throw new Error('/health failed');
        (0, common_1.logInfo)('/health 200 OK');
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        (0, common_1.logInfo)(`Room=${roomId}`);
        (0, common_1.logInfo)(`WS=${wsUrl}`);
        const a = await (0, common_1.connect)(wsUrl);
        const b = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(a, roomId, joinToken);
        await (0, common_1.join)(b, roomId, joinToken);
        // Minimal scenario: A places, B receives MOVE, then B resigns -> END
        await (0, common_1.send)(a, { type: 'PLACE', x: 0, y: 0 });
        await (0, common_1.waitForMessage)(b, (m) => m.type === 'MOVE', 5000);
        await (0, common_1.send)(b, { type: 'RESIGN' });
        await (0, common_1.waitForMessage)(a, (m) => m.type === 'END', 5000);
        const rttA = await measureRtt(a);
        (0, common_1.logInfo)(`Min RTT A=${rttA}ms`);
        const threshold = Number(process.argv.find((v) => v.startsWith('--rtt='))?.split('=')[1] || 200);
        if (rttA > threshold) {
            (0, common_1.logFail)(`RTT ${rttA}ms exceeds threshold ${threshold}ms`);
            process.exit(1);
        }
        a.close();
        b.close();
        (0, common_1.logPass)('Mobile-friendly minimal scenario passed');
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-mobile-friendly.js.map