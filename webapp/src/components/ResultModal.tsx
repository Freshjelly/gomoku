import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

export function ResultModal() {
  const navigate = useNavigate();
  const { winner, playerColor, winLine, setGameEnded, setWinner, setWinLine } = useGameStore();

  const isPlayerWin = winner === playerColor;
  const isDraw = winner === null;

  const getResultTitle = () => {
    if (isDraw) return '引き分け';
    if (isPlayerWin) return '勝利！';
    return '敗北';
  };

  const getResultMessage = () => {
    if (isDraw) return 'ゲームが終了しました';
    if (isPlayerWin) return 'おめでとうございます！5連で勝利しました！';
    return '相手の勝利です。また挑戦してみてください！';
  };

  const getResultColor = () => {
    if (isDraw) return 'text-text-secondary';
    if (isPlayerWin) return 'text-success';
    return 'text-error';
  };

  const handleNewGame = () => {
    setGameEnded(false);
    setWinner(null);
    setWinLine(null);
    navigate('/');
  };

  const handlePlayAgain = () => {
    setGameEnded(false);
    setWinner(null);
    setWinLine(null);
    // Stay in current room for another game
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center">
          {/* Result Icon */}
          <div className="mb-4">
            {isPlayerWin && <div className="text-6xl">🎉</div>}
            {!isPlayerWin && !isDraw && <div className="text-6xl">😔</div>}
            {isDraw && <div className="text-6xl">🤝</div>}
          </div>

          {/* Result Title */}
          <h2 className={clsx('text-3xl font-bold mb-2', getResultColor())}>{getResultTitle()}</h2>

          {/* Result Message */}
          <p className="text-text-secondary mb-6 text-balance">{getResultMessage()}</p>

          {/* Win Line Info */}
          {winLine && winLine.length >= 5 && (
            <div className="mb-6 p-4 bg-bg-secondary rounded-lg">
              <h3 className="font-semibold text-text-primary mb-2">勝利ライン</h3>
              <p className="text-sm text-text-secondary">5連のラインが完成しました！</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button onClick={handlePlayAgain} className="btn-primary w-full">
              もう一局
            </Button>
            <Button onClick={handleNewGame} className="btn-secondary w-full">
              新しいゲーム
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
