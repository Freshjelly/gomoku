import { getDiag, createRoom, connect, join, logInfo, logPass, logFail } from './common';

async function main() {
  try {
    const diag = await getDiag();
    if (diag.basePath !== '/app') {
      logInfo(`BASE_PATH=${diag.basePath} (server). Skipping. Start server with BASE_PATH=/app to run this test.`);
      process.exit(0);
    }
    if (diag.websocketPath !== '/app/ws') {
      throw new Error(`Unexpected websocketPath: ${diag.websocketPath}`);
    }

    const { roomId, joinToken, wsUrl } = await createRoom();
    if (!wsUrl.includes('/app/ws')) throw new Error(`wsUrl not under /app/ws: ${wsUrl}`);

    const ws = await connect(wsUrl);
    await join(ws, roomId, joinToken);
    ws.send(JSON.stringify({ type: 'PLACE', x: 0, y: 0 }));
    logPass('BASE_PATH test passed (JOIN+PLACE under /app)');
    ws.close();
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

