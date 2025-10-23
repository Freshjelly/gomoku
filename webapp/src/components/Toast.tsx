import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastClassName = () => {
    switch (type) {
      case 'success':
        return 'toast toast-success';
      case 'error':
        return 'toast toast-error';
      case 'info':
        return 'toast toast-info';
      default:
        return 'toast';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '';
    }
  };

  return (
    <div className={getToastClassName()} role="alert" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getIcon()}</span>
        <span className="flex-1">{message}</span>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="通知を閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
