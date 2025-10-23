import WebSocket from 'ws';
import pc from 'picocolors';

interface SmokeTestOptions {
  roomId: string;
  token: string;
  wsUrl: string;
  timeout?: number;
}

interface SmokeTestResult {
  success: boolean;
  error?: string;
  steps: string[];
}

/**
 * WebSocket接続のスモークテストを実行
 */
export async function runSmokeTest(options: SmokeTestOptions): Promise<SmokeTestResult> {
  const { roomId, token, wsUrl, timeout = 10000 } = options;
  const steps: string[] = [];

  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let testTimeout: NodeJS.Timeout | null = null;
    let stateReceived = false;
    let moveReceived = false;

    const cleanup = () => {
      if (testTimeout) clearTimeout(testTimeout);
      if (ws) ws.close();
    };

    const fail = (error: string) => {
      cleanup();
      resolve({
        success: false,
        error,
        steps,
      });
    };

    const succeed = () => {
      cleanup();
      resolve({
        success: true,
        steps,
      });
    };

    try {
      steps.push('Connecting to WebSocket...');
      ws = new WebSocket(wsUrl);

      testTimeout = setTimeout(() => {
        fail('Test timeout (10s)');
      }, timeout);

      ws.on('open', () => {
        steps.push('WebSocket connected');

        // JOIN メッセージを送信
        const joinMessage = {
          type: 'JOIN',
          roomId,
          token,
        };

        steps.push('Sending JOIN message...');
        ws!.send(JSON.stringify(joinMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'STATE':
              if (!stateReceived) {
                steps.push('Received STATE message');
                stateReceived = true;

                // 少し待ってからPLACEメッセージを送信
                setTimeout(() => {
                  const placeMessage = {
                    type: 'PLACE',
                    x: 7,
                    y: 7,
                  };

                  steps.push('Sending PLACE message...');
                  ws!.send(JSON.stringify(placeMessage));
                }, 1000);
              }
              break;

            case 'MOVE':
              if (!moveReceived) {
                steps.push('Received MOVE message');
                moveReceived = true;
                succeed();
              }
              break;

            case 'ERROR':
              fail(`Server error: ${message.code} - ${message.message || 'Unknown error'}`);
              break;

            case 'PING':
              // PONGを返す
              ws!.send(JSON.stringify({ type: 'PONG' }));
              break;
          }
        } catch (error) {
          fail(`Failed to parse message: ${error}`);
        }
      });

      ws.on('error', (error) => {
        fail(`WebSocket error: ${error.message}`);
      });

      ws.on('close', (code, reason) => {
        if (!stateReceived || !moveReceived) {
          fail(`WebSocket closed unexpectedly: ${code} ${reason}`);
        }
      });
    } catch (error) {
      fail(`Test setup error: ${error}`);
    }
  });
}

/**
 * CLI用のスモークテスト実行
 */
async function main() {
  const args = process.argv.slice(2);

  let roomId = '';
  let token = '';
  let wsUrl = 'ws://localhost:3000/ws';

  // コマンドライン引数をパース
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--room':
        roomId = args[i + 1];
        i++;
        break;
      case '--token':
        token = args[i + 1];
        i++;
        break;
      case '--ws':
        wsUrl = args[i + 1];
        i++;
        break;
    }
  }

  if (!roomId || !token) {
    console.error(pc.red('❌ Missing required arguments: --room <roomId> --token <token>'));
    process.exit(1);
  }

  console.log(pc.blue('🧪 Running smoke test...'));
  console.log(pc.gray(`Room: ${roomId}`));
  console.log(pc.gray(`WS URL: ${wsUrl}`));

  const result = await runSmokeTest({ roomId, token, wsUrl });

  if (result.success) {
    console.log(pc.green('✅ Smoke test PASSED'));
    console.log(pc.gray('Steps:'));
    result.steps.forEach((step) => {
      console.log(pc.gray(`  ${step}`));
    });
    process.exit(0);
  } else {
    console.log(pc.red('❌ Smoke test FAILED'));
    console.log(pc.red(`Error: ${result.error}`));
    console.log(pc.gray('Steps completed:'));
    result.steps.forEach((step) => {
      console.log(pc.gray(`  ${step}`));
    });
    process.exit(1);
  }
}

// CLI実行時のみmainを呼び出す
if (require.main === module) {
  main().catch((error) => {
    console.error(pc.red('❌ Smoke test error:'), error);
    process.exit(1);
  });
}
