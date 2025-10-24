"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const picocolors_1 = __importDefault(require("picocolors"));
const tunnel_1 = require("./tunnel");
const undici_1 = require("undici");
const common_1 = require("./common");
async function main() {
    try {
        if (!(0, tunnel_1.isCloudflaredInstalled)()) {
            console.log(picocolors_1.default.yellow('SKIP: cloudflared not installed.'));
            process.exit(0);
        }
        const port = parseInt(process.env.PORT || '3000', 10);
        const tunnel = await (0, tunnel_1.startCloudflareTunnel)(port, { silent: true, timeoutMs: 15000 });
        if (!tunnel) {
            console.log(picocolors_1.default.yellow('SKIP: failed to obtain tunnel URL.'));
            process.exit(0);
        }
        const base = tunnel.url;
        (0, common_1.logInfo)(`Tunnel=${base}`);
        const res = await (0, undici_1.fetch)(`${base}/health`);
        if (!res.ok)
            throw new Error(`Tunnel /health HTTP ${res.status}`);
        const { wsUrl, roomId, joinToken } = await (0, common_1.createRoom)(base);
        if (!wsUrl.startsWith('wss://'))
            throw new Error(`Expected wss:// wsUrl, got ${wsUrl}`);
        (0, common_1.logPass)('Tunnel reachable and wss URL emitted');
        // Do not perform WS connect here to keep the test lightweight
        tunnel.stop();
        process.exit(0);
    }
    catch (e) {
        (0, common_1.logFail)(e.stack || e.message);
        process.exit(1);
    }
}
if (require.main === module)
    main();
//# sourceMappingURL=test-tunnel.js.map