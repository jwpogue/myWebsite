/**
 * All the tunable numbers in one place. Everything is expressed in the SVG
 * user-space of STAGE, so the rig is resolution independent.
 */

export const STAGE = { width: 480, height: 580 } as const;

/** Rest positions (centres) of the two rigged parts. */
export const REST = {
  body: { x: 130, y: 236 },
  head: { x: 148, y: 116 },
} as const;

/** Letter tiles: geometry of the finished title. */
export const TILE = {
  size: 34,
  gap: 6,
  /** Left edge of the first tile of each word. */
  originX: 236,
  /** Baseline row for the first word; each subsequent word steps down. */
  originY: 108,
  rowStep: 48,
  /** Each word is nudged right a little, matching the sketch. */
  wordIndent: 26,
} as const;

/** Where the neck meets each part, as an offset from that part's centre. */
export const ANCHOR = {
  bodyOffset: { x: 4, y: -46 },
  headOffset: { x: -6, y: 26 },
} as const;

export const PHYSICS = {
  /** SVG units per second squared. Deliberately slow — the plan asks for a
   *  fall that reads as heavy rather than fast. */
  gravity: 620,
  /** Body y at which the landing sequence triggers. Kept high enough that the
   *  feet and the ripple land inside a typical laptop viewport. */
  floorY: 470,
  snapStiffness: 210,
  snapDamping: 24,
} as const;

export const TIMING = {
  /** Seconds for the ripple to expand and fade. */
  ripple: 0.7,
  /** Seconds each letter tile takes to travel the length of the neck. */
  ascentPerTile: 0.85,
  /** Stagger between consecutive tiles entering the neck. */
  ascentStagger: 0.16,
  /** Seconds for a tile to arc out of the beak into its final slot. */
  eject: 0.62,
  /** Seconds the beak spends opening before a tile pops out, and closing after. */
  beakOpen: 0.1,
  beakClose: 0.08,
  /** Seconds for the head to relax back from its strained tilt once finished. */
  relax: 0.8,
  /** Seconds the "phew" floats before it has faded out. */
  phew: 1.8,
  /** Gap between consecutive tiles dropping off when the goose is replayed. */
  tumbleStagger: 0.05,
  /** Longest the replay clear-out may take before the goose resets anyway. */
  clearing: 1.8,
} as const;

export const MESSAGE = 'REY POGUE';
