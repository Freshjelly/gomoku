import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import open from 'open';
import pc from 'picocolors';
import { fetch } from 'undici';

import { ensureDependencies } from './clipboard';
import { getLanIp, findAvailablePort } from './lan-ip';
import { createRoom, generateInviteUrls, copyInviteUrl } from './invite';
import {
  startCloudflareTunnel,
  killProcess,
  isCloudflaredInstalled,
  TunnelResult,
} from './tunnel';
import { runSmokeTest } from './smoke-ws';

interface DevOptions {
  dev: boolean;
  port?: number;
  skipSmoke?: boolean;
  skipTunnel?: boolean;
  skipBrowser?: boolean;
}

type TunnelState = 'not-installed' | 'skipped' | 'starting' | 'ready' | 'failed';

class DevOrchestrator {
  private processes: ChildProcess[] = [];
  private tunnel: TunnelResult | null = null;
  private tunnelState: TunnelState = 'skipped';
  private port = 3000;
  private lanIp = 'localhost';
  private baseUrl = '';
  private shuttingDown = false;

  constructor(private readonly options: DevOptions) {}

  async start(): Promise<void> {
    try {
      console.log(pc.bold(pc.blue('🚀 Starting Gomoku Online environment')));
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
      } else {
        console.log(pc.gray('🚀 Browser open skipped (--skip-browser)'));
      }

      if (!this.options.skipSmoke) {
        await this.runSmokeTest(room);
      } else {
        console.log(pc.gray('🧪 Smoke test skipped (--skip-smoke)'));
      }

      this.setupSignalHandlers();

      console.log();
      console.log(pc.green('🎉 Environment ready — press Ctrl+C to stop'));
    } catch (error) {
      console.error(pc.red('❌ Failed to orchestrate environment:'), error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async ensureDependencies(): Promise<void> {
    console.log(pc.blue('📦 Checking dependencies...'));
    ensureDependencies();
  }

  private async resolvePort(): Promise<void> {
    const requestedPort =
      this.options.port ??
      (process.env.PORT ? parseInt(process.env.PORT, 10) : NaN) ??
      NaN;

    const basePort = Number.isFinite(requestedPort) ? requestedPort : 3000;
    const availablePort = await findAvailablePort(basePort, 20);

    if (availablePort !== basePort) {
      console.log(
        pc.yellow(
          `⚠️  Port ${basePort} is busy, using next available port ${availablePort}`
        )
      );
    } else {
      console.log(pc.green(`✅ Using port ${availablePort}`));
    }

    this.port = availablePort;
    process.env.PORT = String(this.port);
    this.baseUrl = `http://localhost:${this.port}`;
  }

  private async launchProcesses(): Promise<void> {
    const script = this.options.dev ? 'start:pair' : 'start:prod';
    console.log(pc.blue(`🔄 Starting npm run ${script}...`));

    const child = spawn('npm', ['run', script], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PORT: String(this.port) },
    });

    this.processes.push(child);

    child.stdout?.on('data', (data: Buffer) => {
      process.stdout.write(pc.gray(`[${script}] ${data.toString()}`));
    });

    child.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(pc.red(`[${script}] ${data.toString()}`));
    });

    child.once('exit', (code) => {
      if (this.shuttingDown) {
        return;
      }
      if (code === 0) {
        console.log(pc.gray(`🔁 npm run ${script} exited cleanly`));
      } else {
        console.error(pc.red(`❌ npm run ${script} exited with code ${code}`));
      }
    });
  }

  private async waitForServer(): Promise<void> {
    console.log(pc.blue('⏳ Waiting for HTTP /health...'));

    const maxAttempts = 60;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) {
          console.log(pc.green(`✅ Server ready at ${this.baseUrl}`));
          return;
        }
      } catch {
        // still booting
      }

      await sleep(1000);
    }

    throw new Error('Server did not pass /health within 60 seconds');
  }

  private detectLanIp(): void {
    console.log(pc.blue('🌐 Detecting LAN IP...'));
    const detected = getLanIp();
    this.lanIp = detected;

    if (detected === 'localhost') {
      console.log(pc.yellow('⚠️  No private LAN IP found, using localhost only'));
    } else {
      console.log(pc.green(`🌐 LAN accessible via http://${detected}:${this.port}`));
    }
  }

  private async createRoom(): Promise<{ roomId: string; joinToken: string }> {
    console.log(pc.blue('🎟 Creating initial room...'));
    const room = await createRoom(this.baseUrl);
    console.log(pc.green(`✅ Room ready (${room.roomId})`));
    return room;
  }

  private async setupTunnel(): Promise<void> {
    if (this.options.skipTunnel) {
      this.tunnelState = 'skipped';
      console.log(pc.gray('🌐 Tunnel skipped (--skip-tunnel)'));
      return;
    }

    if (!isCloudflaredInstalled()) {
      this.tunnelState = 'not-installed';
      console.log(pc.yellow('🌐 Tunnel: (not installed)'));
      return;
    }

    try {
      this.tunnelState = 'starting';
      const result = await startCloudflareTunnel(this.port, { silent: true });
      if (result?.url) {
        this.tunnel = result;
        this.tunnelState = 'ready';
        console.log(pc.green(`🌐 Tunnel URL: ${result.url}`));
      } else {
        this.tunnelState = 'failed';
        console.log(pc.yellow('⚠️  Tunnel did not provide a public URL (timed out)'));
      }
    } catch (error) {
      this.tunnelState = 'failed';
      console.log(pc.red(`❌ Failed to start tunnel: ${error}`));
    }
  }

  private async presentInviteUrls(room: { roomId: string; joinToken: string }): Promise<void> {
    const lanForInvite = this.lanIp === 'localhost' ? undefined : this.lanIp;
    const tunnelUrl = this.tunnel?.url;
    const invites = generateInviteUrls(
      room.roomId,
      room.joinToken,
      this.port,
      lanForInvite,
      tunnelUrl
    );

    console.log();
    console.log(pc.cyan('🎟 Invite URLs'));
    console.log(pc.gray(`- Localhost: ${invites.localhost}`));

    if (invites.lan) {
      console.log(pc.gray(`- LAN: ${invites.lan}`));
    } else {
      console.log(pc.gray('- LAN: (unavailable)'));
    }

    if (tunnelUrl) {
      console.log(pc.gray(`- Tunnel: ${tunnelUrl}`));
    } else {
      const statusMessage =
        this.tunnelState === 'not-installed'
          ? '(not installed)'
          : this.tunnelState === 'skipped'
          ? '(skipped)'
          : '(pending or failed)';
      console.log(pc.gray(`- Tunnel: ${statusMessage}`));
    }

    console.log();
    await this.copyInvite(invites.localhost, 'Localhost invite link');

    if (invites.lan) {
      await this.copyInvite(invites.lan, 'LAN invite link');
    } else {
      console.log(pc.gray('📋 Skipped LAN clipboard copy (unavailable)'));
    }

    if (tunnelUrl) {
      await this.copyInvite(tunnelUrl, 'Tunnel invite link');
    } else if (this.tunnelState === 'not-installed') {
      console.log(pc.gray('📋 Skipped Tunnel clipboard copy (not installed)'));
    } else if (this.tunnelState === 'skipped') {
      console.log(pc.gray('📋 Skipped Tunnel clipboard copy (--skip-tunnel)'));
    } else {
      console.log(pc.gray('📋 Skipped Tunnel clipboard copy (URL unavailable)'));
    }
  }

  private async copyInvite(url: string, label: string): Promise<void> {
    await copyInviteUrl(url, label);
  }

  private async openBrowser(room: { roomId: string; joinToken: string }): Promise<void> {
    console.log(pc.blue('🚀 Opening browser tabs...'));
    const homeUrl = new URL('/', this.baseUrl).toString();
    const joinUrl = new URL(`/join/${room.roomId}?t=${room.joinToken}`, this.baseUrl).toString();

    try {
      await Promise.all([
        open(homeUrl, { wait: false }),
        open(joinUrl, { wait: false }),
      ]);
      console.log(pc.green('🚀 Browser opened for Home and Join URLs'));
    } catch (error) {
      console.log(pc.yellow(`⚠️  Failed to open browser automatically: ${error}`));
      console.log(pc.gray(`Home: ${homeUrl}`));
      console.log(pc.gray(`Join: ${joinUrl}`));
    }
  }

  private async runSmokeTest(room: { roomId: string; joinToken: string }): Promise<void> {
    console.log(pc.blue('🧪 Running smoke test (JOIN → PLACE → MOVE)...'));

    const wsUrl = new URL('/ws', this.baseUrl);
    wsUrl.protocol = wsUrl.protocol.replace('http', 'ws');

    try {
      const result = await runSmokeTest({
        roomId: room.roomId,
        token: room.joinToken,
        wsUrl: wsUrl.toString(),
        timeout: 10000,
      });

      if (result.success) {
        console.log(pc.green('🧪 Smoke test PASS'));
      } else {
        console.log(pc.red(`🧪 Smoke test FAIL: ${result.error}`));
        result.steps.forEach((step) => console.log(pc.gray(`  • ${step}`)));
      }
    } catch (error) {
      console.log(pc.red(`🧪 Smoke test error: ${error}`));
    }
  }

  private setupSignalHandlers(): void {
    const shutdown = async () => {
      if (this.shuttingDown) return;
      this.shuttingDown = true;
      console.log(pc.yellow('\n🛑 Shutting down...'));
      await this.cleanup();
      process.exit(0);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }

  private async cleanup(): Promise<void> {
    for (const child of this.processes) {
      killProcess(child);
    }
    this.processes = [];

    if (this.tunnel) {
      this.tunnel.stop();
      this.tunnel = null;
    }
  }
}

function loadEnvFile(filePath = '.env'): void {
  const absPath = resolve(process.cwd(), filePath);
  if (!existsSync(absPath)) {
    return;
  }

  const content = readFileSync(absPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = unquote(rawValue);

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  }

  return trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: DevOptions = {
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
    console.error(pc.red('❌ Development orchestrator error:'), error);
    process.exit(1);
  });
}
