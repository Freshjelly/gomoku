import WebSocket from 'ws';
import pc from 'picocolors';
import { connect, createRoom, join, logPass, logFail, logInfo, expectClose } from './common';

async function main() {
  try {
    const { roomId, joinToken, wsUrl } = await createRoom();
    logInfo(`Room=${roomId}`);
    logInfo(`WS=${wsUrl}`);

    const ws1 = await connect(wsUrl);
    await join(ws1, roomId, joinToken);
    logInfo('Client#1 joined');

    const ws2 = await connect(wsUrl);
    await join(ws2, roomId, joinToken);
    logInfo('Client#2 joined (should supersede #1)');

    // old client should be closed with code=4001 and reason contains 'superseded'
    await expectClose(ws1, { code: 4001, reasonIncludes: 'superseded' }, 5000);

    // Third connection -> expect ROOM_FULL
    const ws3 = await connect(wsUrl);
    ws3.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken }));

    const error = await new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting ERROR on third join')), 5000);
      ws3.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ERROR') {
            clearTimeout(timer);
            resolve(msg);
          }
        } catch {}
      });
    });

    if (error.code !== 'ROOM_FULL' && error.code !== 'ALREADY_JOINED') {
      throw new Error(`Expected ROOM_FULL or ALREADY_JOINED, got ${error.code}`);
    }

    ws2.close();
    ws3.close();
    logPass('Double connection replacement and FULL check passed');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

