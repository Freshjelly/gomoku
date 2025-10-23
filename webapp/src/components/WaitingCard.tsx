import { Button } from './ui/Button';

interface WaitingCardProps {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  message: string;
}

export function WaitingCard({ status, message }: WaitingCardProps) {
  const isLoading = status === 'connecting' || status === 'reconnecting';

  return (
    <div className="card p-8">
      <div className="text-center">
        {isLoading && (
          <div className="mb-4">
            <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <h3 className="text-xl font-semibold text-text-primary mb-2">{message}</h3>

        <p className="text-text-secondary">
          {status === 'connecting' && 'サーバーに接続しています...'}
          {status === 'reconnecting' && '接続を復旧しています...'}
          {status === 'connected' && '相手の参加をお待ちください'}
          {status === 'disconnected' && '接続が切断されました'}
        </p>

        {status === 'disconnected' && (
          <div className="mt-6">
            <Button onClick={() => window.location.reload()} className="btn-primary">
              再接続
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
