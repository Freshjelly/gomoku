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
        // A places
        a.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
        await (0, common_1.waitForMessage)(b, (m) => m.type === 'MOVE', 3000);
        // Close A and simulate backoff reconnection
        a.close(1000, 'simulate-sleep');
        const backoff = [500, 1000, 2000, 5000, 10000];
        let a2 = null;
        for (let i = 0; i < backoff.length; i++) {
            await new Promise((r) => setTimeout(r, backoff[i]));
            try {
                a2 = await (0, common_1.connect)(wsUrl);
                a2.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
                const state = await (0, common_1.waitForMessage)(a2, (m) => m.type === 'STATE', 5000);
                if (Array.isArray(state.board))
                    break;
            }
            catch {
                a2?.close();
            }
        }
        if (!a2)
            throw new Error('Failed to reconnect within backoff schedule');
        (0, common_1.logPass)('Reconnect with backoff succeeded');
        a2.close();
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
//# sourceMappingURL=test-reconnect-mobile.js.map