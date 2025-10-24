"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCloudflareTunnel = startCloudflareTunnel;
exports.isCloudflaredInstalled = isCloudflaredInstalled;
exports.killProcess = killProcess;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const picocolors_1 = __importDefault(require("picocolors"));
const TUNNEL_URL_REGEX = /https?:\/\/[a-z0-9.-]+\.trycloudflare\.com/;
/**
 * Cloudflare Tunnelを起動し、公開URLを取得する
 */
async function startCloudflareTunnel(port, options = {}) {
    const binary = findExecutableOnPath('cloudflared');
    if (!binary) {
        if (!options.silent) {
            console.log(picocolors_1.default.yellow('🌐 Tunnel: (not installed)'));
        }
        return null;
    }
    if (!options.silent) {
        const proto = options.protocol ? ` (${options.protocol})` : '';
        console.log(picocolors_1.default.blue(`🌐 Starting Cloudflare Tunnel${proto}...`));
    }
    const target = options.targetUrl ?? `http://127.0.0.1:${port}`;
    const args = ['tunnel'];
    if (options.protocol) {
        args.push('--protocol', options.protocol);
    }
    args.push('--url', target);
    const child = (0, child_process_1.spawn)(binary, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, UNBUFFERED: '1' },
    });
    const timeoutMs = options.timeoutMs ?? 15000;
    return new Promise((resolve, reject) => {
        let resolved = false;
        let buffer = '';
        const handleSignal = (signal) => {
            if (!options.silent) {
                console.log(picocolors_1.default.gray(`🔌 Received ${signal}, shutting down tunnel...`));
            }
            killProcess(child);
        };
        const cleanup = () => {
            process.off('SIGINT', handleSignal);
            process.off('SIGTERM', handleSignal);
        };
        process.on('SIGINT', handleSignal);
        process.on('SIGTERM', handleSignal);
        const timer = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                killProcess(child);
                if (!options.silent) {
                    console.log(picocolors_1.default.yellow('⚠️  Tunnel URL fetch timed out, continuing without tunnel'));
                }
                resolve(null);
            }
        }, timeoutMs);
        child.stdout?.on('data', (data) => {
            if (resolved) {
                return;
            }
            const text = data.toString();
            buffer += text;
            // Check for URL in the new text immediately
            const immediateMatch = text.match(TUNNEL_URL_REGEX);
            const bufferMatch = buffer.match(TUNNEL_URL_REGEX);
            const match = immediateMatch || bufferMatch;
            if (match) {
                resolved = true;
                clearTimeout(timer);
                if (!options.silent) {
                    console.log(picocolors_1.default.green(`🌐 Tunnel URL: ${match[0]}`));
                }
                const stop = () => {
                    cleanup();
                    killProcess(child);
                };
                child.once('exit', cleanup);
                resolve({
                    url: match[0],
                    process: child,
                    stop,
                });
            }
            else if (!options.silent && text.trim().length > 0) {
                process.stdout.write(picocolors_1.default.gray(`[cloudflared] ${text}`));
            }
        });
        child.stderr?.on('data', (data) => {
            if (resolved) {
                return;
            }
            const text = data.toString();
            // Check stderr for URL as well
            const match = text.match(TUNNEL_URL_REGEX);
            if (match) {
                resolved = true;
                clearTimeout(timer);
                if (!options.silent) {
                    console.log(picocolors_1.default.green(`🌐 Tunnel URL: ${match[0]}`));
                }
                const stop = () => {
                    cleanup();
                    killProcess(child);
                };
                child.once('exit', cleanup);
                resolve({
                    url: match[0],
                    process: child,
                    stop,
                });
            }
            else if (!options.silent) {
                process.stdout.write(picocolors_1.default.gray(`[cloudflared] ${text}`));
            }
        });
        child.once('error', (error) => {
            if (resolved) {
                return;
            }
            resolved = true;
            clearTimeout(timer);
            cleanup();
            reject(error);
        });
        child.once('exit', (code) => {
            if (resolved) {
                return;
            }
            resolved = true;
            clearTimeout(timer);
            cleanup();
            if (code === 0) {
                resolve(null);
            }
            else {
                reject(new Error(`cloudflared exited with code ${code}`));
            }
        });
    });
}
function findExecutableOnPath(executable) {
    const pathEnv = process.env.PATH ?? '';
    const separator = process.platform === 'win32' ? ';' : ':';
    const exts = process.platform === 'win32'
        ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
            .split(';')
            .filter(Boolean)
            .map((ext) => ext.toLowerCase())
        : [''];
    for (const rawDir of pathEnv.split(separator)) {
        if (!rawDir)
            continue;
        const dir = rawDir.trim();
        for (const ext of exts) {
            const candidate = process.platform === 'win32' && (0, path_1.extname)(executable).toLowerCase() === ext
                ? (0, path_1.join)(dir, executable)
                : (0, path_1.join)(dir, process.platform === 'win32' ? `${executable}${ext}` : executable);
            if ((0, fs_1.existsSync)(candidate)) {
                return candidate;
            }
        }
    }
    return null;
}
function isCloudflaredInstalled() {
    return findExecutableOnPath('cloudflared') !== null;
}
/**
 * プロセスを安全に終了する
 */
function killProcess(childProcess) {
    if (!childProcess || childProcess.killed) {
        return;
    }
    if (process.platform === 'win32') {
        (0, child_process_1.spawn)('taskkill', ['/pid', `${childProcess.pid}`, '/f', '/t'], { stdio: 'ignore' });
    }
    else {
        childProcess.kill('SIGTERM');
    }
}
async function main() {
    const args = process.argv.slice(2);
    let port = 3000;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port' && args[i + 1]) {
            port = parseInt(args[i + 1], 10);
            i++;
        }
    }
    try {
        const tunnel = await startCloudflareTunnel(port, { silent: false });
        if (tunnel) {
            console.log(tunnel.url);
        }
        else {
            process.exit(0);
        }
    }
    catch (error) {
        console.error(picocolors_1.default.red(`❌ Failed to start cloudflared: ${error}`));
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=tunnel.js.map