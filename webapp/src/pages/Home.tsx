import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Header } from '../components/Header';
import { createRoom } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';
import { useToast } from '../hooks/useToast';

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [roomData, setRoomData] = useState<{
    roomId: string;
    joinToken: string;
    inviteUrl: string;
  } | null>(null);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const response = await createRoom();
      const inviteUrl = `${window.location.origin}/join/${response.roomId}?t=${response.joinToken}`;

      setRoomData({
        roomId: response.roomId,
        joinToken: response.joinToken,
        inviteUrl,
      });

      showToast('ルームを作成しました', 'success');
    } catch (error) {
      console.error('Failed to create room:', error);
      showToast('ルーム作成に失敗しました', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!roomData) return;

    try {
      await copyToClipboard(roomData.inviteUrl);
      showToast('招待リンクをコピーしました', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('コピーに失敗しました', 'error');
    }
  };

  const handleJoinAsHost = () => {
    if (!roomData) return;
    navigate(`/join/${roomData.roomId}?t=${roomData.joinToken}`);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">五目並べオンライン</h1>
          <p className="text-lg text-text-secondary text-balance">1対1で五目並べを楽しもう！</p>
        </div>

        <div className="space-y-6">
          {/* Create Room Section */}
          <Card className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-text-primary mb-4">新規ルーム作成</h2>
              <p className="text-text-secondary mb-6">ルームを作成して、相手を招待しましょう</p>

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="btn-primary text-lg px-8 py-3"
              >
                {isCreating ? '作成中...' : 'ルームを作成する'}
              </Button>
            </div>
          </Card>

          {/* Room Info */}
          {roomData && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold text-text-primary mb-4">ルーム情報</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    ルームID
                  </label>
                  <div className="font-mono text-lg font-bold text-accent bg-bg-secondary px-3 py-2 rounded-lg">
                    {roomData.roomId}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    招待リンク
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomData.inviteUrl}
                      readOnly
                      className="flex-1 font-mono text-sm bg-bg-secondary px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                    <Button onClick={handleCopyInviteLink} className="btn-secondary">
                      コピー
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleJoinAsHost} className="btn-primary flex-1">
                    自分が先手で開始
                  </Button>
                  <Button onClick={handleCopyInviteLink} className="btn-secondary">
                    招待リンク再表示
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Instructions */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">遊び方</h3>
            <ol className="space-y-2 text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </span>
                「ルームを作成する」ボタンをクリック
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </span>
                招待リンクを相手に送る
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </span>
                相手が参加したらゲーム開始！
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </span>
                黒（先手）から交互に石を置く
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium">
                  5
                </span>
                5連で勝利！
              </li>
            </ol>
          </Card>
        </div>
      </main>
    </div>
  );
}
