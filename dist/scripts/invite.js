"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.generateInviteUrls = generateInviteUrls;
exports.printInviteUrls = printInviteUrls;
exports.copyInviteUrl = copyInviteUrl;
const undici_1 = require("undici");
const clipboard_1 = require("./clipboard");
const picocolors_1 = __importDefault(require("picocolors"));
/**
 * サーバーに新しいルームを作成する
 */
async function createRoom(baseUrl = 'http://localhost:3000') {
    try {
        const response = await (0, undici_1.fetch)(`${baseUrl}/api/rooms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = (await response.json());
        return data;
    }
    catch (error) {
        throw new Error(`Failed to create room: ${error}`);
    }
}
/**
 * 招待URLを生成する
 */
function generateInviteUrls(roomId, token, port, lanIp, tunnelUrl) {
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
function printInviteUrls(urls) {
    console.log(picocolors_1.default.cyan('🎟 Room Created:'));
    console.log(picocolors_1.default.gray(`- Localhost: ${urls.localhost}`));
    if (urls.lan) {
        console.log(picocolors_1.default.gray(`- LAN: ${urls.lan}`));
    }
    if (urls.tunnel) {
        console.log(picocolors_1.default.gray(`- Tunnel: ${urls.tunnel}`));
    }
    console.log();
}
/**
 * クリップボードに招待URLをコピーする
 */
async function copyInviteUrl(url, label = 'Invite link') {
    try {
        await (0, clipboard_1.copyToClipboard)(url);
        console.log(picocolors_1.default.green(`🔓 ${label} copied to clipboard`));
        return true;
    }
    catch (error) {
        console.log(picocolors_1.default.yellow(`⚠️  Failed to copy ${label} to clipboard, URL printed above`));
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
    let lanIp;
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
        console.log(picocolors_1.default.blue('🎟 Creating new room...'));
        const roomData = await createRoom(baseUrl);
        const urls = generateInviteUrls(roomData.roomId, roomData.joinToken, port, lanIp);
        printInviteUrls(urls);
        // ローカルホストのURLをクリップボードにコピー
        await copyInviteUrl(urls.localhost, 'Localhost invite link');
    }
    catch (error) {
        console.error(picocolors_1.default.red('❌ Failed to create room:'), error);
        process.exit(1);
    }
}
// CLI実行時のみmainを呼び出す
if (require.main === module) {
    main().catch((error) => {
        console.error(picocolors_1.default.red('❌ Invite generation error:'), error);
        process.exit(1);
    });
}
//# sourceMappingURL=invite.js.map