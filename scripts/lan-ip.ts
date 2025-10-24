import { networkInterfaces } from 'os';
import { createServer } from 'net';

function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  if (parts[0] === 10) return true; // 10.0.0.0/8
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16

  return false;
}

function ipPriority(address: string): number {
  if (address.startsWith('10.')) return 0;
  if (address.startsWith('172.')) {
    const secondOctet = Number(address.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return 1;
    }
  }
  if (address.startsWith('192.168.')) return 2;
  return 3;
}

/**
 * LAN IPアドレスを検出する
 * 優先順位: 10.x.x.x > 172.16-31.x.x > 192.168.x.x > localhost
 */
export function getLanIp(): string {
  const interfaces = networkInterfaces();
  const candidates: string[] = [];

  for (const addresses of Object.values(interfaces)) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (address.internal || address.family !== 'IPv4') continue;
      if (!isPrivateIpv4(address.address)) continue;

      candidates.push(address.address);
    }
  }

  if (candidates.length === 0) {
    return 'localhost';
  }

  candidates.sort((a, b) => ipPriority(a) - ipPriority(b));
  return candidates[0] ?? 'localhost';
}

/**
 * 利用可能なポートを検出する
 */
export async function findAvailablePort(startPort = 3000, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    try {
      await new Promise<void>((resolve, reject) => {
        const server = createServer();

        server.once('error', (err: NodeJS.ErrnoException) => {
          server.close();
          if (err.code === 'EADDRINUSE') {
            reject(err);
          } else {
            reject(err);
          }
        });

        server.listen(port, () => {
          server.close(() => resolve());
        });
      });

      return port;
    } catch {
      continue;
    }
  }

  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}
