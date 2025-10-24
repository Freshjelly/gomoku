# 🎮 五目並べオンライン

オンラインで対戦できる五目並べゲーム。モバイル最適化とCloudflare Tunnelによる外部公開対応。

## ✨ 機能

- 🌐 **オンライン対戦**: Cloudflare Tunnelで外部公開（HTTPS/WSS）
- 📱 **完全モバイル対応**: レスポンシブ盤面、タッチ最適化、Safe Area対応
- 📲 **QRコード招待**: ルーム作成時にQRコード自動生成
- 🎯 **正確な交点配置**: Canvas + スナップ判定による誤配置ゼロ
- 🔄 **リアルタイム同期**: WebSocketによる瞬時の盤面同期
- 🌙 **ダークモード**: ライト/ダークテーマの切り替え
- ⚡ **高DPI対応**: Retinaディスプレイでもジャギらない高品質描画

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

### 📱 モバイル最適化（v3.0）
- **レスポンシブ盤面**: 画面サイズに応じた自動リサイズ（最小44pxタッチターゲット確保）
- **タッチ最適化**: ダブルタップズーム無効、スクロール誤発火防止
- **Safe Area対応**: iPhone/Android ノッチ対応（viewport-fit=cover）
- **高DPI対応**: devicePixelRatio対応で高解像度ディスプレイでも鮮明

### 🎯 盤面操作
- **正確な交点配置**: Canvas + Pointer Eventsによる統一的な入力処理
- **スナップ判定**: 交点から一定距離内のクリック/タップを自動吸着（cellPx × 0.4）
- **ホバープレビュー**: マウスを乗せると配置予定の石を半透明表示
- **勝利演出**: 5連の石がハイライト表示（青い枠線）

### 🔗 招待機能
- **QRコード自動生成**: ルーム作成時に招待URL→QRコード変換
- **ワンクリックコピー**: 招待リンクをクリップボードへコピー
- **モバイル単体完結**: スマホのみでルーム作成→QR表示→共有が可能

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

### 碁石が配置できない問題（v2.0で解決済み）

**問題**: PCやモバイルで交点に碁石が正確に配置されない

**原因**: CSS Gridベースのボタン配置では、交点の正確な判定とスナップが困難

**解決方法（v2.0で実装済み）**:
- Canvas APIベースの描画に完全移行
- Pointer Eventsによる統一的なマウス/タッチ判定
- 座標変換ロジック（論理座標 ↔ グリッド座標）
- スナップ閾値による交点への吸着（cellPx × 0.4）
- High DPI対応（devicePixelRatio）

**v3.0追加改善**:
- レスポンシブ盤面サイズ自動調整（モバイル対応）
- Safe Area対応（ノッチ付きデバイス）
- タッチ操作最適化（ダブルタップズーム無効、誤スクロール防止）
- QRコード招待機能

**実装詳細**:
- `webapp/src/lib/coords.ts`: 座標変換とスナップ判定
- `webapp/src/lib/boardConfig.ts`: レスポンシブ設定計算
- `webapp/src/components/BoardCanvas.tsx`: Canvas描画とPointer Events
- `webapp/src/lib/qrcode.ts`: QRコード生成
- `webapp/index.html`: モバイルviewport設定、Safe Area対応
- `webapp/src/__tests__/coords.test.ts`: 座標変換のユニットテスト
- `webapp/src/__tests__/gomoku-e2e.test.ts`: 交点スナップと勝利判定のE2Eテスト

**テスト**:
```bash
npm --prefix webapp test  # 全テスト実行
```

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
