import { describe, it, expect } from 'vitest';
import { canClick } from '../lib/throttle';

describe('click throttle (250ms)', () => {
  it('blocks clicks within threshold', () => {
    const t0 = 1000;
    expect(canClick(t0, t0 + 100, 250)).toBe(false);
    expect(canClick(t0, t0 + 249, 250)).toBe(false);
  });

  it('allows clicks at or beyond threshold', () => {
    const t0 = 1000;
    expect(canClick(t0, t0 + 250, 250)).toBe(true);
    expect(canClick(t0, t0 + 500, 250)).toBe(true);
  });
});

