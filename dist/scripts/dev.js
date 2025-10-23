"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const open_1 = __importDefault(require("open"));
const picocolors_1 = __importDefault(require("picocolors"));
const undici_1 = require("undici");
const clipboard_1 = require("./clipboard");
const lan_ip_1 = require("./lan-ip");
const invite_1 = require("./invite");
const tunnel_1 = require("./tunnel");
const smoke_ws_1 = require("./smoke-ws");
class DevOrchestrator {
    options;
    processes = [];
    tunnelResult = null;
    port = 3000;
    lanIp = null;
    constructor(options) {
        this.options = options;
    }
    async start() {
        try {
            console.log(picocolors_1.default.bold(picocolors_1.default.blue('🚀 Starting Gomoku Online Development Environment')));
            console.log();
            // 1. 依存関係の確認・インストール
            await this.ensureDependencies();
            // 2. ポートの検出
            await this.detectPort();
            // 3. プロセスの起動
            await this.startProcesses();
            // 4. サーバーの起動待機
            await this.waitForServer();
            // 5. LAN IPの検出
            await this.detectLanIp();
            // 6. ルームの作成
            const roomData = await this.createRoom();
            // 7. 招待URLの表示
            this.printInviteUrls(roomData);
            // 8. Cloudflare Tunnelの起動（オプション）
            if (!this.options.skipTunnel) {
                await this.tryStartTunnel();
            }
            // 9. スモークテストの実行（オプション）
            if (!this.options.skipSmoke) {
                await this.runSmokeTest(roomData);
            }
            // 10. ブラウザの自動オープン（オプション）
            if (!this.options.skipBrowser) {
                await this.openBrowser(roomData);
            }
            // 11. シグナルハンドラーの設定
            this.setupSignalHandlers();
            console.log();
            console.log(picocolors_1.default.green('🎉 Development environment is ready!'));
            console.log(picocolors_1.default.gray('Press Ctrl+C to stop all processes.'));
        }
        catch (error) {
            console.error(picocolors_1.default.red('❌ Failed to start development environment:'), error);
            await this.cleanup();
            process.exit(1);
        }
    }
    async ensureDependencies() {
        console.log(picocolors_1.default.blue('📦 Checking dependencies...'));
        (0, clipboard_1.ensureDependencies)();
    }
    async detectPort() {
        console.log(picocolors_1.default.blue('🔍 Detecting available port...'));
        if (this.options.port) {
            this.port = this.options.port;
        }
        else {
            this.port = await (0, lan_ip_1.findAvailablePort)(3000);
        }
        console.log(picocolors_1.default.green(`✅ Using port ${this.port}`));
    }
    async startProcesses() {
        console.log(picocolors_1.default.blue('🔄 Starting processes...'));
        if (this.options.dev) {
            // 開発モード: Vite + Server を並列起動
            const webProcess = (0, child_process_1.spawn)('npm', ['run', 'web:dev'], {
                cwd: 'webapp',
                stdio: 'pipe',
                shell: true,
            });
            const serverProcess = (0, child_process_1.spawn)('npm', ['run', 'server:dev'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, PORT: this.port.toString() },
            });
            this.processes.push(webProcess, serverProcess);
            // プロセスの出力を表示
            webProcess.stdout?.on('data', (data) => {
                console.log(picocolors_1.default.cyan('[WEB]'), data.toString().trim());
            });
            serverProcess.stdout?.on('data', (data) => {
                console.log(picocolors_1.default.yellow('[API]'), data.toString().trim());
            });
            webProcess.stderr?.on('data', (data) => {
                console.log(picocolors_1.default.red('[WEB ERROR]'), data.toString().trim());
            });
            serverProcess.stderr?.on('data', (data) => {
                console.log(picocolors_1.default.red('[API ERROR]'), data.toString().trim());
            });
        }
        else {
            // 本番モード: ビルドしてからサーバー起動
            console.log(picocolors_1.default.blue('🔨 Building webapp...'));
            const buildProcess = (0, child_process_1.spawn)('npm', ['run', 'web:build'], {
                cwd: 'webapp',
                stdio: 'inherit',
                shell: true,
            });
            await new Promise((resolve, reject) => {
                buildProcess.on('exit', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error('Web build failed'));
                    }
                });
            });
            const serverProcess = (0, child_process_1.spawn)('npm', ['run', 'server:build'], {
                stdio: 'pipe',
                shell: true,
            });
            await new Promise((resolve, reject) => {
                serverProcess.on('exit', (code) => {
                    if (code === 0) {
                        resolve();
                    }
                    else {
                        reject(new Error('Server build failed'));
                    }
                });
            });
            const startProcess = (0, child_process_1.spawn)('node', ['dist/index.js'], {
                stdio: 'pipe',
                shell: true,
                env: { ...process.env, PORT: this.port.toString() },
            });
            this.processes.push(startProcess);
            startProcess.stdout?.on('data', (data) => {
                console.log(picocolors_1.default.yellow('[API]'), data.toString().trim());
            });
            startProcess.stderr?.on('data', (data) => {
                console.log(picocolors_1.default.red('[API ERROR]'), data.toString().trim());
            });
        }
    }
    async waitForServer() {
        console.log(picocolors_1.default.blue('⏳ Waiting for server to start...'));
        const maxAttempts = 60; // 60秒
        const baseUrl = `http://localhost:${this.port}`;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await (0, undici_1.fetch)(`${baseUrl}/health`);
                if (response.ok) {
                    console.log(picocolors_1.default.green(`✅ Server OK on ${baseUrl}`));
                    return;
                }
            }
            catch {
                // サーバーがまだ起動していない
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error('Server failed to start within 60 seconds');
    }
    async detectLanIp() {
        console.log(picocolors_1.default.blue('🌐 Detecting LAN IP...'));
        const lanIp = (0, lan_ip_1.getLanIp)();
        if (lanIp) {
            this.lanIp = lanIp.ip;
            console.log(picocolors_1.default.green(`🌐 LAN IP: ${this.lanIp}`));
        }
        else {
            console.log(picocolors_1.default.yellow('⚠️  No LAN IP detected, using localhost only'));
        }
    }
    async createRoom() {
        console.log(picocolors_1.default.blue('🎟 Creating room...'));
        const baseUrl = `http://localhost:${this.port}`;
        const roomData = await (0, invite_1.createRoom)(baseUrl);
        console.log(picocolors_1.default.green(`✅ Room created: ${roomData.roomId}`));
        return roomData;
    }
    printInviteUrls(roomData) {
        const urls = (0, invite_1.generateInviteUrls)(roomData.roomId, roomData.joinToken, this.port, this.lanIp || undefined, this.tunnelResult?.url);
        (0, invite_1.printInviteUrls)(urls);
    }
    async tryStartTunnel() {
        try {
            this.tunnelResult = await (0, tunnel_1.startCloudflareTunnel)(this.port);
            if (this.tunnelResult) {
                console.log(picocolors_1.default.green(`🌐 Tunnel: ${this.tunnelResult.url}`));
            }
        }
        catch (error) {
            console.log(picocolors_1.default.yellow('⚠️  Tunnel failed, continuing without...'));
        }
    }
    async runSmokeTest(roomData) {
        console.log(picocolors_1.default.blue('🧪 Running smoke test...'));
        try {
            const result = await (0, smoke_ws_1.runSmokeTest)({
                roomId: roomData.roomId,
                token: roomData.joinToken,
                wsUrl: `ws://localhost:${this.port}/ws`,
            });
            if (result.success) {
                console.log(picocolors_1.default.green('🧪 Smoke: PASS (JOIN/MOVE)'));
            }
            else {
                console.log(picocolors_1.default.red(`🧪 Smoke: FAIL - ${result.error}`));
            }
        }
        catch (error) {
            console.log(picocolors_1.default.red(`🧪 Smoke: ERROR - ${error}`));
        }
    }
    async openBrowser(roomData) {
        console.log(picocolors_1.default.blue('🚀 Opening browser...'));
        try {
            const homeUrl = `http://localhost:${this.port}/`;
            const joinUrl = `http://localhost:${this.port}/join/${roomData.roomId}?t=${roomData.joinToken}`;
            await Promise.all([(0, open_1.default)(homeUrl), (0, open_1.default)(joinUrl)]);
            console.log(picocolors_1.default.green('🚀 Opened your browser to Home and the Join URL.'));
        }
        catch (error) {
            console.log(picocolors_1.default.yellow('⚠️  Failed to open browser, URLs printed above'));
        }
    }
    setupSignalHandlers() {
        const cleanup = async () => {
            console.log(picocolors_1.default.yellow('\n🛑 Shutting down...'));
            await this.cleanup();
            process.exit(0);
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }
    async cleanup() {
        // プロセスを終了
        for (const process of this.processes) {
            (0, tunnel_1.killProcess)(process);
        }
        // トンネルを終了
        if (this.tunnelResult) {
            (0, tunnel_1.killProcess)(this.tunnelResult.process);
        }
    }
}
/**
 * CLI用のメイン関数
 */
async function main() {
    const args = process.argv.slice(2);
    const options = {
        dev: process.env.DEV === '1',
        skipSmoke: args.includes('--skip-smoke'),
        skipTunnel: args.includes('--skip-tunnel'),
        skipBrowser: args.includes('--skip-browser'),
    };
    // ポート指定
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
        options.port = parseInt(args[portIndex + 1], 10);
    }
    const orchestrator = new DevOrchestrator(options);
    await orchestrator.start();
}
// CLI実行時のみmainを呼び出す
if (require.main === module) {
    main().catch((error) => {
        console.error(picocolors_1.default.red('❌ Development orchestrator error:'), error);
        process.exit(1);
    });
}
//# sourceMappingURL=dev.js.map