import { createRoom, connect, join, logInfo, logPass, logFail, waitForMessage } from './common';

async function main() {
  try {
    const { roomId, joinToken, wsUrl } = await createRoom();

    const a = await connect(wsUrl);
    await join(a, roomId, joinToken);
    const b = await connect(wsUrl);
    await join(b, roomId, joinToken);

    // A places a stone
    a.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
    await waitForMessage(b, (m) => m.type === 'MOVE', 3000);

    // Disconnect A
    a.close(1000, 'test-disconnect');
    logInfo('Client A disconnected. Reconnecting...');

    // Reconnect A
    const a2 = await connect(wsUrl);
    a2.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));
    const state = await waitForMessage<any>(a2, (m) => m.type === 'STATE', 5000);
    if (!Array.isArray(state.board) || typeof state.turn !== 'string') {
      throw new Error('STATE missing board/turn');
    }
    logPass('Reconnection STATE restored');
    a2.close();
    b.close();
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

