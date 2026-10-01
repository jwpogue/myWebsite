/**
 * PLACEHOLDER ARTWORK.
 *
 * These are deliberately crude stand-ins with the correct rig contract:
 * every part is drawn around its own local origin (0, 0) and is positioned
 * solely by the transform its parent applies. Swapping in real artwork means
 * replacing the paths inside these two components and nothing else.
 *
 * See docs/ART-ASSETS.md for the exact spec the final art must satisfy.
 */

import type { BeakParts } from './beak';

export type Expression = 'idle' | 'happy' | 'relieved' | 'annoyed' | 'alarmed';

const INK = 'var(--goose-ink)';
const FILL = 'var(--goose-fill)';
const BEAK = 'var(--goose-beak)';

const stroke = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/* ------------------------------------------------------------------ head -- */

export function GooseHead({
  expression,
  beak,
}: {
  expression: Expression;
  beak?: { current: BeakParts };
}) {
  return (
    <g>
      {/* skull */}
      <ellipse cx={0} cy={0} rx={22} ry={20} fill={FILL} {...stroke} />

      {/* beak — points +x, i.e. the goose faces right. Mouth first so the
          jaws cover its edges. */}
      <path
        ref={(node) => {
          if (beak) beak.current.mouth = node;
        }}
        d="M 18 1.5 L 42 -10 L 41 14.5 Z"
        fill="var(--goose-mouth)"
        transform="scale(1 0)"
      />
      <path
        ref={(node) => {
          if (beak) beak.current.lower = node;
        }}
        d="M 18 1.5 L 44 0 L 18 7 Z"
        fill={BEAK}
        {...stroke}
        strokeWidth={2.5}
      />
      <path
        ref={(node) => {
          if (beak) beak.current.upper = node;
        }}
        d="M 18 -4 L 44 0 L 18 1.5 Z"
        fill={BEAK}
        {...stroke}
        strokeWidth={2.5}
      />

      {/* eye */}
      <Eye expression={expression} />

      {/* alarm marks */}
      {expression === 'alarmed' && (
        <g stroke={INK} strokeWidth={2.5} strokeLinecap="round">
          <line x1={-14} y1={-24} x2={-18} y2={-32} />
          <line x1={-4} y1={-27} x2={-4} y2={-36} />
          <line x1={6} y1={-24} x2={10} y2={-32} />
        </g>
      )}

      {/* relief: a flushed cheek and one last bead of sweat */}
      {expression === 'relieved' && (
        <g>
          <ellipse cx={6} cy={7} rx={6} ry={3.4} fill="var(--goose-blush)" />
          <g transform="translate(-20 -14) rotate(-20) scale(0.8)">
            <SweatDrop />
          </g>
        </g>
      )}
    </g>
  );
}

function Eye({ expression }: { expression: Expression }) {
  switch (expression) {
    case 'relieved':
      // eyes gently closed, drooping with relief
      return (
        <path
          d="M 1 -6 q 7 6 15 1"
          fill="none"
          stroke={INK}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      );
    case 'happy':
      // closed, contented arc
      return (
        <path
          d="M 2 -5 q 6 6 12 0"
          fill="none"
          stroke={INK}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      );
    case 'annoyed':
      return (
        <g>
          <circle cx={8} cy={-4} r={2.6} fill={INK} />
          <path
            d="M 1 -11 L 15 -8"
            fill="none"
            stroke={INK}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        </g>
      );
    case 'alarmed':
      return (
        <g>
          <circle cx={8} cy={-5} r={5.4} fill={FILL} stroke={INK} strokeWidth={2.2} />
          <circle cx={8} cy={-5} r={2.4} fill={INK} />
        </g>
      );
    case 'idle':
    default:
      return <circle cx={8} cy={-5} r={2.8} fill={INK} />;
  }
}

/* ------------------------------------------------------------------ body -- */

export function GooseBody({ expression }: { expression: Expression }) {
  return (
    <g>
      {/* legs — drawn first so they sit behind the body mass */}
      <g fill={BEAK} {...stroke} strokeWidth={2.5}>
        <path d="M -14 34 L -14 52 L -26 60 L -2 60 L -10 52 L -10 34 Z" />
        <path d="M 12 34 L 12 52 L 0 60 L 24 60 L 16 52 L 16 34 Z" />
      </g>

      {/* body mass */}
      <ellipse cx={0} cy={0} rx={52} ry={44} fill={FILL} {...stroke} />

      {/* tail */}
      <path d="M -50 -12 q -16 4 -22 14 q 14 2 22 -2" fill={FILL} {...stroke} strokeWidth={2.5} />

      {/* wing */}
      <path
        d="M -30 -6 q 18 -14 40 -4 q -16 18 -40 12 Z"
        fill="none"
        stroke={INK}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M 4 4 q 5 6 10 0" fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />

      {expression === 'annoyed' && (
        <text x={44} y={-34} fontSize={20} fill={INK} fontFamily="var(--font-hand)">
          !
        </text>
      )}
    </g>
  );
}

/* ---------------------------------------------------------------- extras -- */

/** A single sweat droplet, drawn around its own origin. */
export function SweatDrop() {
  return (
    <path
      d="M 0 -7 q 5 6 5 9 a 5 5 0 0 1 -10 0 q 0 -3 5 -9 Z"
      fill="var(--goose-sweat)"
      stroke={INK}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  );
}
