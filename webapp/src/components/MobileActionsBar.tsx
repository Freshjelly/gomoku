import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { copyToClipboard } from '../lib/clipboard';

interface Props {
  roomId: string;
  token: string;
  onResign?: () => void;
}

export function MobileActionsBar({ roomId, token, onResign }: Props) {
  const { soundEnabled, toggleSound } = useGameStore();
  const inviteUrl = useMemo(() => `${window.location.origin}/join/${roomId}?t=${token}`, [roomId, token]);

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40">
      <div className="m-3 rounded-2xl shadow-xl bg-bg-primary border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between gap-2">
        <button
          className="btn-danger flex-1 py-3 text-sm"
          onClick={() => {
            if (onResign) onResign();
          }}
          aria-label="投了"
        >
          投了
        </button>
        <button
          className="btn-secondary flex-1 py-3 text-sm"
          onClick={async () => {
            try {
              await copyToClipboard(inviteUrl);
            } catch {}
          }}
          aria-label="招待リンクをコピー"
        >
          招待コピー
        </button>
        <button
          className="btn-ghost w-12 h-12 text-xl"
          onClick={toggleSound}
          aria-label={soundEnabled ? '音をオフ' : '音をオン'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
}

