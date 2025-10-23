"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCloudflareTunnel = startCloudflareTunnel;
exports.killProcess = killProcess;
const child_process_1 = require("child_process");
const picocolors_1 = __importDefault(require("picocolors"));
/**
 * Cloudflare Tunnelを起動する
 */
async function startCloudflareTunnel(port) {
    try {
        // cloudflaredが利用可能かチェック
        await checkCloudflaredAvailable();
        console.log(picocolors_1.default.blue('🌐 Starting Cloudflare Tunnel...'));
        const process = (0, child_process_1.spawn)('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return new Promise((resolve, reject) => {
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    process.kill();
                    resolve(null);
                }
            }, 10000); // 10秒でタイムアウト
            let output = '';
            process.stdout?.on('data', (data) => {
                output += data.toString();
                // URLを抽出
                const urlMatch = output.match(/https?:\/\/[a-z0-9.-]+\.trycloudflare\.com/);
                if (urlMatch && !resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve({
                        url: urlMatch[0],
                        process,
                    });
                }
            });
            process.stderr?.on('data', (data) => {
                const error = data.toString();
                if (error.includes('error') && !resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    process.kill();
                    resolve(null);
                }
            });
            process.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    reject(error);
                }
            });
            process.on('exit', (code) => {
                if (!resolved && code !== 0) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(null);
                }
            });
        });
    }
    catch (error) {
        console.log(picocolors_1.default.yellow('⚠️  Cloudflare Tunnel not available, skipping...'));
        return null;
    }
}
/**
 * cloudflaredが利用可能かチェック
 */
async function checkCloudflaredAvailable() {
    return new Promise((resolve, reject) => {
        const process = (0, child_process_1.spawn)('cloudflared', ['--version'], { stdio: 'ignore' });
        process.on('error', () => {
            reject(new Error('cloudflared not found'));
        });
        process.on('exit', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error('cloudflared not available'));
            }
        });
    });
}
/**
 * プロセスを安全に終了する
 */
function killProcess(childProcess) {
    if (childProcess && !childProcess.killed) {
        if (process.platform === 'win32') {
            (0, child_process_1.spawn)('taskkill', ['/pid', childProcess.pid.toString(), '/f', '/t'], { stdio: 'ignore' });
        }
        else {
            childProcess.kill('SIGTERM');
        }
    }
}
//# sourceMappingURL=tunnel.js.map