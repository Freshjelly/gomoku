"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
async function main() {
    try {
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        const ws = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(ws, roomId, joinToken);
        (0, common_1.logInfo)('Joined, sending 11 PLACE within 1s...');
        let rateLimitCount = 0;
        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'ERROR' && msg.code === 'RATE_LIMIT')
                    rateLimitCount++;
            }
            catch { }
        });
        // fire 11 place quickly
        for (let i = 0; i < 11; i++) {
            ws.send(JSON.stringify({ type: 'PLACE', x: i % 15, y: 0 }));
        }
        await new Promise((r) => setTimeout(r, 1200));
        if (rateLimitCount >= 1) {
            (0, common_1.logPass)('Rate limit triggered as expected (>=1 RATE_LIMIT)');
            process.exit(0);
        }
        else {
            throw new Error('No RATE_LIMIT errors observed');
        }
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-rate-limit.js.map