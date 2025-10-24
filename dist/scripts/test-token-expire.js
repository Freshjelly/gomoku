"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
async function main() {
    try {
        const diag = await (0, common_1.getDiag)();
        (0, common_1.logInfo)(`Server TTL=${diag.tokenTtlMinutes} minutes`);
        if (diag.tokenTtlMinutes > 1) {
            (0, common_1.logInfo)('TTL > 1min, skipping to avoid long wait. Set TOKEN_TTL_MIN=1 to enable.');
            process.exit(0);
        }
        const { roomId, joinToken, wsUrl } = await (0, common_1.createRoom)();
        (0, common_1.logInfo)(`Room=${roomId}`);
        (0, common_1.logInfo)(`WS=${wsUrl}`);
        // Wait TTL + buffer
        const waitMs = diag.tokenTtlMinutes * 60_000 + 2000;
        (0, common_1.logInfo)(`Waiting ${waitMs}ms for token to expire...`);
        await (0, common_1.wait)(waitMs);
        const ws = await (0, common_1.connect)(wsUrl);
        ws.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
        const err = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Timeout waiting ERROR')), 8000);
            ws.on('message', (raw) => {
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === 'ERROR') {
                        clearTimeout(timer);
                        resolve(msg);
                    }
                }
                catch { }
            });
        });
        if (err.code !== 'TOKEN_EXPIRED') {
            throw new Error(`Expected TOKEN_EXPIRED, got ${err.code}`);
        }
        (0, common_1.logPass)('Token expiry test passed');
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-token-expire.js.map