import { fetch } from 'undici';
import { createRoom, connect, join, send, waitForMessage, logInfo, logPass, logFail } from './common';

async function measureRtt(ws: any, attempts = 3): Promise<number> {
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < attempts; i++) {
    const start = Date.now();
    ws.send(JSON.stringify({ type: 'PING' }));
    await waitForMessage(ws, (m) => m.type === 'PONG', 2000);
    const rtt = Date.now() - start;
    min = Math.min(min, rtt);
  }
  return min;
}

async function main() {
  try {
    // Health check
    const ok = await fetch('http://localhost:3000/health');
    if (!ok.ok) throw new Error('/health failed');
    logInfo('/health 200 OK');

    const { roomId, joinToken, wsUrl } = await createRoom();
    logInfo(`Room=${roomId}`);
    logInfo(`WS=${wsUrl}`);

    const a = await connect(wsUrl);
    const b = await connect(wsUrl);
    await join(a, roomId, joinToken);
    await join(b, roomId, joinToken);

    // Minimal scenario: A places, B receives MOVE, then B resigns -> END
    await send(a, { type: 'PLACE', x: 0, y: 0 });
    await waitForMessage(b, (m) => m.type === 'MOVE', 5000);
    await send(b, { type: 'RESIGN' });
    await waitForMessage(a, (m) => m.type === 'END', 5000);

    const rttA = await measureRtt(a);
    logInfo(`Min RTT A=${rttA}ms`);

    const threshold = Number(process.argv.find((v) => v.startsWith('--rtt='))?.split('=')[1] || 200);
    if (rttA > threshold) {
      logFail(`RTT ${rttA}ms exceeds threshold ${threshold}ms`);
      process.exit(1);
    }

    a.close();
    b.close();
    logPass('Mobile-friendly minimal scenario passed');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

