"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanIp = getLanIp;
exports.findAvailablePort = findAvailablePort;
const os_1 = require("os");
const zod_1 = require("zod");
const LanIpSchema = zod_1.z.object({
    ip: zod_1.z.string(),
    family: zod_1.z.enum(['IPv4', 'IPv6']),
    interface: zod_1.z.string(),
});
/**
 * LAN IPアドレスを検出する
 * 優先順位: 10.x.x.x > 172.16-31.x.x > 192.168.x.x > その他のプライベートIP
 */
function getLanIp() {
    const interfaces = (0, os_1.networkInterfaces)();
    const candidates = [];
    for (const [interfaceName, addresses] of Object.entries(interfaces)) {
        if (!addresses)
            continue;
        for (const address of addresses) {
            if (address.internal || address.family !== 'IPv4')
                continue;
            const ip = address.address;
            const parts = ip.split('.').map(Number);
            // プライベートIP範囲をチェック
            if (parts[0] === 10 || // 10.0.0.0/8
                (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
                (parts[0] === 192 && parts[1] === 168) // 192.168.0.0/16
            ) {
                candidates.push({
                    ip,
                    family: 'IPv4',
                    interface: interfaceName,
                });
            }
        }
    }
    if (candidates.length === 0)
        return null;
    // 優先順位でソート
    candidates.sort((a, b) => {
        const aParts = a.ip.split('.').map(Number);
        const bParts = b.ip.split('.').map(Number);
        // 10.x.x.x が最優先
        if (aParts[0] === 10 && bParts[0] !== 10)
            return -1;
        if (bParts[0] === 10 && aParts[0] !== 10)
            return 1;
        // 172.16-31.x.x が次
        if (aParts[0] === 172 && bParts[0] !== 172)
            return -1;
        if (bParts[0] === 172 && aParts[0] !== 172)
            return 1;
        // 192.168.x.x が最後
        if (aParts[0] === 192 && bParts[0] !== 192)
            return -1;
        if (bParts[0] === 192 && aParts[0] !== 192)
            return 1;
        return 0;
    });
    return candidates[0];
}
/**
 * 利用可能なポートを検出する
 */
async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
    const { createServer } = await Promise.resolve().then(() => __importStar(require('net')));
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        try {
            await new Promise((resolve, reject) => {
                const server = createServer();
                server.listen(port, () => {
                    server.close(() => resolve());
                });
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE') {
                        reject(new Error(`Port ${port} is in use`));
                    }
                    else {
                        reject(err);
                    }
                });
            });
            return port;
        }
        catch {
            // ポートが使用中、次のポートを試す
            continue;
        }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}
//# sourceMappingURL=lan-ip.js.map