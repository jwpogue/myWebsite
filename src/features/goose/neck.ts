/**
 * The neck is not artwork. It is a cubic Bezier regenerated every frame from
 * wherever the head and body currently are.
 *
 * We do the Bezier maths by hand rather than leaning on SVGGeometryElement's
 * `getPointAtLength`, for two reasons:
 *   1. jsdom does not implement it, so it would be untestable.
 *   2. We want the tangent angle too, which the DOM API does not give us.
 */

import { lerp } from './math';

export type Pt = { x: number; y: number };

/** [start, control1, control2, end] — start is at the body, end is at the head. */
export type Cubic = readonly [Pt, Pt, Pt, Pt];

/**
 * Builds the neck curve.
 *
 * `slack` runs 0 → 1, where 0 is fully taut (a straight line, goose in
 * distress) and 1 is the resting S-bend of a goose minding its own business.
 */
export function neckCurve(bodyAnchor: Pt, headAnchor: Pt, slack: number): Cubic {
  const dx = headAnchor.x - bodyAnchor.x;
  const dy = headAnchor.y - bodyAnchor.y;
  const length = Math.hypot(dx, dy) || 1;

  // The resting S-bend: control points bow out to opposite sides.
  const bow = slack * Math.min(length * 0.35, 46);

  // Control points sit at exactly 1/3 and 2/3 along the chord. That matters:
  // at slack 0 it makes the curve not just straight but *uniformly
  // parameterised*, so letter tiles travel at a constant speed instead of
  // bunching up near the ends.
  return [
    bodyAnchor,
    { x: bodyAnchor.x + bow, y: lerp(bodyAnchor.y, headAnchor.y, 1 / 3) },
    { x: headAnchor.x - bow * 0.6, y: lerp(bodyAnchor.y, headAnchor.y, 2 / 3) },
    headAnchor,
  ];
}

/** De Casteljau evaluation at parameter t ∈ [0, 1]. */
export function cubicPointAt(c: Cubic, t: number): Pt {
  const [p0, p1, p2, p3] = c;
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;

  return {
    x: a * p0.x + b * p1.x + d * p2.x + e * p3.x,
    y: a * p0.y + b * p1.y + d * p2.y + e * p3.y,
  };
}

/** Tangent direction at t, in radians. Used to orient the letter tiles. */
export function cubicAngleAt(c: Cubic, t: number): number {
  const [p0, p1, p2, p3] = c;
  const u = 1 - t;
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return Math.atan2(dy, dx);
}

/**
 * Approximate arc length by flat sampling. Good enough to keep tiles moving at
 * a roughly constant speed rather than bunching up in the curves.
 */
export function cubicLength(c: Cubic, samples = 24): number {
  let total = 0;
  let prev = cubicPointAt(c, 0);
  for (let i = 1; i <= samples; i++) {
    const next = cubicPointAt(c, i / samples);
    total += Math.hypot(next.x - prev.x, next.y - prev.y);
    prev = next;
  }
  return total;
}

export function cubicToPath(c: Cubic): string {
  const [p0, p1, p2, p3] = c;
  const n = (v: number) => Math.round(v * 100) / 100;
  return `M ${n(p0.x)} ${n(p0.y)} C ${n(p1.x)} ${n(p1.y)}, ${n(p2.x)} ${n(p2.y)}, ${n(p3.x)} ${n(p3.y)}`;
}
