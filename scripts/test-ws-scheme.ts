import { promises as fs } from 'fs';
import { join } from 'path';
import { logPass, logFail } from './common';

async function main() {
  try {
    const file = join(process.cwd(), 'webapp', 'src', 'hooks', 'useGomokuWs.ts');
    const content = await fs.readFile(file, 'utf8');
    if (!content.includes("new URL('/ws', window.location.href)")) {
      throw new Error('useGomokuWs.ts does not build WS URL via relative scheme');
    }
    if (!content.includes("protocol.replace('http', 'ws')")) {
      throw new Error('WS URL does not replace http->ws');
    }
    logPass('WS scheme construction is relative and safe');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

