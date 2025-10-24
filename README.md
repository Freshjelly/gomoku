# 五目並べオンライン

リアルタイム WebSocket 通信で 1 対 1 の五目並べ対戦を楽しめる Node.js + React プロジェクトです。  
`npm run go` を実行すると、Web（Vite）・API（Fastify）・Cloudflare Tunnel（任意）・ブラウザ・WebSocket スモークテストまでを自動で起動してくれます。

---

## ステップ順ガイド

### 1. リポジトリを取得する

```bash
git clone <repository-url>
cd gomoku
```

### 2. 依存関係をインストールする

```bash
npm install
```

> ルートだけでなく `webapp/` の依存も自動で入ります。

### 3. 環境変数ファイルを用意する

```bash
cp .env.example .env
```

必要に応じて以下の値を編集します（説明は後述）。

```dotenv
PORT=3000
LOG_LEVEL=info
TOKEN_TTL_MIN=10
```

### 4. （任意）Cloudflare Tunnel を準備する

`npm run go` は `cloudflared` が PATH にある場合のみトンネルを自動起動します。導入したい OS の行を実行してください。

```
Windows: choco install cloudflared
macOS:   brew install cloudflare/cloudflare/cloudflared
Linux:   sudo apt-get install cloudflared
```

> インストールしなくてもローカル / LAN 対戦は問題なく動作します。

### 5. ワンコマンドで起動する

```bash
npm run go
```

以下の処理が順番に実行されます。

1. 依存チェック（未インストールなら自動 `npm install`）
2. `.env` ロード & 使用可能なポート確定
3. `npm run start:pair`（開発モード）または `start:prod`（本番モード）起動
4. `GET /health` をポーリングし Fastify の起動を待機
5. LAN IP を 10.x → 172.16-31.x → 192.168.x の順に検索（見つからなくても継続）
6. `POST /api/rooms` で `{ roomId, joinToken }` を取得
7. `cloudflared` があればトンネル起動し `https://xxxxx.trycloudflare.com` を取得（未導入なら `(not installed)` 表示）
8. Localhost / LAN / Tunnel の招待 URL を表示し、利用可能なものから順にクリップボードへコピー
9. 既定ブラウザで Home（トップ）と Join（localhost 招待 URL）を自動オープン
10. `scripts/smoke-ws.ts` で JOIN → PLACE → MOVE のスモークテスト（タイムアウト 10 秒）
11. Ctrl+C で全プロセスとトンネルを安全に終了

起動ログ例:

```
📦 Checking dependencies...
🔄 Starting npm run start:pair...
⏳ Waiting for HTTP /health...
✅ Server ready at http://localhost:3000
🌐 LAN accessible via http://192.168.0.42:3000
🌐 Tunnel URL: https://alpha.trycloudflare.com
🎟 Invite URLs
- Localhost: http://localhost:3000/join/ABCD1234?t=efgh5678
- LAN: http://192.168.0.42:3000/join/ABCD1234?t=efgh5678
- Tunnel: https://alpha.trycloudflare.com/join/ABCD1234?t=efgh5678
🔓 Tunnel invite link copied to clipboard
🚀 Browser opened for Home and Join URLs
🧪 Smoke test PASS
🎉 Environment ready — press Ctrl+C to stop
```

---

## 招待 URL の使い分け

| 種別 | 例 | 主な用途 |
| --- | --- | --- |
| Localhost | `http://localhost:3000/join/<roomId>?t=<token>` | 同一マシンで動作確認 |
| LAN | `http://192.168.0.10:3000/join/<roomId>?t=<token>` | 同一ネットワーク内の別端末と対戦 |
| Tunnel | `https://xxxxx.trycloudflare.com/join/<roomId>?t=<token>` | Cloudflare Tunnel を使ってインターネット経由で対戦 |

`npm run go` 実行時に利用可能なリンクから順番にクリップボードへコピーされます（最後にコピーされた URL がクリップボードに残ります）。

---

## よく使う npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run go` | 開発フローを丸ごと自動化（上記参照） |
| `npm run start:pair` | `npm:web:dev`（Vite）と `npm:server:dev`（Fastify）を同時起動 |
| `npm run start:prod` | Vite ビルド → `node dist/server/index.js` で本番挙動を確認 |
| `npm run web:dev` | `webapp/` ディレクトリで Vite 開発サーバー（`--host` 付き） |
| `npm run server:dev` | `tsx server/index.ts` をホットリロード無しで実行 |
| `npm run tunnel` | `cloudflared tunnel --url http://localhost:<port>` を実行（URL を取得） |
| `npm run smoke` | WebSocket スモークテストのみ実施（JOIN → PLACE → MOVE） |

開発・テストコマンド:

```bash
npm run dev       # サーバーと Vite を手動で分けて起動したい場合
npm run build     # TypeScript + Vite を一括ビルド
npm run lint
npm run lint:fix
npm run format
npm test
```

---

## API とヘルスチェック

- `GET /health` → 文字列 `"ok"` を返却
- `GET /diag` → ポート・ホスト・トークン TTL・ログレベル・ルーム数などの診断情報を JSON で返却
- `POST /api/rooms` → `{ roomId, joinToken, wsUrl }` を返却（HTTPS 経由なら `wss://` URL）
- `GET /ws` → ゲーム用 WebSocket エンドポイント

---

## 環境変数まとめ

| 変数 | デフォルト値 | 説明 |
| --- | --- | --- |
| `PORT` | `3000` | Fastify のリスニングポート（使用中なら次の空きポートを自動探索） |
| `LOG_LEVEL` | `info` | Fastify のログレベル |
| `TOKEN_TTL_MIN` | `10` | 招待トークン有効期限（分）。`/diag` にも反映されます |

`.env.example` → `.env` で必要な値を設定してください。

---

## プロジェクト構成

```
/
├── server/                  Fastify サーバー（API / WebSocket）
├── webapp/                  React + Vite クライアント
├── scripts/                 DevOps/CLI ツール（dev, tunnel, smoke など）
├── dist/                    ビルド成果物（tsc / vite）
├── .env.example             環境変数サンプル
└── package.json
```

---

## トラブルシューティング

- `cloudflared` 未導入 → `npm run go` のトンネル行が `(not installed)` と表示されるだけで、ローカル / LAN 招待は利用可能
- Mixed Content 警告 → HTTPS 配信時でもクライアント側が `ws://`→`wss://` に自動変換するので発生しません（キャッシュが残る場合はブラウザをリロード）
- スモークテスト失敗 → `npm run smoke -- --room <id> --token <token> --ws <ws-url>` で手動実行し、ログを確認

---

## ライセンス

MIT License
