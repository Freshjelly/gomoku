import WebSocket from 'ws';
import { createRoom, connect, join, logInfo, logPass, logFail } from './common';

async function main() {
  try {
    const { roomId, joinToken, wsUrl } = await createRoom();
    const ws = await connect(wsUrl);
    await join(ws, roomId, joinToken);
    logInfo('Joined, sending 11 PLACE within 1s...');

    let rateLimitCount = 0;
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ERROR' && msg.code === 'RATE_LIMIT') rateLimitCount++;
      } catch {}
    });

    // fire 11 place quickly
    for (let i = 0; i < 11; i++) {
      ws.send(JSON.stringify({ type: 'PLACE', x: i % 15, y: 0 }));
    }

    await new Promise((r) => setTimeout(r, 1200));
    if (rateLimitCount >= 1) {
      logPass('Rate limit triggered as expected (>=1 RATE_LIMIT)');
      process.exit(0);
    } else {
      throw new Error('No RATE_LIMIT errors observed');
    }
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

