import { useGameStore } from '../store/gameStore';
import { Button } from './ui/Button';
import { clsx } from 'clsx';

export function Header() {
  const { isDarkMode, toggleDarkMode, toggleSound, soundEnabled } = useGameStore();

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-bg-primary">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">五</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">五目並べオンライン</h1>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleSound}
              className={clsx(
                'btn-ghost p-2',
                soundEnabled ? 'text-accent' : 'text-text-secondary'
              )}
              aria-label={soundEnabled ? '音をオフ' : '音をオン'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </Button>

            <Button
              onClick={toggleDarkMode}
              className="btn-ghost p-2"
              aria-label={isDarkMode ? 'ライトモード' : 'ダークモード'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
