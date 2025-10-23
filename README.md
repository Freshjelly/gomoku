# 五目並べオンライン

1対1で五目並べを楽しめるオンラインゲームです。WebSocketを使用したリアルタイム通信で、スムーズな対戦が可能です。

## 機能

- 🎮 1対1の五目並べ対戦
- 🌐 WebSocketによるリアルタイム通信
- 🔗 招待リンクによる簡単なルーム参加
- 🔄 自動再接続機能
- 🏆 5連での勝利判定（横・縦・斜め）
- ⏰ 10分間の招待トークン有効期限
- 📱 レスポンシブデザイン（モバイル対応）
- ♿ アクセシビリティ対応（キーボード操作、スクリーンリーダー）
- 🎨 ダーク/ライトモード切り替え
- 🔊 サウンド効果（デフォルトOFF）

## 技術スタック

- **バックエンド**: Node.js 20+, TypeScript, Fastify, WebSocket
- **フロントエンド**: React 18, Vite, TypeScript, Tailwind CSS, Zustand
- **テスト**: Vitest
- **ビルド**: TypeScript Compiler (tsc), Vite

## セットアップ

### 前提条件

- Node.js 20.0.0 以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd gomoku-online

# 依存関係をインストール
npm install
```

### 開発環境での起動

```bash
# サーバーとフロントエンドを同時起動
npm run dev
```

または個別に起動：

```bash
# サーバーのみ
npm run server:dev

# フロントエンドのみ（別ターミナル）
npm run web:dev
```

アクセスURL：

- メインページ: http://localhost:5173 (Vite開発サーバー)
- 本番相当: http://localhost:3000 (サーバー経由)
- ヘルスチェック: http://localhost:3000/health

### 本番環境での起動

```bash
# フロントエンドをビルド
npm run web:build

# サーバーをビルド
npm run server:build

# 本番サーバー起動
npm start
```

## 使用方法

### 1. ルーム作成

1. ブラウザで http://localhost:5173 にアクセス
2. 「ルームを作成する」ボタンをクリック
3. 招待リンクが表示されるので、相手に送信
4. 「自分が先手で開始」ボタンでゲーム開始

### 2. ルーム参加

1. 招待リンクをクリック
2. 自動的にWebSocket接続が開始される
3. ゲーム開始！

### 3. ゲームプレイ

- **黒（先手）**から開始
- 交互に石を配置
- **5連**で勝利
- 投了ボタンでゲーム終了

### 4. 操作方法

- **マウス**: 盤面をクリックして石を配置
- **キーボード**: 矢印キーで移動、Enter/Spaceで石を配置
- **タッチ**: モバイルでタップして石を配置

## LAN対戦

### Windows

1. コマンドプロンプトでIPアドレスを確認：

```cmd
ipconfig
```

2. 相手に以下のURLを送信：

```
http://<あなたのIPアドレス>:3000/join/<roomId>?t=<token>
```

例：

```
http://192.168.1.100:3000/join/ABC12345?t=abcd1234...
```

### macOS/Linux

1. ターミナルでIPアドレスを確認：

```bash
ifconfig | grep "inet "
```

2. 相手に以下のURLを送信：

```
http://<あなたのIPアドレス>:3000/join/<roomId>?t=<token>
```

### ファイアウォール設定

**Windows**:

1. Windows Defender ファイアウォールを開く
2. 「受信の規則」→「新しい規則」
3. 「ポート」を選択
4. TCP、ポート3000を許可

**macOS**:

```bash
# 一時的にファイアウォールを無効化（開発時のみ）
sudo pfctl -d
```

**Linux (ufw)**:

```bash
sudo ufw allow 3000
```

## Cloudflare Tunnel での一時公開

### 1. Cloudflare Tunnel のインストール

```bash
# Windows (PowerShell)
winget install Cloudflare.cloudflared

# macOS (Homebrew)
brew install cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. 一時公開

```bash
# サーバーを起動
npm run dev

# 別のターミナルでTunnelを開始
cloudflared tunnel --url http://localhost:3000
```

公開URLが表示されるので、それを相手に送信してください。

例：

```
https://random-words-1234.trycloudflare.com
```

**注意**: HTTPS環境では自動的にWSS（WebSocket Secure）を使用します。

## テスト

```bash
# サーバーサイドのテスト実行
npm test

# テスト監視モード
npm test -- --watch
```

## 開発

### コードフォーマット

```bash
# ESLintチェック
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettierフォーマット
npm run format
```

### プロジェクト構造

```
/
├── server/                 # サーバーサイド
│   ├── index.ts           # メインサーバーファイル
│   ├── room.ts            # ルーム・盤面管理
│   ├── types.ts           # 型定義
│   └── token.ts           # トークン管理
├── webapp/                # React SPA
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── store/         # Zustand状態管理
│   │   ├── lib/           # ユーティリティ
│   │   └── styles/        # CSS/Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── test/                  # テスト
│   └── room.test.ts       # 勝敗判定テスト
├── package.json
├── tsconfig.json
└── README.md
```

## WebSocketプロトコル

### Client → Server

```typescript
// ルーム参加
{ type: "JOIN", roomId: string, token: string }

// 石を配置
{ type: "PLACE", x: number, y: number }

// 投了
{ type: "RESIGN" }

// 生存確認
{ type: "PING" } / { type: "PONG" }
```

### Server → Client

```typescript
// ゲーム状態
{ type: "STATE", board: number[][], turn: PlayerColor, you: PlayerColor, players: {...} }

// 石配置
{ type: "MOVE", x: number, y: number, color: PlayerColor, nextTurn: PlayerColor }

// ゲーム終了
{ type: "END", result: GameResult, line?: Array<[number, number]> }

// エラー
{ type: "ERROR", code: string, message?: string }

// 生存確認
{ type: "PING" } / { type: "PONG" }
```

## アクセシビリティ

このアプリケーションは以下のアクセシビリティ機能を提供しています：

- **キーボード操作**: 矢印キーで盤面移動、Enter/Spaceで石配置
- **スクリーンリーダー**: ARIA属性による適切な読み上げ
- **色覚配慮**: 色だけでなくアイコンやパターンで情報を表現
- **フォーカス管理**: 明確なフォーカスリングとナビゲーション
- **レスポンシブ**: モバイルデバイスでの片手操作対応

## トラブルシューティング

### よくある問題

**Q: WebSocket接続が失敗する**
A: ファイアウォール設定を確認してください。ポート3000が開放されているか確認。

**Q: 招待リンクが無効**
A: トークンの有効期限は10分です。新しいルームを作成してください。

**Q: 石が配置できない**
A: あなたの手番か確認してください。また、既に石がある場所には配置できません。

**Q: 相手が切断した**
A: 自動再接続機能があります。しばらく待つか、新しいルームを作成してください。

**Q: モバイルで操作しにくい**
A: ブラウザのズーム機能を使用するか、横向きにしてください。

### ログ確認

サーバーのログはコンソールに出力されます。エラーが発生した場合は、ログを確認してください。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します！

---

**注意**: このゲームはローカル開発・テスト用途です。本番環境での使用には適切なセキュリティ対策が必要です。
