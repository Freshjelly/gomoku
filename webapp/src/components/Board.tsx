import { BoardCanvas } from './BoardCanvas';

/**
 * 碁盤コンポーネント
 * BoardCanvasを使用してCanvas描画+Pointer Eventsで交点判定
 */
export function Board() {
  return (
    <div className="card p-4 sm:p-6">
      <div className="flex flex-col items-center">
        {/* Canvas碁盤 */}
        <BoardCanvas />

        {/* 操作説明 */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm sm:text-base text-text-secondary font-medium">
            交点をクリック/タップして石を置く
          </p>
          <div className="flex items-center justify-center gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-black border-2 border-gray-600"></div>
              <span className="text-text-secondary">黒石</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-stone-white border-2 border-gray-400"></div>
              <span className="text-text-secondary">白石</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
