import { createRoom, connect, join, waitForMessage, logInfo, logPass, logFail } from './common';

async function main() {
  try {
    const { roomId, joinToken, wsUrl } = await createRoom();
    const a = await connect(wsUrl);
    const b = await connect(wsUrl);
    await join(a, roomId, joinToken);
    await join(b, roomId, joinToken);

    // A places
    a.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
    await waitForMessage(b, (m) => m.type === 'MOVE', 3000);

    // Close A and simulate backoff reconnection
    a.close(1000, 'simulate-sleep');
    const backoff = [500, 1000, 2000, 5000, 10000];
    let a2: any = null;
    for (let i = 0; i < backoff.length; i++) {
      await new Promise((r) => setTimeout(r, backoff[i]));
      try {
        a2 = await connect(wsUrl);
        a2.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
        const state = await waitForMessage<any>(a2, (m) => m.type === 'STATE', 5000);
        if (Array.isArray(state.board)) break;
      } catch {
        a2?.close();
      }
    }

    if (!a2) throw new Error('Failed to reconnect within backoff schedule');
    logPass('Reconnect with backoff succeeded');
    a2.close();
    b.close();
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

