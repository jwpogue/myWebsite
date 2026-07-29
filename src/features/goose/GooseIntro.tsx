import { useEffect, useRef, useState } from 'react';
import { GooseBody, GooseHead, SweatDrop, type Expression } from './GooseArt';
import { ANCHOR, MESSAGE, PHYSICS, REST, STAGE, TILE, TIMING } from './config';
import { messageSlots } from './layout';
import { cubicAngleAt, cubicPointAt, cubicToPath, neckCurve, type Pt } from './neck';
import {
  clamp,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  mapRange,
  safeDelta,
  springStep,
  type Motion,
} from './math';
import type { Phase, Tile } from './types';
import styles from './GooseIntro.module.css';

const NECK_WIDTH = 17;
const SWEAT_COUNT = 3;

type Sim = {
  phase: Phase;
  /** Seconds spent in the current phase. */
  clock: number;
  body: Motion;
  head: Motion;
  /** Horizontal nudge, used by the tickle reaction. */
  bodyNudge: Motion;
  /** Vertical nudge of the head, used by the pat reaction. */
  headNudge: Motion;
  pointerId: number | null;
  /** Distance between the pointer and the body centre when the grab began. */
  grabOffset: number;
  tiles: Tile[];
};

function initialSim(): Sim {
  return {
    phase: 'idle',
    clock: 0,
    body: { value: REST.body.y, velocity: 0 },
    head: { value: REST.head.y, velocity: 0 },
    bodyNudge: { value: 0, velocity: 0 },
    headNudge: { value: 0, velocity: 0 },
    pointerId: null,
    grabOffset: 0,
    tiles: messageSlots(MESSAGE).map((slot) => ({
      char: slot.char,
      index: slot.index,
      state: 'waiting',
      progress: 0,
      ejectElapsed: 0,
      from: { x: 0, y: 0 },
      to: { x: slot.x, y: slot.y },
      spin: (slot.index % 2 === 0 ? 1 : -1) * (240 + slot.index * 40),
    })),
  };
}

export type GooseIntroProps = {
  /** Fired once the last letter lands. */
  onComplete?: () => void;
};

export function GooseIntro({ onComplete }: GooseIntroProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const neckRef = useRef<SVGPathElement | null>(null);
  const neckFillRef = useRef<SVGPathElement | null>(null);
  const bulgeRefs = useRef<(SVGGElement | null)[]>([]);
  const tileRefs = useRef<(SVGGElement | null)[]>([]);
  const sweatRefs = useRef<(SVGGElement | null)[]>([]);
  const rippleRef = useRef<SVGCircleElement | null>(null);
  const promptRef = useRef<SVGGElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef<Sim>(initialSim());
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  // Mirrored into React only when it changes — expressions and copy are
  // declarative, positions are not.
  const [phase, setPhase] = useState<Phase>('idle');
  const [grip, setGrip] = useState<'open' | 'poke' | 'fist'>('open');
  const [pointerFine, setPointerFine] = useState(true);

  useEffect(() => {
    setPointerFine(window.matchMedia('(pointer: fine)').matches);
  }, []);

  /* ------------------------------------------------------------- the loop -- */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const setPhaseIfChanged = (next: Phase) => {
      const sim = simRef.current;
      if (sim.phase === next) return;
      sim.phase = next;
      sim.clock = 0;
      setPhase(next);
    };

    const tick = (now: number) => {
      const dt = safeDelta(now - last);
      last = now;

      const sim = simRef.current;
      sim.clock += dt;

      step(sim, dt, setPhaseIfChanged, completeRef);
      draw(sim);

      raf = requestAnimationFrame(tick);
    };

    /* ---------------------------------------------------------- rendering -- */

    const draw = (sim: Sim) => {
      const stretch = mapRange(sim.body.value, REST.body.y, PHYSICS.floorY, 0, 1);

      // Body hangs, then rights itself once it has landed.
      const settled = sim.phase === 'landing' || sim.phase === 'delivering' || sim.phase === 'done';
      const bodyTilt = settled ? 0 : stretch * -9;
      const bodyX = REST.body.x + sim.bodyNudge.value;
      const bodyY = sim.body.value;
      const headX = REST.head.x;
      const headY = sim.head.value + sim.headNudge.value;
      // Head tips back as the neck goes taut.
      const headTilt = -stretch * 26;

      bodyRef.current?.setAttribute(
        'transform',
        `translate(${bodyX} ${bodyY}) rotate(${bodyTilt})`
      );
      headRef.current?.setAttribute(
        'transform',
        `translate(${headX} ${headY}) rotate(${headTilt})`
      );

      const bodyAnchor: Pt = { x: bodyX + ANCHOR.bodyOffset.x, y: bodyY + ANCHOR.bodyOffset.y };
      const headAnchor: Pt = { x: headX + ANCHOR.headOffset.x, y: headY + ANCHOR.headOffset.y };
      const curve = neckCurve(bodyAnchor, headAnchor, 1 - stretch);

      const d = cubicToPath(curve);
      const width = NECK_WIDTH - stretch * 3;
      // The neck thins a little as it is stretched — conservation of goose.
      neckRef.current?.setAttribute('d', d);
      neckRef.current?.setAttribute('stroke-width', String(width));
      neckFillRef.current?.setAttribute('d', d);
      neckFillRef.current?.setAttribute('stroke-width', String(width - 6));

      // Letter tiles, either bulging inside the neck or out in the open.
      for (const tile of sim.tiles) {
        const bulge = bulgeRefs.current[tile.index];
        const chip = tileRefs.current[tile.index];

        if (tile.state === 'ascending') {
          const p = cubicPointAt(curve, tile.progress);
          const deg = (cubicAngleAt(curve, tile.progress) * 180) / Math.PI;
          bulge?.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${deg})`);
          bulge?.setAttribute('opacity', '1');
          chip?.setAttribute('opacity', '0');
        } else if (tile.state === 'ejecting' || tile.state === 'placed') {
          bulge?.setAttribute('opacity', '0');

          const t = clamp(tile.ejectElapsed / TIMING.eject, 0, 1);
          const e = easeOutCubic(t);
          const x = tile.from.x + (tile.to.x - tile.from.x) * e;
          const y = tile.from.y + (tile.to.y - tile.from.y) * e;
          // Parabolic lift so it reads as a toss rather than a slide.
          const arc = -Math.sin(t * Math.PI) * 70;
          const spin = tile.spin * (1 - easeOutBack(t));
          const scale = 0.7 + 0.3 * easeOutBack(t);

          chip?.setAttribute(
            'transform',
            `translate(${x} ${y + arc}) rotate(${spin}) scale(${scale})`
          );
          chip?.setAttribute('opacity', '1');
        } else {
          bulge?.setAttribute('opacity', '0');
          chip?.setAttribute('opacity', '0');
        }
      }

      // Sweat: only while the neck is under real tension.
      const sweating = stretch > 0.25 && (sim.phase === 'grabbed' || sim.phase === 'falling');
      for (let i = 0; i < SWEAT_COUNT; i++) {
        const node = sweatRefs.current[i];
        if (!node) continue;
        if (!sweating) {
          node.setAttribute('opacity', '0');
          continue;
        }
        const cycle = (sim.clock * 1.5 + i / SWEAT_COUNT) % 1;
        const spread = [-26, 0, 26][i] ?? 0;
        node.setAttribute(
          'transform',
          `translate(${headX + spread} ${headY - 26 - cycle * 26}) scale(${1 - cycle * 0.35})`
        );
        node.setAttribute('opacity', String((1 - cycle) * stretch));
      }

      // Landing ripple.
      if (rippleRef.current) {
        if (sim.phase === 'landing') {
          const t = clamp(sim.clock / TIMING.ripple, 0, 1);
          rippleRef.current.setAttribute('cx', String(bodyX));
          rippleRef.current.setAttribute('cy', String(bodyY + 58));
          rippleRef.current.setAttribute('r', String(20 + t * 130));
          rippleRef.current.setAttribute('opacity', String((1 - t) * 0.65));
        } else {
          rippleRef.current.setAttribute('opacity', '0');
        }
      }

      promptRef.current?.setAttribute('opacity', sim.phase === 'idle' ? '1' : '0');
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------------------------------------------------------- interaction -- */

  const toStage = (event: React.PointerEvent): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    // The viewBox uses xMidYMid meet, so both axes share one scale factor.
    const scale = Math.min(rect.width / STAGE.width, rect.height / STAGE.height);
    const offsetX = (rect.width - STAGE.width * scale) / 2;
    const offsetY = (rect.height - STAGE.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  };

  const grabNeck = (event: React.PointerEvent<SVGElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'idle' && sim.phase !== 'snapping') return;
    const p = toStage(event);
    if (!p) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    sim.pointerId = event.pointerId;
    sim.grabOffset = sim.body.value - p.y;
    sim.phase = 'grabbed';
    sim.clock = 0;
    setPhase('grabbed');
    setGrip('fist');
  };

  const dragNeck = (event: React.PointerEvent<SVGElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'grabbed' || sim.pointerId !== event.pointerId) return;
    const p = toStage(event);
    if (!p) return;
    const next = clamp(p.y + sim.grabOffset, REST.body.y, PHYSICS.floorY);
    sim.body.velocity = (next - sim.body.value) / (1 / 60);
    sim.body.value = next;
  };

  const releaseNeck = (event: React.PointerEvent<SVGElement>) => {
    const sim = simRef.current;
    if (sim.phase !== 'grabbed' || sim.pointerId !== event.pointerId) return;
    sim.pointerId = null;
    setGrip('open');

    if (sim.body.value >= PHYSICS.commitY) {
      sim.phase = 'falling';
      setPhase('falling');
    } else {
      sim.phase = 'snapping';
      setPhase('snapping');
    }
    sim.clock = 0;
  };

  const poke = (which: 'head' | 'body') => () => {
    const sim = simRef.current;
    if (sim.phase !== 'idle') return;
    if (which === 'head') {
      sim.headNudge.velocity = 90;
      sim.phase = 'patting';
    } else {
      sim.bodyNudge.velocity = -170;
      sim.phase = 'tickling';
    }
    sim.clock = 0;
    setPhase(sim.phase);
  };

  /** Jump straight to the finished state — for the impatient and the reduced. */
  const skip = () => {
    const sim = simRef.current;
    sim.body.value = PHYSICS.floorY;
    sim.body.velocity = 0;
    sim.head.value = REST.head.y - 26;
    for (const tile of sim.tiles) {
      tile.state = 'placed';
      tile.progress = 1;
      tile.ejectElapsed = TIMING.eject;
      tile.from = { ...tile.to };
    }
    sim.phase = 'done';
    sim.clock = 0;
    setPhase('done');
    completeRef.current?.();
  };

  /* ------------------------------------------------------------- cursor -- */

  useEffect(() => {
    if (!pointerFine) return;
    const move = (e: PointerEvent) => {
      handRef.current?.style.setProperty(
        'transform',
        `translate(${e.clientX - 14}px, ${e.clientY - 8}px)`
      );
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [pointerFine]);

  const expression = expressionFor(phase);
  const slots = messageSlots(MESSAGE);

  return (
    <div className={`${styles.stage} ${pointerFine ? styles.stageHidesCursor : ''}`}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="A cartoon goose. Grab its neck and pull to reveal the name Rey Pogue."
      >
        <circle
          ref={rippleRef}
          cx={REST.body.x}
          cy={PHYSICS.floorY}
          r={20}
          fill="none"
          stroke="var(--goose-ink)"
          strokeWidth={3}
          opacity={0}
        />

        {/* Neck, drawn under both head and body so the joins are hidden. */}
        <path
          ref={neckRef}
          d=""
          fill="none"
          stroke="var(--goose-ink)"
          strokeWidth={NECK_WIDTH}
          strokeLinecap="round"
        />
        {/* Inner fill, drawn over the outline stroke to hollow the neck out. */}
        <path
          ref={neckFillRef}
          d=""
          fill="none"
          stroke="var(--goose-fill)"
          strokeWidth={NECK_WIDTH - 6}
          strokeLinecap="round"
        />

        {/* Letter tiles bulging through the neck. */}
        {slots.map((slot) => (
          <g
            key={`bulge-${slot.index}`}
            opacity={0}
            ref={(node) => {
              bulgeRefs.current[slot.index] = node;
            }}
          >
            <rect
              x={-13}
              y={-13}
              width={26}
              height={26}
              rx={5}
              fill="var(--goose-fill)"
              stroke="var(--goose-ink)"
              strokeWidth={3}
            />
          </g>
        ))}

        <g ref={bodyRef}>
          <GooseBody expression={expression} />
        </g>

        <g ref={headRef}>
          <GooseHead expression={expression} />
        </g>

        {Array.from({ length: SWEAT_COUNT }, (_, i) => (
          <g
            key={`sweat-${i}`}
            opacity={0}
            ref={(node) => {
              sweatRefs.current[i] = node;
            }}
          >
            <SweatDrop />
          </g>
        ))}

        {/* Finished letter tiles. */}
        {slots.map((slot) => (
          <g
            key={`tile-${slot.index}`}
            opacity={0}
            ref={(node) => {
              tileRefs.current[slot.index] = node;
            }}
          >
            <rect
              x={-TILE.size / 2}
              y={-TILE.size / 2}
              width={TILE.size}
              height={TILE.size}
              rx={5}
              fill="var(--goose-fill)"
              stroke="var(--goose-ink)"
              strokeWidth={3}
            />
            <text className={styles.tileText} textAnchor="middle" dominantBaseline="central">
              {slot.char}
            </text>
          </g>
        ))}

        {/* "Grab here!" prompt. */}
        <g ref={promptRef}>
          <text className={styles.grabHere} x={236} y={150}>
            Grab here!
          </text>
          <path
            d="M 232 158 q -40 14 -66 -12"
            fill="none"
            stroke="var(--goose-ink)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <path d="M 166 146 l 0 12 l 11 -4 Z" fill="var(--goose-ink)" />
        </g>

        {/* Hit zones, last so they sit on top of everything. */}
        <rect
          className={styles.hitZone}
          x={REST.head.x - 34}
          y={REST.head.y - 30}
          width={80}
          height={58}
          onPointerDown={poke('head')}
          onPointerEnter={() => setGrip('open')}
        />
        <ellipse
          className={styles.hitZone}
          cx={REST.body.x}
          cy={REST.body.y}
          rx={58}
          ry={50}
          onPointerDown={poke('body')}
          onPointerEnter={() => setGrip('poke')}
        />
        <rect
          className={styles.hitZone}
          x={REST.head.x - 26}
          y={REST.head.y + 24}
          width={52}
          height={REST.body.y - REST.head.y - 60}
          style={{ pointerEvents: 'all' }}
          onPointerDown={grabNeck}
          onPointerMove={dragNeck}
          onPointerUp={releaseNeck}
          onPointerCancel={releaseNeck}
          onPointerEnter={() => setGrip('fist')}
          onPointerLeave={() => simRef.current.phase !== 'grabbed' && setGrip('open')}
        />
      </svg>

      <div className={styles.controls}>
        {phase !== 'done' && (
          <button type="button" className={styles.skip} onClick={skip}>
            Skip the goose
          </button>
        )}
      </div>

      {pointerFine && (
        <div
          ref={handRef}
          className={`${styles.hand} ${phase === 'idle' ? styles.handIdle : ''}`}
          aria-hidden="true"
        >
          <HandCursor grip={grip} />
        </div>
      )}
    </div>
  );
}

/* ================================================================ update == */

/**
 * One simulation step. Kept outside the component so it stays a plain
 * function of (state, dt) and can be reasoned about — and tested — on its own.
 */
function step(
  sim: Sim,
  dt: number,
  setPhase: (p: Phase) => void,
  onComplete: { current?: (() => void) | undefined }
): void {
  // Reaction nudges always spring back to zero, whatever else is happening.
  sim.bodyNudge = springStep(sim.bodyNudge, 0, dt, 150, 14);
  sim.headNudge = springStep(sim.headNudge, 0, dt, 220, 18);

  switch (sim.phase) {
    case 'patting':
    case 'tickling':
      if (sim.clock > 1.1) setPhase('idle');
      break;

    case 'grabbed':
      // The head is pulled upward as the body descends.
      sim.head.value = REST.head.y - 26 * easeInQuad(stretchOf(sim));
      if (sim.body.value >= PHYSICS.floorY) setPhase('landing');
      break;

    case 'falling': {
      sim.body.velocity += PHYSICS.gravity * dt;
      sim.body.value += sim.body.velocity * dt;
      sim.head.value = REST.head.y - 26 * easeInQuad(stretchOf(sim));
      if (sim.body.value >= PHYSICS.floorY) {
        sim.body.value = PHYSICS.floorY;
        sim.body.velocity = 0;
        setPhase('landing');
      }
      break;
    }

    case 'snapping': {
      sim.body = springStep(sim.body, REST.body.y, dt, PHYSICS.snapStiffness, PHYSICS.snapDamping);
      sim.head = springStep(sim.head, REST.head.y, dt, PHYSICS.snapStiffness, PHYSICS.snapDamping);
      const settled =
        Math.abs(sim.body.value - REST.body.y) < 0.4 && Math.abs(sim.body.velocity) < 2;
      if (settled) {
        sim.body = { value: REST.body.y, velocity: 0 };
        sim.head = { value: REST.head.y, velocity: 0 };
        setPhase('idle');
      }
      break;
    }

    case 'landing':
      if (sim.clock >= TIMING.ripple) setPhase('delivering');
      break;

    case 'delivering': {
      let allPlaced = true;

      for (const tile of sim.tiles) {
        const start = tile.index * TIMING.ascentStagger;

        if (tile.state === 'waiting') {
          if (sim.clock >= start) tile.state = 'ascending';
          else allPlaced = false;
        }

        if (tile.state === 'ascending') {
          tile.progress = clamp((sim.clock - start) / TIMING.ascentPerTile, 0, 1);
          if (tile.progress >= 1) {
            tile.state = 'ejecting';
            // Launch from the beak tip.
            tile.from = { x: REST.head.x + 40, y: sim.head.value - 2 };
          }
          allPlaced = false;
        }

        if (tile.state === 'ejecting') {
          tile.ejectElapsed += dt;
          if (tile.ejectElapsed >= TIMING.eject) {
            tile.ejectElapsed = TIMING.eject;
            tile.state = 'placed';
          } else {
            allPlaced = false;
          }
        }
      }

      if (allPlaced) {
        setPhase('done');
        onComplete.current?.();
      }
      break;
    }

    case 'idle':
    case 'done':
    default:
      break;
  }
}

const stretchOf = (sim: Sim): number => mapRange(sim.body.value, REST.body.y, PHYSICS.floorY, 0, 1);

function expressionFor(phase: Phase): Expression {
  switch (phase) {
    case 'patting':
      return 'happy';
    case 'tickling':
      return 'annoyed';
    case 'grabbed':
    case 'falling':
      return 'alarmed';
    case 'done':
      return 'happy';
    default:
      return 'idle';
  }
}

/* ================================================================ cursor == */

function HandCursor({ grip }: { grip: 'open' | 'poke' | 'fist' }) {
  const common = {
    fill: 'var(--paper)',
    stroke: 'var(--ink)',
    strokeWidth: 2.4,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
  };

  return (
    <svg viewBox="0 0 44 44" width={44} height={44}>
      {grip === 'open' && (
        <path
          d="M 14 34 q -6 -8 -6 -14 v -8 a 3 3 0 0 1 6 0 v 6 v -12 a 3 3 0 0 1 6 0 v 12 v -14 a 3 3 0 0 1 6 0 v 14 v -8 a 3 3 0 0 1 6 0 v 16 q 0 8 -6 12 z"
          {...common}
        />
      )}
      {grip === 'poke' && (
        <path
          d="M 12 36 q -4 -8 -2 -14 l 4 -4 v 4 l 2 -18 a 3 3 0 0 1 6 0 v 14 h 12 a 3 3 0 0 1 0 6 h -4 q 6 2 4 8 l -2 4 z"
          {...common}
        />
      )}
      {grip === 'fist' && (
        <path
          d="M 12 32 q -4 -10 2 -16 q 4 -4 10 -4 h 10 a 3 3 0 0 1 0 6 h -6 h 8 a 3 3 0 0 1 0 6 h -8 h 6 a 3 3 0 0 1 0 6 h -6 h 4 a 3 3 0 0 1 0 6 h -12 z"
          {...common}
        />
      )}
    </svg>
  );
}
