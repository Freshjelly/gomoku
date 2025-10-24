"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
async function main() {
    try {
        const diag = await (0, common_1.getDiag)();
        if (diag.basePath !== '/app') {
            (0, common_1.logInfo)(`BASE_PATH=${diag.basePath} (server). Skipping. Start server with BASE_PATH=/app to run this test.`);
            process.exit(0);
        }
        if (diag.websocketPath !== '/app/ws') {
            throw new Error(`Unexpected websocketPath: ${diag.websocketPath}`);
        }
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        if (!wsUrl.includes('/app/ws'))
            throw new Error(`wsUrl not under /app/ws: ${wsUrl}`);
        const ws = await (0, common_1.connect)(wsUrl);
        await (0, common_1.join)(ws, roomId, joinToken);
        ws.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
        (0, common_1.logPass)('BASE_PATH test passed (JOIN+PLACE under /app)');
        ws.close();
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-basepath.js.map