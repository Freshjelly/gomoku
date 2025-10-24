import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import pc from 'picocolors';

const TUNNEL_URL_REGEX = /https?:\/\/[a-z0-9.-]+\.trycloudflare\.com/;

export interface TunnelResult {
  url: string;
  process: ChildProcess;
  stop: () => void;
}

export interface StartTunnelOptions {
  timeoutMs?: number;
  silent?: boolean;
}

/**
 * Cloudflare Tunnelを起動し、公開URLを取得する
 */
export async function startCloudflareTunnel(
  port: number,
  options: StartTunnelOptions = {}
): Promise<TunnelResult | null> {
  const binary = findExecutableOnPath('cloudflared');

  if (!binary) {
    if (!options.silent) {
      console.log(pc.yellow('🌐 Tunnel: (not installed)'));
    }
    return null;
  }

  if (!options.silent) {
    console.log(pc.blue('🌐 Starting Cloudflare Tunnel...'));
  }

  const child = spawn(binary, ['tunnel', '--url', `http://localhost:${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timeoutMs = options.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    let resolved = false;
    let buffer = '';

    const handleSignal = (signal: NodeJS.Signals) => {
      if (!options.silent) {
        console.log(pc.gray(`🔌 Received ${signal}, shutting down tunnel...`));
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
          console.log(pc.yellow('⚠️  Tunnel URL fetch timed out, continuing without tunnel'));
        }
        resolve(null);
      }
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      if (resolved) {
        return;
      }

      const text = data.toString();
      buffer += text;

      const match = buffer.match(TUNNEL_URL_REGEX);
      if (match) {
        resolved = true;
        clearTimeout(timer);

        if (!options.silent) {
          console.log(pc.green(`🌐 Tunnel URL: ${match[0]}`));
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
      } else if (!options.silent && text.trim().length > 0) {
        process.stdout.write(pc.gray(`[cloudflared] ${text}`));
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      if (resolved || options.silent) {
        return;
      }
      process.stdout.write(pc.gray(`[cloudflared] ${data.toString()}`));
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
      } else {
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });
  });
}

function findExecutableOnPath(executable: string): string | null {
  const pathEnv = process.env.PATH ?? '';
  const separator = process.platform === 'win32' ? ';' : ':';
  const exts =
    process.platform === 'win32'
      ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
          .split(';')
          .filter(Boolean)
          .map((ext) => ext.toLowerCase())
      : [''];

  for (const rawDir of pathEnv.split(separator)) {
    if (!rawDir) continue;
    const dir = rawDir.trim();
    for (const ext of exts) {
      const candidate =
        process.platform === 'win32' && extname(executable).toLowerCase() === ext
          ? join(dir, executable)
          : join(dir, process.platform === 'win32' ? `${executable}${ext}` : executable);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function isCloudflaredInstalled(): boolean {
  return findExecutableOnPath('cloudflared') !== null;
}

/**
 * プロセスを安全に終了する
 */
export function killProcess(childProcess: ChildProcess | null | undefined): void {
  if (!childProcess || childProcess.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', `${childProcess.pid}`, '/f', '/t'], { stdio: 'ignore' });
  } else {
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
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(pc.red(`❌ Failed to start cloudflared: ${error}`));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
