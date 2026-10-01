/**
 * The beak's hinge, kept apart from the artwork so the animation loop can
 * drive it. If the head art changes, these numbers move with it.
 */

/** Where the two halves of the beak meet the face, in head-local space. */
const BEAK_HINGE = { x: 18, y: 1.5 } as const;
/** Degrees each half swings at full gape. */
const UPPER_SWING = 26;
const LOWER_SWING = 30;

/** The middle of the open mouth, in head-local space — tiles launch from here. */
export const BEAK_MOUTH = { x: 40, y: 2 } as const;

/** The animated parts of the beak, filled in by ref callbacks. */
export type BeakParts = {
  upper: SVGPathElement | null;
  lower: SVGPathElement | null;
  mouth: SVGPathElement | null;
};

/**
 * Opens the beak by `open` ∈ [0, 1]. Driven imperatively from the animation
 * loop, so React never re-renders for it.
 */
export function setBeakOpen(parts: BeakParts, open: number): void {
  const { x, y } = BEAK_HINGE;
  parts.upper?.setAttribute('transform', `rotate(${-UPPER_SWING * open} ${x} ${y})`);
  parts.lower?.setAttribute('transform', `rotate(${LOWER_SWING * open} ${x} ${y})`);
  // The mouth interior is a wedge that unfolds from the hinge with the jaws.
  parts.mouth?.setAttribute(
    'transform',
    `translate(${x} ${y}) scale(1 ${open}) translate(${-x} ${-y})`
  );
}
