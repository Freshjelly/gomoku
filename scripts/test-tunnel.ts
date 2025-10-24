import pc from 'picocolors';
import { startCloudflareTunnel, isCloudflaredInstalled } from './tunnel';
import { fetch } from 'undici';
import { createRoom, logInfo, logPass, logFail } from './common';

async function main() {
  try {
    if (!isCloudflaredInstalled()) {
      console.log(pc.yellow('SKIP: cloudflared not installed.'));
      process.exit(0);
    }
    const port = parseInt(process.env.PORT || '3000', 10);
    const tunnel = await startCloudflareTunnel(port, { silent: true, timeoutMs: 15000 });
    if (!tunnel) {
      console.log(pc.yellow('SKIP: failed to obtain tunnel URL.'));
      process.exit(0);
    }

    const base = tunnel.url;
    logInfo(`Tunnel=${base}`);
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error(`Tunnel /health HTTP ${res.status}`);

    const { wsUrl, roomId, joinToken } = await createRoom(base);
    if (!wsUrl.startsWith('wss://')) throw new Error(`Expected wss:// wsUrl, got ${wsUrl}`);
    logPass('Tunnel reachable and wss URL emitted');

    // Do not perform WS connect here to keep the test lightweight
    tunnel.stop();
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

