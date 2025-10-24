"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const common_1 = require("./common");
async function main() {
    try {
        const assetsDir = (0, path_1.join)(process.cwd(), 'webapp', 'dist', 'assets');
        const files = await fs_1.promises.readdir(assetsDir);
        const jsFiles = files.filter((f) => f.endsWith('.js'));
        if (jsFiles.length === 0)
            throw new Error('No built assets found. Run npm run web:build');
        let foundReplace = false;
        for (const f of jsFiles) {
            const content = await fs_1.promises.readFile((0, path_1.join)(assetsDir, f), 'utf8');
            if (content.includes(".protocol.replace('http', 'ws')") || content.includes('.protocol.replace("http","ws")')) {
                foundReplace = true;
                break;
            }
        }
        if (!foundReplace)
            throw new Error('Did not find scheme replacement logic in built assets');
        (0, common_1.logPass)('Static scheme check passed (http->ws / https->wss replacement detected)');
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-scheme-staticcheck.js.map