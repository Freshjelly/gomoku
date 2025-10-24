import { useGameStore } from '../store/gameStore';
import { clsx } from 'clsx';

export function StatusBar() {
  const { playerColor, currentTurn, connectionStatus, latency, players } = useGameStore();

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return '接続中...';
      case 'connected':
        return '接続済み';
      case 'reconnecting':
        return '再接続中...';
      case 'disconnected':
        return '切断';
      default:
        return '不明';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-success';
      case 'connecting':
      case 'reconnecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-error';
      default:
        return 'text-text-secondary';
    }
  };

  const getLatencyColor = () => {
    if (latency < 50) return 'text-success';
    if (latency < 100) return 'text-yellow-500';
    return 'text-error';
  };

  return (
    <div className="card p-4" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Player Color */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">あなた:</span>
          {playerColor ? (
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-4 h-4 rounded-full border-2',
                  playerColor === 'black'
                    ? 'bg-stone-black border-gray-400'
                    : 'bg-stone-white border-gray-600'
                )}
              />
              <span className="font-semibold text-text-primary">
                {playerColor === 'black' ? '黒' : '白'}
              </span>
            </div>
          ) : (
            <span className="text-text-secondary">-</span>
          )}
        </div>

        {/* Current Turn */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">手番:</span>
          {currentTurn ? (
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-3 h-3 rounded-full animate-ping-dot',
                  currentTurn === 'black' ? 'bg-stone-black' : 'bg-stone-white'
                )}
              />
              <span className="font-semibold text-text-primary">
                {currentTurn === 'black' ? '黒' : '白'}
              </span>
            </div>
          ) : (
            <span className="text-text-secondary">-</span>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">接続:</span>
          <span className={clsx('font-semibold', getConnectionStatusColor())}>
            {getConnectionStatusText()}
          </span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">遅延:</span>
          <span className={clsx('font-semibold', getLatencyColor())}>
            {latency > 0 ? `${latency}ms` : '-'}
          </span>
        </div>

        {/* Players Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-stone-black" />
            <span className="text-sm text-text-secondary">黒</span>
            <span
              className={clsx('text-xs', players.blackConnected ? 'text-success' : 'text-error')}
            >
              {players.blackConnected ? '●' : '○'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-stone-white border border-gray-400" />
            <span className="text-sm text-text-secondary">白</span>
            <span
              className={clsx('text-xs', players.whiteConnected ? 'text-success' : 'text-error')}
            >
              {players.whiteConnected ? '●' : '○'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
