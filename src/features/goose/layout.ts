import { TILE } from './config';

export type Slot = { char: string; index: number; x: number; y: number };

/**
 * Works out where each letter of the message ends up. Words are laid out on
 * their own rows, each indented a little further than the last — which is what
 * the storyboard does, and it stops long names from running off the stage.
 *
 * Spaces are not given tiles, so `MESSAGE = 'REY POGUE'` yields eight of them.
 */
export function messageSlots(message: string): Slot[] {
  const words = message.split(/\s+/).filter(Boolean);
  const slots: Slot[] = [];
  let index = 0;

  words.forEach((word, row) => {
    const x0 = TILE.originX + row * TILE.wordIndent;
    const y = TILE.originY + row * TILE.rowStep;

    for (const char of word) {
      slots.push({
        char,
        index,
        x: x0 + index0(slots, row) * (TILE.size + TILE.gap),
        y,
      });
      index += 1;
    }
  });

  return slots;

  /** How many tiles are already on this row. */
  function index0(existing: Slot[], row: number): number {
    const rowY = TILE.originY + row * TILE.rowStep;
    return existing.filter((s) => s.y === rowY).length;
  }
}
