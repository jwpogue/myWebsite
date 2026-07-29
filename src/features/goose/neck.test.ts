import { describe, expect, it } from 'vitest';
import { cubicAngleAt, cubicLength, cubicPointAt, cubicToPath, neckCurve } from './neck';

const body = { x: 100, y: 300 };
const head = { x: 100, y: 100 };

describe('neckCurve', () => {
  it('starts at the body and ends at the head', () => {
    const c = neckCurve(body, head, 1);
    expect(cubicPointAt(c, 0)).toEqual(body);
    expect(cubicPointAt(c, 1)).toEqual(head);
  });

  it('is a straight line when fully taut', () => {
    const c = neckCurve(body, head, 0);
    const mid = cubicPointAt(c, 0.5);
    expect(mid.x).toBeCloseTo(100, 5);
    expect(mid.y).toBeCloseTo(200, 5);
  });

  it('parameterises a taut neck uniformly, so tiles travel at constant speed', () => {
    const c = neckCurve(body, head, 0);
    const steps = 10;
    const gaps: number[] = [];
    for (let i = 1; i <= steps; i++) {
      const a = cubicPointAt(c, (i - 1) / steps);
      const b = cubicPointAt(c, i / steps);
      gaps.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0]!, 5);
  });

  it('bows away from the straight line when slack', () => {
    const slackMid = cubicPointAt(neckCurve(body, head, 1), 0.5);
    expect(Math.abs(slackMid.x - 100)).toBeGreaterThan(5);
  });

  it('is never shorter than the straight-line distance', () => {
    const straight = Math.hypot(head.x - body.x, head.y - body.y);
    for (const slack of [0, 0.25, 0.5, 0.75, 1]) {
      expect(cubicLength(neckCurve(body, head, slack))).toBeGreaterThanOrEqual(straight - 0.01);
    }
  });

  it('lengthens monotonically as slack increases', () => {
    const lengths = [0, 0.25, 0.5, 0.75, 1].map((s) => cubicLength(neckCurve(body, head, s)));
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]!).toBeGreaterThan(lengths[i - 1]!);
    }
  });
});

describe('cubicAngleAt', () => {
  it('points from the body toward the head on a taut neck', () => {
    const c = neckCurve(body, head, 0);
    // Straight up in SVG coordinates is -pi/2.
    expect(cubicAngleAt(c, 0.5)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it('returns a finite angle at both endpoints', () => {
    const c = neckCurve(body, head, 1);
    expect(Number.isFinite(cubicAngleAt(c, 0))).toBe(true);
    expect(Number.isFinite(cubicAngleAt(c, 1))).toBe(true);
  });
});

describe('cubicToPath', () => {
  it('emits a single move-and-curve command', () => {
    const d = cubicToPath(neckCurve(body, head, 0.5));
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+ C /);
    expect(d.match(/C/g)).toHaveLength(1);
  });

  it('never emits NaN, even for a degenerate neck', () => {
    const d = cubicToPath(neckCurve(body, body, 1));
    expect(d).not.toContain('NaN');
  });
});
