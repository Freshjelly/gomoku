"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
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
    tunnel = null;
    tunnelState = 'skipped';
    port = 3000;
    lanIp = 'localhost';
    baseUrl = '';
    shuttingDown = false;
    constructor(options) {
        this.options = options;
    }
    async start() {
        try {
            console.log(picocolors_1.default.bold(picocolors_1.default.blue('🚀 Starting Gomoku Online environment')));
            console.log();
            loadEnvFile();
            await this.ensureDependencies();
            await this.resolvePort();
            await this.launchProcesses();
            await this.waitForServer();
            this.detectLanIp();
            const room = await this.createRoom();
            await this.setupTunnel();
            await this.presentInviteUrls(room);
            if (!this.options.skipBrowser) {
                await this.openBrowser(room);
            }
            else {
                console.log(picocolors_1.default.gray('🚀 Browser open skipped (--skip-browser)'));
            }
            if (!this.options.skipSmoke) {
                await this.runSmokeTest(room);
            }
            else {
                console.log(picocolors_1.default.gray('🧪 Smoke test skipped (--skip-smoke)'));
            }
            this.setupSignalHandlers();
            console.log();
            console.log(picocolors_1.default.green('🎉 Environment ready — press Ctrl+C to stop'));
        }
        catch (error) {
            console.error(picocolors_1.default.red('❌ Failed to orchestrate environment:'), error);
            await this.cleanup();
            process.exit(1);
        }
    }
    async ensureDependencies() {
        console.log(picocolors_1.default.blue('📦 Checking dependencies...'));
        (0, clipboard_1.ensureDependencies)();
    }
    async resolvePort() {
        const requestedPort = this.options.port ??
            (process.env.PORT ? parseInt(process.env.PORT, 10) : NaN) ??
            NaN;
        const basePort = Number.isFinite(requestedPort) ? requestedPort : 3000;
        const availablePort = await (0, lan_ip_1.findAvailablePort)(basePort, 20);
        if (availablePort !== basePort) {
            console.log(picocolors_1.default.yellow(`⚠️  Port ${basePort} is busy, using next available port ${availablePort}`));
        }
        else {
            console.log(picocolors_1.default.green(`✅ Using port ${availablePort}`));
        }
        this.port = availablePort;
        process.env.PORT = String(this.port);
        this.baseUrl = `http://localhost:${this.port}`;
    }
    async launchProcesses() {
        const script = this.options.dev ? 'start:pair' : 'start:prod';
        console.log(picocolors_1.default.blue(`🔄 Starting npm run ${script}...`));
        const child = (0, child_process_1.spawn)('npm', ['run', script], {
            stdio: 'pipe',
            shell: true,
            env: { ...process.env, PORT: String(this.port) },
        });
        this.processes.push(child);
        child.stdout?.on('data', (data) => {
            process.stdout.write(picocolors_1.default.gray(`[${script}] ${data.toString()}`));
        });
        child.stderr?.on('data', (data) => {
            process.stderr.write(picocolors_1.default.red(`[${script}] ${data.toString()}`));
        });
        child.once('exit', (code) => {
            if (this.shuttingDown) {
                return;
            }
            if (code === 0) {
                console.log(picocolors_1.default.gray(`🔁 npm run ${script} exited cleanly`));
            }
            else {
                console.error(picocolors_1.default.red(`❌ npm run ${script} exited with code ${code}`));
            }
        });
    }
    async waitForServer() {
        console.log(picocolors_1.default.blue('⏳ Waiting for HTTP /health...'));
        const maxAttempts = 60;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await (0, undici_1.fetch)(`${this.baseUrl}/health`);
                if (response.ok) {
                    console.log(picocolors_1.default.green(`✅ Server ready at ${this.baseUrl}`));
                    return;
                }
            }
            catch {
                // still booting
            }
            await sleep(1000);
        }
        throw new Error('Server did not pass /health within 60 seconds');
    }
    detectLanIp() {
        console.log(picocolors_1.default.blue('🌐 Detecting LAN IP...'));
        const detected = (0, lan_ip_1.getLanIp)();
        this.lanIp = detected;
        if (detected === 'localhost') {
            console.log(picocolors_1.default.yellow('⚠️  No private LAN IP found, using localhost only'));
        }
        else {
            console.log(picocolors_1.default.green(`🌐 LAN accessible via http://${detected}:${this.port}`));
        }
    }
    async createRoom() {
        console.log(picocolors_1.default.blue('🎟 Creating initial room...'));
        const room = await (0, invite_1.createRoom)(this.baseUrl);
        console.log(picocolors_1.default.green(`✅ Room ready (${room.roomId})`));
        return room;
    }
    async setupTunnel() {
        if (this.options.skipTunnel) {
            this.tunnelState = 'skipped';
            console.log(picocolors_1.default.gray('🌐 Tunnel skipped (--skip-tunnel)'));
            return;
        }
        if (!(0, tunnel_1.isCloudflaredInstalled)()) {
            this.tunnelState = 'not-installed';
            console.log(picocolors_1.default.yellow('🌐 Tunnel: (not installed)'));
            return;
        }
        try {
            this.tunnelState = 'starting';
            const result = await (0, tunnel_1.startCloudflareTunnel)(this.port, { silent: true });
            if (result?.url) {
                this.tunnel = result;
                this.tunnelState = 'ready';
                console.log(picocolors_1.default.green(`🌐 Tunnel URL: ${result.url}`));
            }
            else {
                this.tunnelState = 'failed';
                console.log(picocolors_1.default.yellow('⚠️  Tunnel did not provide a public URL (timed out)'));
            }
        }
        catch (error) {
            this.tunnelState = 'failed';
            console.log(picocolors_1.default.red(`❌ Failed to start tunnel: ${error}`));
        }
    }
    async presentInviteUrls(room) {
        const lanForInvite = this.lanIp === 'localhost' ? undefined : this.lanIp;
        const tunnelUrl = this.tunnel?.url;
        const invites = (0, invite_1.generateInviteUrls)(room.roomId, room.joinToken, this.port, lanForInvite, tunnelUrl);
        console.log();
        console.log(picocolors_1.default.cyan('🎟 Invite URLs'));
        console.log(picocolors_1.default.gray(`- Localhost: ${invites.localhost}`));
        if (invites.lan) {
            console.log(picocolors_1.default.gray(`- LAN: ${invites.lan}`));
        }
        else {
            console.log(picocolors_1.default.gray('- LAN: (unavailable)'));
        }
        if (tunnelUrl) {
            console.log(picocolors_1.default.gray(`- Tunnel: ${tunnelUrl}`));
        }
        else {
            const statusMessage = this.tunnelState === 'not-installed'
                ? '(not installed)'
                : this.tunnelState === 'skipped'
                    ? '(skipped)'
                    : '(pending or failed)';
            console.log(picocolors_1.default.gray(`- Tunnel: ${statusMessage}`));
        }
        console.log();
        await this.copyInvite(invites.localhost, 'Localhost invite link');
        if (invites.lan) {
            await this.copyInvite(invites.lan, 'LAN invite link');
        }
        else {
            console.log(picocolors_1.default.gray('📋 Skipped LAN clipboard copy (unavailable)'));
        }
        if (tunnelUrl) {
            await this.copyInvite(tunnelUrl, 'Tunnel invite link');
        }
        else if (this.tunnelState === 'not-installed') {
            console.log(picocolors_1.default.gray('📋 Skipped Tunnel clipboard copy (not installed)'));
        }
        else if (this.tunnelState === 'skipped') {
            console.log(picocolors_1.default.gray('📋 Skipped Tunnel clipboard copy (--skip-tunnel)'));
        }
        else {
            console.log(picocolors_1.default.gray('📋 Skipped Tunnel clipboard copy (URL unavailable)'));
        }
    }
    async copyInvite(url, label) {
        await (0, invite_1.copyInviteUrl)(url, label);
    }
    async openBrowser(room) {
        console.log(picocolors_1.default.blue('🚀 Opening browser tabs...'));
        const homeUrl = new URL('/', this.baseUrl).toString();
        const joinUrl = new URL(`/join/${room.roomId}?t=${room.joinToken}`, this.baseUrl).toString();
        try {
            await Promise.all([
                (0, open_1.default)(homeUrl, { wait: false }),
                (0, open_1.default)(joinUrl, { wait: false }),
            ]);
            console.log(picocolors_1.default.green('🚀 Browser opened for Home and Join URLs'));
        }
        catch (error) {
            console.log(picocolors_1.default.yellow(`⚠️  Failed to open browser automatically: ${error}`));
            console.log(picocolors_1.default.gray(`Home: ${homeUrl}`));
            console.log(picocolors_1.default.gray(`Join: ${joinUrl}`));
        }
    }
    async runSmokeTest(room) {
        console.log(picocolors_1.default.blue('🧪 Running smoke test (JOIN → PLACE → MOVE)...'));
        const wsUrl = new URL('/ws', this.baseUrl);
        wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');
        try {
            const result = await (0, smoke_ws_1.runSmokeTest)({
                roomId: room.roomId,
                token: room.joinToken,
                wsUrl: wsUrl.toString(),
                timeout: 10000,
            });
            if (result.success) {
                console.log(picocolors_1.default.green('🧪 Smoke test PASS'));
            }
            else {
                console.log(picocolors_1.default.red(`🧪 Smoke test FAIL: ${result.error}`));
                result.steps.forEach((step) => console.log(picocolors_1.default.gray(`  • ${step}`)));
            }
        }
        catch (error) {
            console.log(picocolors_1.default.red(`🧪 Smoke test error: ${error}`));
        }
    }
    setupSignalHandlers() {
        const shutdown = async () => {
            if (this.shuttingDown)
                return;
            this.shuttingDown = true;
            console.log(picocolors_1.default.yellow('\n🛑 Shutting down...'));
            await this.cleanup();
            process.exit(0);
        };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    }
    async cleanup() {
        for (const child of this.processes) {
            (0, tunnel_1.killProcess)(child);
        }
        this.processes = [];
        if (this.tunnel) {
            this.tunnel.stop();
            this.tunnel = null;
        }
    }
}
function loadEnvFile(filePath = '.env') {
    const absPath = (0, path_1.resolve)(process.cwd(), filePath);
    if (!(0, fs_1.existsSync)(absPath)) {
        return;
    }
    const content = (0, fs_1.readFileSync)(absPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
        if (!match)
            continue;
        const [, key, rawValue] = match;
        const value = unquote(rawValue);
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
function unquote(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }
    return trimmed;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function main() {
    const args = process.argv.slice(2);
    const options = {
        dev: process.env.DEV === '1',
        skipSmoke: args.includes('--skip-smoke'),
        skipTunnel: args.includes('--skip-tunnel'),
        skipBrowser: args.includes('--skip-browser'),
    };
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
        options.port = parseInt(args[portIndex + 1], 10);
    }
    const orchestrator = new DevOrchestrator(options);
    await orchestrator.start();
}
if (require.main === module) {
    main().catch((error) => {
        console.error(picocolors_1.default.red('❌ Development orchestrator error:'), error);
        process.exit(1);
    });
}
//# sourceMappingURL=dev.js.map