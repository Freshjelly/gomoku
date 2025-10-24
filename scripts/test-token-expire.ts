import { createRoom, getDiag, connect, join, logInfo, logPass, logFail, wait } from './common';

async function main() {
  try {
    const diag = await getDiag();
    logInfo(`Server TTL=${diag.tokenTtlMinutes} minutes`);
    if (diag.tokenTtlMinutes > 1) {
      logInfo('TTL > 1min, skipping to avoid long wait. Set TOKEN_TTL_MIN=1 to enable.');
      process.exit(0);
    }

    const { roomId, joinToken, wsUrl } = await createRoom();
    logInfo(`Room=${roomId}`);
    logInfo(`WS=${wsUrl}`);

    // Wait TTL + buffer
    const waitMs = diag.tokenTtlMinutes * 60_000 + 2000;
    logInfo(`Waiting ${waitMs}ms for token to expire...`);
    await wait(waitMs);

    const ws = await connect(wsUrl);
    ws.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
    const err = await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting ERROR')), 8000);
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ERROR') {
            clearTimeout(timer);
            resolve(msg);
          }
        } catch {}
      });
    });

    if (err.code !== 'TOKEN_EXPIRED') {
      throw new Error(`Expected TOKEN_EXPIRED, got ${err.code}`);
    }

    logPass('Token expiry test passed');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

