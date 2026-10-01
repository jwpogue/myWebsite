export type Phase =
  /** Waiting to be bothered. */
  | 'idle'
  /** Head was clicked — a short, self-resolving reaction. */
  | 'patting'
  /** Body was clicked — ditto, but grumpier. */
  | 'tickling'
  /** Neck is held; gravity pulls the body down. */
  | 'grabbed'
  /** Let go before the body reached the floor; spring pulls everything home. */
  | 'snapping'
  /** Body has hit the floor; ripple plays. */
  | 'landing'
  /** Letters travel up the neck and arc out of the beak. */
  | 'delivering'
  /** Name is spelled out; goose is pleased with itself. */
  | 'done'
  /** Replay was pressed: tiles tumble away while the goose springs back up. */
  | 'clearing';

export type TileState = 'waiting' | 'ascending' | 'ejecting' | 'placed' | 'tumbling';

/** Free flight for a tile knocked off its slot by a replay. */
export type Tumble = {
  /** Seconds to wait before letting go, so the tiles don't all drop at once. */
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Degrees, and degrees per second. */
  angle: number;
  spin: number;
};

export type Tile = {
  char: string;
  /** Index in the message, used for stagger and for the final slot. */
  index: number;
  state: TileState;
  /** 0 → 1 along the neck curve. */
  progress: number;
  /** Seconds elapsed since ejection began. */
  ejectElapsed: number;
  /** Where it launched from, in stage coordinates. */
  from: { x: number; y: number };
  /** Its slot in the finished title. */
  to: { x: number; y: number };
  /** Degrees of spin applied over the arc. */
  spin: number;
  tumble: Tumble;
};
