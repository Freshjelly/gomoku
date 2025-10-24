"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
async function main() {
    try {
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        const a = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(a, roomId, joinToken);
        const b = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(b, roomId, joinToken);
        // A places a stone
        a.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
        await (0, common_1.waitForMessage)(b, (m) => m.type === 'MOVE', 3000);
        // Disconnect A
        a.close(1000, 'test-disconnect');
        (0, common_1.logInfo)('Client A disconnected. Reconnecting...');
        // Reconnect A
        const a2 = await (0, common_1.connect)(wsUrl);
        a2.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
        const state = await (0, common_1.waitForMessage)(a2, (m) => m.type === 'STATE', 5000);
        if (!Array.isArray(state.board) || typeof state.turn !== 'string') {
            throw new Error('STATE missing board/turn');
        }
        (0, common_1.logPass)('Reconnection STATE restored');
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
//# sourceMappingURL=test-reconnect.js.map