"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("./common");
async function main() {
    try {
        const file = (0, path_1.join)(process.cwd(), 'webapp', 'src', 'hooks', 'useGomokuWs.ts');
        const content = await fs_1.promises.readFile(file, 'utf8');
        if (!content.includes("new URL('/ws', window.location.href)")) {
            throw new Error('useGomokuWs.ts does not build WS URL via relative scheme');
        }
        if (!content.includes("protocol.replace('http', 'ws')")) {
            throw new Error('WS URL does not replace http->ws');
        }
        (0, common_1.logPass)('WS scheme construction is relative and safe');
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-ws-scheme.js.map