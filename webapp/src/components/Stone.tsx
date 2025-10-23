import { clsx } from 'clsx';

interface StoneProps {
  color: 'black' | 'white';
  isWin?: boolean;
}

export function Stone({ color, isWin = false }: StoneProps) {
  return (
    <div
      className={clsx('absolute inset-0.5 rounded-full border-2 transition-all duration-200 shadow-md', {
        'bg-stone-black border-gray-700 shadow-black/40': color === 'black',
        'bg-stone-white border-gray-300 shadow-gray-500/40': color === 'white',
        'ring-4 ring-accent ring-offset-1 shadow-xl shadow-accent/60': isWin,
      })}
      style={{
        boxShadow: isWin
          ? '0 0 20px rgba(59, 130, 246, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)'
          : color === 'black'
            ? 'inset 0 2px 4px rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.4)'
            : 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
    />
  );
}
