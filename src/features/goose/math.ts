/**
 * Small, dependency-free math helpers for the goose rig.
 *
 * Everything here is a pure function so it can be unit tested without a DOM.
 * The animation loop calls these many times per frame; keep them cheap.
 */

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Maps `v` from [inMin, inMax] onto [outMin, outMax], clamped at both ends. */
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  if (inMax === inMin) return outMin;
  return lerp(outMin, outMax, clamp((v - inMin) / (inMax - inMin), 0, 1));
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export const easeInQuad = (t: number): number => {
  const c = clamp(t, 0, 1);
  return c * c;
};

export const easeOutBack = (t: number): number => {
  const c = clamp(t, 0, 1);
  const s = 1.70158;
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
};

export type Motion = { value: number; velocity: number };

/**
 * Semi-implicit Euler. Stable enough for our purposes and, unlike explicit
 * Euler, it does not quietly add energy to the system every frame.
 */
export function integrate(m: Motion, acceleration: number, dt: number): Motion {
  const velocity = m.velocity + acceleration * dt;
  return { value: m.value + velocity * dt, velocity };
}

/**
 * Critically-ish damped spring toward `target`. Used for the snap-back when
 * the user lets go of the neck half way through.
 *
 * `stiffness` and `damping` are in units of 1/s^2 and 1/s respectively.
 */
export function springStep(
  m: Motion,
  target: number,
  dt: number,
  stiffness = 180,
  damping = 22
): Motion {
  const force = (target - m.value) * stiffness - m.velocity * damping;
  return integrate(m, force, dt);
}

/**
 * Clamps a frame delta. Tab-switching produces multi-second deltas which would
 * otherwise teleport the goose through the floor.
 */
export const safeDelta = (ms: number): number => clamp(ms / 1000, 0, 1 / 30);
