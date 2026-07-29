import { describe, expect, it } from 'vitest';
import { messageSlots } from './layout';

describe('messageSlots', () => {
  it('gives "REY POGUE" eight tiles, matching the storyboard', () => {
    expect(messageSlots('REY POGUE')).toHaveLength(8);
  });

  it('skips whitespace and indexes contiguously', () => {
    const slots = messageSlots('A B');
    expect(slots.map((s) => s.char)).toEqual(['A', 'B']);
    expect(slots.map((s) => s.index)).toEqual([0, 1]);
  });

  it('puts each word on its own row', () => {
    const slots = messageSlots('REY POGUE');
    const rows = new Set(slots.map((s) => s.y));
    expect(rows.size).toBe(2);
  });

  it('spaces tiles evenly left to right within a word', () => {
    const slots = messageSlots('POGUE');
    const gaps = slots.slice(1).map((s, i) => s.x - slots[i]!.x);
    expect(new Set(gaps).size).toBe(1);
  });

  it('handles an arbitrary message length', () => {
    expect(messageSlots('HELLO THERE FRIEND')).toHaveLength(16);
  });

  it('handles an empty message without exploding', () => {
    expect(messageSlots('   ')).toEqual([]);
  });
});
