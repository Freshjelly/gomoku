import { useGameStore } from '../store/gameStore';

interface GameControlsProps {
  onResign: () => void;
  onShowInviteLink: () => void;
}

export function GameControls({ onResign, onShowInviteLink }: GameControlsProps) {
  const { soundEnabled, playerColor, currentTurn, gameEnded, toggleSound } = useGameStore();

  const handleToggleSound = () => {
    toggleSound();
  };

  const canResign = playerColor && currentTurn && !gameEnded;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <button
        onClick={onResign}
        disabled={!canResign}
        className="btn btn-danger btn-md"
        aria-label="投了する"
      >
        🏳️ 投了
      </button>
      
      <button
        onClick={onShowInviteLink}
        className="btn btn-secondary btn-md"
        aria-label="招待リンクを表示"
      >
        🔗 招待リンク
      </button>
      
      <button
        onClick={handleToggleSound}
        className={`btn btn-ghost btn-md ${soundEnabled ? 'text-blue-600' : 'text-gray-500'}`}
        aria-label={`音声を${soundEnabled ? '無効' : '有効'}にする`}
      >
        {soundEnabled ? '🔊' : '🔇'} 音声
      </button>
    </div>
  );
}
