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
        (0, common_1.logInfo)('Simultaneous PLACE at same coordinates (0,0)');
        await Promise.all([(0, common_1.send)(a, { type: 'PLACE', x: 0, y: 0 }), (0, common_1.send)(b, { type: 'PLACE', x: 0, y: 0 })]);
        // Expect exactly 1 MOVE and one ERROR (INVALID_MOVE or NOT_YOUR_TURN)
        let moveCount = 0;
        let errorCount = 0;
        const collect = (raw) => {
            try {
                const m = JSON.parse(raw.toString());
                if (m.type === 'MOVE')
                    moveCount++;
                if (m.type === 'ERROR' && (m.code === 'INVALID_MOVE' || m.code === 'NOT_YOUR_TURN'))
                    errorCount++;
            }
            catch { }
        };
        a.on('message', collect);
        b.on('message', collect);
        await new Promise((r) => setTimeout(r, 500));
        if (moveCount < 1 || errorCount < 1)
            throw new Error(`Expected move>=1 and error>=1, got move=${moveCount} error=${errorCount}`);
        (0, common_1.logInfo)('Simultaneous PLACE at different coordinates (1,0) and (0,1)');
        moveCount = 0;
        errorCount = 0;
        await Promise.all([(0, common_1.send)(a, { type: 'PLACE', x: 1, y: 0 }), (0, common_1.send)(b, { type: 'PLACE', x: 0, y: 1 })]);
        await new Promise((r) => setTimeout(r, 500));
        // Expect at least one error of NOT_YOUR_TURN to ensure serialization
        if (errorCount < 1)
            throw new Error('Expected at least one NOT_YOUR_TURN/INVALID_MOVE error');
        a.close();
        b.close();
        (0, common_1.logPass)('Ordering/serialization test passed');
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-ordering.js.map