import { networkInterfaces } from 'os';
import { z } from 'zod';

const LanIpSchema = z.object({
  ip: z.string(),
  family: z.enum(['IPv4', 'IPv6']),
  interface: z.string(),
});

export type LanIp = z.infer<typeof LanIpSchema>;

/**
 * LAN IPアドレスを検出する
 * 優先順位: 10.x.x.x > 172.16-31.x.x > 192.168.x.x > その他のプライベートIP
 */
export function getLanIp(): LanIp | null {
  const interfaces = networkInterfaces();
  const candidates: LanIp[] = [];

  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (address.internal || address.family !== 'IPv4') continue;

      const ip = address.address;
      const parts = ip.split('.').map(Number);

      // プライベートIP範囲をチェック
      if (
        parts[0] === 10 || // 10.0.0.0/8
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

  if (candidates.length === 0) return null;

  // 優先順位でソート
  candidates.sort((a, b) => {
    const aParts = a.ip.split('.').map(Number);
    const bParts = b.ip.split('.').map(Number);

    // 10.x.x.x が最優先
    if (aParts[0] === 10 && bParts[0] !== 10) return -1;
    if (bParts[0] === 10 && aParts[0] !== 10) return 1;

    // 172.16-31.x.x が次
    if (aParts[0] === 172 && bParts[0] !== 172) return -1;
    if (bParts[0] === 172 && aParts[0] !== 172) return 1;

    // 192.168.x.x が最後
    if (aParts[0] === 192 && bParts[0] !== 192) return -1;
    if (bParts[0] === 192 && aParts[0] !== 192) return 1;

    return 0;
  });

  return candidates[0];
}

/**
 * 利用可能なポートを検出する
 */
export async function findAvailablePort(startPort = 3000, maxAttempts = 10): Promise<number> {
  const { createServer } = await import('net');

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;

    try {
      await new Promise<void>((resolve, reject) => {
        const server = createServer();

        server.listen(port, () => {
          server.close(() => resolve());
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is in use`));
          } else {
            reject(err);
          }
        });
      });

      return port;
    } catch {
      // ポートが使用中、次のポートを試す
      continue;
    }
  }

  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}
