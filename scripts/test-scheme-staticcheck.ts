import { promises as fs } from 'fs';
import { join } from 'path';
import { logInfo, logPass, logFail } from './common';

async function main() {
  try {
    const assetsDir = join(process.cwd(), 'webapp', 'dist', 'assets');
    const files = await fs.readdir(assetsDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    if (jsFiles.length === 0) throw new Error('No built assets found. Run npm run web:build');

    let foundReplace = false;
    for (const f of jsFiles) {
      const content = await fs.readFile(join(assetsDir, f), 'utf8');
      if (content.includes(".protocol.replace('http', 'ws')") || content.includes('.protocol.replace("http","ws")')) {
        foundReplace = true;
        break;
      }
    }
    if (!foundReplace) throw new Error('Did not find scheme replacement logic in built assets');

    logPass('Static scheme check passed (http->ws / https->wss replacement detected)');
    process.exit(0);
  } catch (e: any) {
    logFail(e.stack || e.message);
    process.exit(1);
  }
}

if (require.main === module) main();

