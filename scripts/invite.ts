import { fetch } from 'undici';
import { copyToClipboard } from './clipboard';
import pc from 'picocolors';

interface CreateRoomResponse {
  roomId: string;
  joinToken: string;
  wsUrl: string;
}

/**
 * サーバーに新しいルームを作成する
 */
export async function createRoom(baseUrl = 'http://localhost:3000'): Promise<CreateRoomResponse> {
  try {
    const response = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as CreateRoomResponse;
    return data;
  } catch (error) {
    throw new Error(`Failed to create room: ${error}`);
  }
}

/**
 * 招待URLを生成する
 */
export function generateInviteUrls(
  roomId: string,
  token: string,
  port: number,
  lanIp?: string,
  tunnelUrl?: string
) {
  const localhostUrl = `http://localhost:${port}/join/${roomId}?t=${token}`;
  const lanUrl = lanIp ? `http://${lanIp}:${port}/join/${roomId}?t=${token}` : null;
  const tunnelUrlFull = tunnelUrl ? `${tunnelUrl}/join/${roomId}?t=${token}` : null;

  return {
    localhost: localhostUrl,
    lan: lanUrl,
    tunnel: tunnelUrlFull,
  };
}

/**
 * 招待URLを表示する
 */
export function printInviteUrls(urls: ReturnType<typeof generateInviteUrls>) {
  console.log(pc.cyan('🎟 Room Created:'));

  console.log(pc.gray(`- Localhost: ${urls.localhost}`));

  if (urls.lan) {
    console.log(pc.gray(`- LAN: ${urls.lan}`));
  }

  if (urls.tunnel) {
    console.log(pc.gray(`- Tunnel: ${urls.tunnel}`));
  }

  console.log();
}

/**
 * クリップボードに招待URLをコピーする
 */
export async function copyInviteUrl(url: string): Promise<boolean> {
  try {
    await copyToClipboard(url);
    console.log(pc.green('🔓 Invite link copied to clipboard'));
    return true;
  } catch (error) {
    console.log(pc.yellow('⚠️  Failed to copy to clipboard, URL printed above'));
    return false;
  }
}

/**
 * CLI用の招待URL生成
 */
async function main() {
  const args = process.argv.slice(2);

  let baseUrl = 'http://localhost:3000';
  let port = 3000;
  let lanIp: string | undefined;

  // コマンドライン引数をパース
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        baseUrl = args[i + 1];
        i++;
        break;
      case '--port':
        port = parseInt(args[i + 1], 10);
        i++;
        break;
      case '--lan-ip':
        lanIp = args[i + 1];
        i++;
        break;
    }
  }

  try {
    console.log(pc.blue('🎟 Creating new room...'));

    const roomData = await createRoom(baseUrl);
    const urls = generateInviteUrls(roomData.roomId, roomData.joinToken, port, lanIp);

    printInviteUrls(urls);

    // ローカルホストのURLをクリップボードにコピー
    await copyInviteUrl(urls.localhost);
  } catch (error) {
    console.error(pc.red('❌ Failed to create room:'), error);
    process.exit(1);
  }
}

// CLI実行時のみmainを呼び出す
if (require.main === module) {
  main().catch((error) => {
    console.error(pc.red('❌ Invite generation error:'), error);
    process.exit(1);
  });
}
