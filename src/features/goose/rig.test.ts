/**
 * Guards the rig's geometry against the failure mode that is easiest to ship by
 * accident: something drifting off the edge of the stage. Nothing here needs a
 * DOM — it all falls out of the config plus the pure curve maths.
 */

import { describe, expect, it } from 'vitest';
import { ANCHOR, MESSAGE, PHYSICS, REST, STAGE, TILE } from './config';
import { messageSlots } from './layout';
import { cubicPointAt, neckCurve } from './neck';
import { mapRange } from './math';

/** Samples the rig at `steps` points through the fall. */
function framesThroughFall(steps = 20) {
  const frames = [];
  for (let i = 0; i <= steps; i++) {
    const bodyY = REST.body.y + ((PHYSICS.floorY - REST.body.y) * i) / steps;
    const stretch = mapRange(bodyY, REST.body.y, PHYSICS.floorY, 0, 1);
    const headY = REST.head.y - 26 * stretch;
    frames.push({
      stretch,
      bodyAnchor: { x: REST.body.x + ANCHOR.bodyOffset.x, y: bodyY + ANCHOR.bodyOffset.y },
      headAnchor: { x: REST.head.x + ANCHOR.headOffset.x, y: headY + ANCHOR.headOffset.y },
    });
  }
  return frames;
}

describe('stage bounds', () => {
  it('keeps every letter tile fully on stage', () => {
    for (const slot of messageSlots(MESSAGE)) {
      expect(slot.x - TILE.size / 2).toBeGreaterThanOrEqual(0);
      expect(slot.x + TILE.size / 2).toBeLessThanOrEqual(STAGE.width);
      expect(slot.y - TILE.size / 2).toBeGreaterThanOrEqual(0);
      expect(slot.y + TILE.size / 2).toBeLessThanOrEqual(STAGE.height);
    }
  });

  it('does not overlap the tiles with the goose', () => {
    // The goose occupies roughly x < 190; tiles must start clear of it.
    const leftmost = Math.min(...messageSlots(MESSAGE).map((s) => s.x - TILE.size / 2));
    expect(leftmost).toBeGreaterThan(REST.body.x + 58);
  });

  it('keeps the whole neck on stage for the entire fall', () => {
    for (const frame of framesThroughFall()) {
      const curve = neckCurve(frame.bodyAnchor, frame.headAnchor, 1 - frame.stretch);
      for (let i = 0; i <= 20; i++) {
        const p = cubicPointAt(curve, i / 20);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(STAGE.width);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(STAGE.height);
      }
    }
  });

  it('leaves room below the landed body for the feet and the ripple', () => {
    expect(PHYSICS.floorY + 60).toBeLessThanOrEqual(STAGE.height);
  });
});

describe('fall dynamics', () => {
  it('takes long enough to fall that the animation reads as heavy', () => {
    // t = sqrt(2h/g), starting from rest. It also has to be long enough that
    // letting go part way down is a real choice.
    const h = PHYSICS.floorY - REST.body.y;
    const seconds = Math.sqrt((2 * h) / PHYSICS.gravity);
    expect(seconds).toBeGreaterThan(0.25);
    expect(seconds).toBeLessThan(1.5);
  });

  it('never lets the neck invert — the head stays above the body', () => {
    for (const frame of framesThroughFall()) {
      expect(frame.headAnchor.y).toBeLessThan(frame.bodyAnchor.y);
    }
  });
});
