import { describe, expect, it } from 'vitest';
import { clamp, easeOutCubic, integrate, mapRange, safeDelta, springStep } from './math';

describe('clamp / mapRange', () => {
  it('clamps at both ends', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('maps and clamps ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
    expect(mapRange(-1, 0, 10, 0, 100)).toBe(0);
    expect(mapRange(11, 0, 10, 0, 100)).toBe(100);
  });

  it('survives a zero-width input range', () => {
    expect(mapRange(5, 3, 3, 7, 9)).toBe(7);
  });
});

describe('easing', () => {
  it('is pinned at 0 and 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('is monotonic', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = easeOutCubic(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('integrate', () => {
  it('accumulates velocity then position', () => {
    const m = integrate({ value: 0, velocity: 0 }, 10, 1);
    expect(m.velocity).toBe(10);
    expect(m.value).toBe(10);
  });
});

describe('springStep', () => {
  it('settles at the target and stays there', () => {
    let m = { value: 100, velocity: 0 };
    for (let i = 0; i < 600; i++) m = springStep(m, 0, 1 / 60);
    expect(Math.abs(m.value)).toBeLessThan(0.01);
    expect(Math.abs(m.velocity)).toBeLessThan(0.01);
  });

  it('does not gain energy over a long run', () => {
    let m = { value: 50, velocity: 0 };
    let peak = 0;
    for (let i = 0; i < 2000; i++) {
      m = springStep(m, 0, 1 / 60);
      peak = Math.max(peak, Math.abs(m.value));
    }
    expect(peak).toBeLessThanOrEqual(50);
  });
});

describe('safeDelta', () => {
  it('caps a huge delta from a backgrounded tab', () => {
    expect(safeDelta(5000)).toBeCloseTo(1 / 30, 6);
  });

  it('never goes negative', () => {
    expect(safeDelta(-100)).toBe(0);
  });
});
