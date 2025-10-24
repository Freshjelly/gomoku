"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
async function main() {
    try {
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        const a = await (0, common_1.connect)(wsUrl);
        const b = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(a, roomId, joinToken);
        await (0, common_1.join)(b, roomId, joinToken);
        // Rate limit: send >10 in 1s
        let rateLimit = 0;
        a.on('message', (raw) => {
            try {
                const m = JSON.parse(raw.toString());
                if (m.type === 'ERROR' && m.code === 'RATE_LIMIT')
                    rateLimit++;
            }
            catch { }
        });
        for (let i = 0; i < 12; i++)
            a.send(JSON.stringify({ type: 'PLACE', x: i % 15, y: 0 }));
        await new Promise((r) => setTimeout(r, 1200));
        if (rateLimit < 1)
            throw new Error('RATE_LIMIT not observed');
        // Ordering: simultaneous different coords
        await Promise.all([(0, common_1.send)(a, { type: 'PLACE', x: 0, y: 0 }), (0, common_1.send)(b, { type: 'PLACE', x: 0, y: 0 })]);
        await new Promise((r) => setTimeout(r, 500));
        (0, common_1.logPass)('Rate and ordering test passed');
        a.close();
        b.close();
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-rate-order.js.map