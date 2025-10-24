import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useGomokuWs } from '../hooks/useGomokuWs';
import { useGameStore } from '../store/gameStore';
import { Header } from '../components/Header';
import { Board } from '../components/Board';
import { StatusBar } from '../components/StatusBar';
import { ResultModal } from '../components/ResultModal';
import { WaitingCard } from '../components/WaitingCard';
import { MobileActionsBar } from '../components/MobileActionsBar';
import { useToast } from '../hooks/useToast';

export default function Join() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('t');

  const { connect, disconnect, error, resign } = useGomokuWs();
  const { connectionStatus, playerColor, players, gameEnded, resetGame } = useGameStore();
  const { showToast } = useToast();

  // Connect to room on mount
  useEffect(() => {
    if (!roomId || !token) {
      showToast('無効な招待リンクです', 'error');
      navigate('/');
      return;
    }

    connect(roomId, token);

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Reset game state on unmount
  useEffect(() => {
    return () => {
      resetGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWaiting =
    connectionStatus === 'connecting' ||
    connectionStatus === 'reconnecting' ||
    (connectionStatus === 'connected' && !playerColor);

  const isGameReady =
    connectionStatus === 'connected' &&
    playerColor &&
    (players.blackConnected || players.whiteConnected);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="container mx-auto px-4 pb-20 pt-4 max-w-4xl">
        <div className="space-y-4">
          {/* Status Bar */}
          <StatusBar />

          {/* Game Area */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Board */}
            <div className="flex-1">
              {isWaiting ? (
                <WaitingCard
                  status={connectionStatus}
                  message={
                    connectionStatus === 'connecting'
                      ? '接続中...'
                      : connectionStatus === 'reconnecting'
                        ? '再接続中...'
                        : '相手の参加を待っています...'
                  }
                />
              ) : isGameReady ? (
                <Board />
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-text-secondary">ゲームを準備中...</p>
                </div>
              )}
            </div>

            {/* Game Controls */}
            {isGameReady && (
              <div className="lg:w-64 space-y-4">
                <div className="card p-4">
                  <h3 className="font-semibold text-text-primary mb-3">ゲーム操作</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (confirm('本当に投了しますか？')) {
                          resign();
                        }
                      }}
                      className="btn-danger w-full"
                    >
                      投了
                    </button>
                    <button onClick={() => navigate('/')} className="btn-secondary w-full">
                      ホームに戻る
                    </button>
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="font-semibold text-text-primary mb-3">設定</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>音を鳴らす</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Result Modal */}
      {gameEnded && <ResultModal />}

      {/* Mobile one-hand bar */}
      {isGameReady && roomId && token && (
        <MobileActionsBar roomId={roomId} token={token} onResign={() => resign()} />)
      }
    </div>
  );
}
