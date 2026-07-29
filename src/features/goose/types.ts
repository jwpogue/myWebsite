export type Phase =
  /** Waiting to be bothered. */
  | 'idle'
  /** Head was clicked — a short, self-resolving reaction. */
  | 'patting'
  /** Body was clicked — ditto, but grumpier. */
  | 'tickling'
  /** Neck is held; body position is driven by the pointer. */
  | 'grabbed'
  /** Released past the commit point; gravity owns the body now. */
  | 'falling'
  /** Released before the commit point; spring pulls everything home. */
  | 'snapping'
  /** Body has hit the floor; ripple plays. */
  | 'landing'
  /** Letters travel up the neck and arc out of the beak. */
  | 'delivering'
  /** Name is spelled out; goose is pleased with itself. */
  | 'done';

export type TileState = 'waiting' | 'ascending' | 'ejecting' | 'placed';

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
};
