import { createRoom, connect, join, send, waitForMessage, logInfo, logPass, logFail } from './common';

async function main() {
  try {
    const { roomId, joinToken, wsUrl } = await createRoom();
    const a = await connect(wsUrl);
    const b = await connect(wsUrl);
    await join(a, roomId, joinToken);
    await join(b, roomId, joinToken);

    logInfo('Simultaneous PLACE at same coordinates (0,0)');
    await Promise.all([send(a, { type: 'PLACE', x: 0, y: 0 }), send(b, { type: 'PLACE', x: 0, y: 0 })]);

    // Expect exactly 1 MOVE and one ERROR (INVALID_MOVE or NOT_YOUR_TURN)
    let moveCount = 0;
    let errorCount = 0;
    const collect = (raw: any) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.type === 'MOVE') moveCount++;
        if (m.type === 'ERROR' && (m.code === 'INVALID_MOVE' || m.code === 'NOT_YOUR_TURN')) errorCount++;
      } catch {}
    };
    a.on('message', collect);
    b.on('message', collect);
    await new Promise((r) => setTimeout(r, 500));
    if (moveCount < 1 || errorCount < 1) throw new Error(`Expected move>=1 and error>=1, got move=${moveCount} error=${errorCount}`);

    logInfo('Simultaneous PLACE at different coordinates (1,0) and (0,1)');
    moveCount = 0;
    errorCount = 0;
    await Promise.all([send(a, { type: 'PLACE', x: 1, y: 0 }), send(b, { type: 'PLACE', x: 0, y: 1 })]);
    await new Promise((r) => setTimeout(r, 500));
    // Expect at least one error of NOT_YOUR_TURN to ensure serialization
    if (errorCount < 1) throw new Error('Expected at least one NOT_YOUR_TURN/INVALID_MOVE error');

    a.close();
    b.close();
    logPass('Ordering/serialization test passed');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

