// Accessibility utilities
export function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Keyboard navigation helpers
export function getNextCellPosition(
  currentX: number,
  currentY: number,
  direction: 'up' | 'down' | 'left' | 'right'
): [number, number] {
  switch (direction) {
    case 'up':
      return [currentX, Math.max(0, currentY - 1)];
    case 'down':
      return [currentX, Math.min(14, currentY + 1)];
    case 'left':
      return [Math.max(0, currentX - 1), currentY];
    case 'right':
      return [Math.min(14, currentX + 1), currentY];
  }
}

// Coordinate conversion
export function coordinatesToLabel(x: number, y: number): string {
  const xLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
  return `${xLabels[x]}${y + 1}`;
}

export function labelToCoordinates(label: string): [number, number] | null {
  const xLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

  if (label.length < 2) return null;

  const xLabel = label[0].toUpperCase();
  const yLabel = label.slice(1);

  const x = xLabels.indexOf(xLabel);
  const y = parseInt(yLabel, 10) - 1;

  if (x === -1 || y < 0 || y > 14) return null;

  return [x, y];
}
