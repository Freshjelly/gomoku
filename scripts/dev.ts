import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import open from 'open';
import pc from 'picocolors';
import { fetch } from 'undici';

import { ensureDependencies } from './clipboard';
import { getLanIp, findAvailablePort } from './lan-ip';
import { createRoom, generateInviteUrls, printInviteUrls, copyInviteUrl } from './invite';
import { startCloudflareTunnel, killProcess } from './tunnel';
import { runSmokeTest } from './smoke-ws';

interface DevOptions {
  dev: boolean;
  port?: number;
  skipSmoke?: boolean;
  skipTunnel?: boolean;
  skipBrowser?: boolean;
}

class DevOrchestrator {
  private processes: ChildProcess[] = [];
  private tunnelResult: { url: string; process: ChildProcess } | null = null;
  private port: number = 3000;
  private lanIp: string | null = null;

  constructor(private options: DevOptions) {}

  async start(): Promise<void> {
    try {
      console.log(pc.bold(pc.blue('🚀 Starting Gomoku Online Development Environment')));
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
      console.log(pc.green('🎉 Development environment is ready!'));
      console.log(pc.gray('Press Ctrl+C to stop all processes.'));
    } catch (error) {
      console.error(pc.red('❌ Failed to start development environment:'), error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async ensureDependencies(): Promise<void> {
    console.log(pc.blue('📦 Checking dependencies...'));
    ensureDependencies();
  }

  private async detectPort(): Promise<void> {
    console.log(pc.blue('🔍 Detecting available port...'));

    if (this.options.port) {
      this.port = this.options.port;
    } else {
      this.port = await findAvailablePort(3000);
    }

    console.log(pc.green(`✅ Using port ${this.port}`));
  }

  private async startProcesses(): Promise<void> {
    console.log(pc.blue('🔄 Starting processes...'));

    if (this.options.dev) {
      // 開発モード: Vite + Server を並列起動
      const webProcess = spawn('npm', ['run', 'web:dev'], {
        cwd: 'webapp',
        stdio: 'pipe',
        shell: true,
      });

      const serverProcess = spawn('npm', ['run', 'server:dev'], {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, PORT: this.port.toString() },
      });

      this.processes.push(webProcess, serverProcess);

      // プロセスの出力を表示
      webProcess.stdout?.on('data', (data) => {
        console.log(pc.cyan('[WEB]'), data.toString().trim());
      });

      serverProcess.stdout?.on('data', (data) => {
        console.log(pc.yellow('[API]'), data.toString().trim());
      });

      webProcess.stderr?.on('data', (data) => {
        console.log(pc.red('[WEB ERROR]'), data.toString().trim());
      });

      serverProcess.stderr?.on('data', (data) => {
        console.log(pc.red('[API ERROR]'), data.toString().trim());
      });
    } else {
      // 本番モード: ビルドしてからサーバー起動
      console.log(pc.blue('🔨 Building webapp...'));

      const buildProcess = spawn('npm', ['run', 'web:build'], {
        cwd: 'webapp',
        stdio: 'inherit',
        shell: true,
      });

      await new Promise<void>((resolve, reject) => {
        buildProcess.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Web build failed'));
          }
        });
      });

      const serverProcess = spawn('npm', ['run', 'server:build'], {
        stdio: 'pipe',
        shell: true,
      });

      await new Promise<void>((resolve, reject) => {
        serverProcess.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Server build failed'));
          }
        });
      });

      const startProcess = spawn('node', ['dist/index.js'], {
        stdio: 'pipe',
        shell: true,
        env: { ...process.env, PORT: this.port.toString() },
      });

      this.processes.push(startProcess);

      startProcess.stdout?.on('data', (data) => {
        console.log(pc.yellow('[API]'), data.toString().trim());
      });

      startProcess.stderr?.on('data', (data) => {
        console.log(pc.red('[API ERROR]'), data.toString().trim());
      });
    }
  }

  private async waitForServer(): Promise<void> {
    console.log(pc.blue('⏳ Waiting for server to start...'));

    const maxAttempts = 60; // 60秒
    const baseUrl = `http://localhost:${this.port}`;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok) {
          console.log(pc.green(`✅ Server OK on ${baseUrl}`));
          return;
        }
      } catch {
        // サーバーがまだ起動していない
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Server failed to start within 60 seconds');
  }

  private async detectLanIp(): Promise<void> {
    console.log(pc.blue('🌐 Detecting LAN IP...'));

    const lanIp = getLanIp();
    if (lanIp) {
      this.lanIp = lanIp.ip;
      console.log(pc.green(`🌐 LAN IP: ${this.lanIp}`));
    } else {
      console.log(pc.yellow('⚠️  No LAN IP detected, using localhost only'));
    }
  }

  private async createRoom(): Promise<{ roomId: string; joinToken: string }> {
    console.log(pc.blue('🎟 Creating room...'));

    const baseUrl = `http://localhost:${this.port}`;
    const roomData = await createRoom(baseUrl);

    console.log(pc.green(`✅ Room created: ${roomData.roomId}`));
    return roomData;
  }

  private printInviteUrls(roomData: { roomId: string; joinToken: string }): void {
    const urls = generateInviteUrls(
      roomData.roomId,
      roomData.joinToken,
      this.port,
      this.lanIp || undefined,
      this.tunnelResult?.url
    );

    printInviteUrls(urls);
  }

  private async tryStartTunnel(): Promise<void> {
    try {
      this.tunnelResult = await startCloudflareTunnel(this.port);
      if (this.tunnelResult) {
        console.log(pc.green(`🌐 Tunnel: ${this.tunnelResult.url}`));
      }
    } catch (error) {
      console.log(pc.yellow('⚠️  Tunnel failed, continuing without...'));
    }
  }

  private async runSmokeTest(roomData: { roomId: string; joinToken: string }): Promise<void> {
    console.log(pc.blue('🧪 Running smoke test...'));

    try {
      const result = await runSmokeTest({
        roomId: roomData.roomId,
        token: roomData.joinToken,
        wsUrl: `ws://localhost:${this.port}/ws`,
      });

      if (result.success) {
        console.log(pc.green('🧪 Smoke: PASS (JOIN/MOVE)'));
      } else {
        console.log(pc.red(`🧪 Smoke: FAIL - ${result.error}`));
      }
    } catch (error) {
      console.log(pc.red(`🧪 Smoke: ERROR - ${error}`));
    }
  }

  private async openBrowser(roomData: { roomId: string; joinToken: string }): Promise<void> {
    console.log(pc.blue('🚀 Opening browser...'));

    try {
      const homeUrl = `http://localhost:${this.port}/`;
      const joinUrl = `http://localhost:${this.port}/join/${roomData.roomId}?t=${roomData.joinToken}`;

      await Promise.all([open(homeUrl), open(joinUrl)]);

      console.log(pc.green('🚀 Opened your browser to Home and the Join URL.'));
    } catch (error) {
      console.log(pc.yellow('⚠️  Failed to open browser, URLs printed above'));
    }
  }

  private setupSignalHandlers(): void {
    const cleanup = async () => {
      console.log(pc.yellow('\n🛑 Shutting down...'));
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  private async cleanup(): Promise<void> {
    // プロセスを終了
    for (const process of this.processes) {
      killProcess(process);
    }

    // トンネルを終了
    if (this.tunnelResult) {
      killProcess(this.tunnelResult.process);
    }
  }
}

/**
 * CLI用のメイン関数
 */
async function main() {
  const args = process.argv.slice(2);

  const options: DevOptions = {
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
    console.error(pc.red('❌ Development orchestrator error:'), error);
    process.exit(1);
  });
}
