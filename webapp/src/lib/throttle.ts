export function canClick(lastTimeMs: number, nowMs: number, thresholdMs = 250): boolean {
  return nowMs - lastTimeMs >= thresholdMs;
}

