# 🎮 五目並べオンライン

オンラインで対戦できる五目並べゲーム。Cloudflare Tunnelで外部公開可能。

## ✨ 機能

- 🌐 **オンライン対戦**: Cloudflare Tunnelで外部公開（HTTPS/WSS）
- 📱 **モバイル対応**: スマホ・タブレット対応のレスポンシブUI
- 🌙 **ダークモード**: ライト/ダークテーマの切り替え
- 🎯 **本格碁盤**: SVG描画による線の交点への配置
- 🔄 **リプレイ機能**: 同じ部屋で何度でも対戦可能
- ⚡ **リアルタイム同期**: WebSocketによる瞬時の盤面更新

## 🎯 ゲームルール

- **盤面**: 15×15
- **勝利条件**: 縦・横・斜めのいずれかに5つ以上連続
- **先手**: 黒石
- **後手**: 白石
- **投了**: いつでも投了可能

## 🚀 クイックスタート

### 必要なもの

- Node.js 20以上
- npm

### インストールと起動

```bash
# リポジトリのクローン
git clone <repository-url>
cd gomoku

# 依存関係のインストール
npm install

# 開発サーバー起動（自動的にCloudflare Tunnel起動）
npm run go
```

起動すると以下が表示されます：

```
✅ Room ready (ABC12345)

🎟 Invite URLs
- Localhost: http://localhost:3005/join/ABC12345?t=...
- LAN: http://192.168.1.100:3005/join/ABC12345?t=...
- Tunnel: https://xxx.trycloudflare.com

🚀 Browser opened for Home and Join URLs
```

### 対戦方法

1. **ホスト**: `Tunnel` URLをコピー
2. **ゲスト**: URLをブラウザで開く
3. **両者**: 自動的にマッチング、黒石から開始

## 📦 スクリプト

```bash
# 開発モード（トンネル付き）
npm run go

# ビルド
npm run build            # サーバー + Webapp
npm run server:build     # サーバーのみ
npm run web:build        # Webappのみ

# テスト
npm test                 # 全テスト実行
npm run test:watch       # ウォッチモード
```

## 🏗️ プロジェクト構成

```
.
├── server/              # Fastify WebSocketサーバー
│   ├── index.ts        # メインサーバー
│   ├── room.ts         # ゲームルーム管理
│   ├── types.ts        # 型定義
│   └── engine/         # 五目並べエンジン
├── webapp/              # React + Vite フロントエンド
│   └── src/
│       ├── components/ # UIコンポーネント
│       ├── hooks/      # カスタムフック
│       ├── store/      # Zustand状態管理
│       └── pages/      # ページコンポーネント
├── scripts/             # ユーティリティスクリプト
└── test/                # テストファイル
```

## 🔧 設定

### 環境変数（`.env`）

```env
PORT=3000                # サーバーポート
```

### Cloudflare Tunnel

`cloudflared`がインストールされていれば自動的にHTTPSトンネルを起動します。

```bash
# cloudflaredのインストール（Ubuntu/Debian）
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

## 🎨 UI機能

- **石の配置**: クリック/タップで石を配置
- **ホバープレビュー**: マウスを乗せると配置予定の石を表示
- **勝利演出**: 5連の石がハイライト表示
- **ダークモード**: ヘッダーのボタンで切り替え
- **キーボード操作**: 矢印キー + Enter で石を配置

## 🧪 テスト

```bash
# 全テスト
npm test

# カバレッジ
npm run test:coverage

# 特定のテスト
npm test -- room.test.ts
```

## 📝 技術スタック

### バックエンド
- **Fastify**: 高速Webフレームワーク
- **@fastify/websocket**: WebSocket対応
- **@fastify/static**: 静的ファイル配信
- **TypeScript**: 型安全性

### フロントエンド
- **React 18**: UIライブラリ
- **Vite**: 高速ビルドツール
- **Zustand**: 状態管理
- **Tailwind CSS**: スタイリング
- **React Router**: ルーティング

### インフラ
- **Cloudflare Tunnel**: HTTPS外部公開
- **WebSocket**: リアルタイム通信

## 🐛 トラブルシューティング

### ポート競合

```bash
# ポート3000が使用中の場合、自動的に次の空きポートを使用
⚠️  Port 3000 is busy, using next available port 3005
```

### トンネル接続失敗

```bash
# cloudflaredがインストールされていない場合
🌐 Tunnel: (not installed)
```

→ ローカルとLANアドレスは動作します

### Node.jsバージョン

Node.js 20以上を推奨。nvmでの管理を推奨：

```bash
# nvmのインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh

# Node 20のインストール
nvm install 20
nvm use 20
```

## 📄 ライセンス

MIT License

## 🤝 コントリビューション

プルリクエスト歓迎！バグ報告や機能要望はIssuesへ。
