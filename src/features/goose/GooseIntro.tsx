import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { GooseBody, GooseHead, SweatDrop, type Expression } from './GooseArt';
import { BEAK_MOUTH, setBeakOpen, type BeakParts } from './beak';
import { ANCHOR, MESSAGE, PHYSICS, REST, STAGE, TILE, TIMING } from './config';
import { messageSlots } from './layout';
import { cubicAngleAt, cubicPointAt, cubicToPath, neckCurve, type Pt } from './neck';
import {
  clamp,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  lerp,
  mapRange,
  safeDelta,
  springStep,
  type Motion,
} from './math';
import type { Phase, Tile } from './types';
import styles from './GooseIntro.module.css';

const NECK_WIDTH = 17;
const SWEAT_COUNT = 3;
/** How long the goose stays pleased or put out after a pat or a poke. */
const REACTION_SECONDS = 1.1;
/** Tiles fall faster than the goose does: they're light and it's a punchline. */
const TUMBLE_GRAVITY = 2200;
/** Far enough below the stage that a falling tile is off any screen. */
const TUMBLE_GONE_Y = STAGE.height + 700;

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
    tiles: messageSlots(MESSAGE).map((slot) => ({
      char: slot.char,
      index: slot.index,
      state: 'waiting',
      progress: 0,
      ejectElapsed: 0,
      from: { x: 0, y: 0 },
      to: { x: slot.x, y: slot.y },
      spin: (slot.index % 2 === 0 ? 1 : -1) * (240 + slot.index * 40),
      tumble: { delay: 0, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 },
    })),
  };
}

/**
 * The end state: body on the floor, neck stretched, every tile in its slot.
 * `clock` lets a caller decide whether the relief animation still has to play.
 */
function finishedSim(clock: number): Sim {
  const sim = initialSim();
  sim.phase = 'done';
  sim.clock = clock;
  sim.body.value = PHYSICS.floorY;
  sim.head.value = REST.head.y - 26;
  for (const tile of sim.tiles) {
    tile.state = 'placed';
    tile.progress = 1;
    tile.ejectElapsed = TIMING.eject;
    tile.from = { ...tile.to };
  }
  return sim;
}

export type GooseIntroProps = {
  /** Fired once the last letter lands. */
  onComplete?: () => void;
  /** Open on the finished goose rather than the idle one. */
  startFinished?: boolean;
  /** Copy that fades in under the tiles once the name is spelled out, and is
   *  knocked off the stage along with them on a replay. */
  children?: ReactNode;
};

/** Where the copy sits: under the tiles, right of the stretched neck. */
const ASIDE_POSITION: CSSProperties = {
  left: `${(TILE.originX / STAGE.width) * 100}%`,
  top: `${((TILE.originY + TILE.rowStep + TILE.size) / STAGE.height) * 100}%`,
};

export function GooseIntro({ onComplete, startFinished = false, children }: GooseIntroProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bodyRef = useRef<SVGGElement | null>(null);
  const headRef = useRef<SVGGElement | null>(null);
  const neckRef = useRef<SVGPathElement | null>(null);
  const neckFillRef = useRef<SVGPathElement | null>(null);
  const bulgeRefs = useRef<(SVGGElement | null)[]>([]);
  const tileRefs = useRef<(SVGGElement | null)[]>([]);
  const sweatRefs = useRef<(SVGGElement | null)[]>([]);
  const rippleRef = useRef<SVGEllipseElement | null>(null);
  const promptRef = useRef<SVGGElement | null>(null);
  const headHitRef = useRef<SVGGElement | null>(null);
  const bodyHitRef = useRef<SVGGElement | null>(null);
  const phewRef = useRef<SVGTextElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const beakRef = useRef<BeakParts>({ upper: null, lower: null, mouth: null });

  // A returning goose has long since got its breath back, hence the big clock.
  const [firstSim] = useState(() => (startFinished ? finishedSim(60) : initialSim()));
  const simRef = useRef<Sim>(firstSim);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  // Mirrored into React only when it changes — expressions and copy are
  // declarative, positions are not.
  const [phase, setPhase] = useState<Phase>(firstSim.phase);
  const [grip, setGrip] = useState<'open' | 'poke' | 'fist'>('open');
  const [pointerFine, setPointerFine] = useState(true);
  // How a finished goose is reacting to being bothered, if it is.
  const [doneReaction, setDoneReaction] = useState<Expression | null>(null);
  const reactionTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(reactionTimer.current), []);

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
      const { x: headX, y: headY, tilt: headTilt } = headPose(sim);

      setBeakOpen(beakRef.current, beakOpenness(sim));

      // The hit zones ride along with the parts, so the goose can still be
      // bothered after it has fallen.
      const bodyTransform = `translate(${bodyX} ${bodyY}) rotate(${bodyTilt})`;
      const headTransform = `translate(${headX} ${headY}) rotate(${headTilt})`;
      bodyRef.current?.setAttribute('transform', bodyTransform);
      bodyHitRef.current?.setAttribute('transform', bodyTransform);
      headRef.current?.setAttribute('transform', headTransform);
      headHitRef.current?.setAttribute('transform', headTransform);

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
        } else if (tile.state === 'tumbling') {
          const { x, y, angle } = tile.tumble;
          bulge?.setAttribute('opacity', '0');
          chip?.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
          chip?.setAttribute('opacity', '1');
        } else {
          bulge?.setAttribute('opacity', '0');
          chip?.setAttribute('opacity', '0');
        }
      }

      // Sweat: whenever the neck is under real tension — held, landed, and
      // all the while the tiles are being hauled up it. It fades with the
      // stretch, so letting go mid-fall dries it off as the body springs back.
      const sweating =
        stretch > 0.25 &&
        (sim.phase === 'grabbed' ||
          sim.phase === 'snapping' ||
          sim.phase === 'landing' ||
          sim.phase === 'delivering');
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

      // Landing ripple, spreading flat along the ground under the feet.
      if (rippleRef.current) {
        if (sim.phase === 'landing') {
          const t = clamp(sim.clock / TIMING.ripple, 0, 1);
          const rx = 30 + easeOutCubic(t) * 130;
          rippleRef.current.setAttribute('cx', String(bodyX));
          rippleRef.current.setAttribute('cy', String(bodyY + 60));
          rippleRef.current.setAttribute('rx', String(rx));
          rippleRef.current.setAttribute('ry', String(rx * 0.18));
          rippleRef.current.setAttribute('opacity', String((1 - t) * 0.65));
        } else {
          rippleRef.current.setAttribute('opacity', '0');
        }
      }

      // A sigh of relief drifting up off the beak.
      if (phewRef.current) {
        const t = sim.phase === 'done' ? sim.clock / TIMING.phew : 1;
        if (t < 1) {
          phewRef.current.setAttribute(
            'transform',
            `translate(${headX + 40} ${headY - 34 - easeOutCubic(t) * 22})`
          );
          phewRef.current.setAttribute('opacity', String(Math.min(1, t * 6) * (1 - easeInQuad(t))));
        } else {
          phewRef.current.setAttribute('opacity', '0');
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
    if (!['idle', 'patting', 'tickling', 'snapping'].includes(sim.phase)) return;
    const p = toStage(event);
    if (!p) return;

    // Capture so the release is heard even if the pointer wanders off the neck.
    event.currentTarget.setPointerCapture(event.pointerId);
    sim.pointerId = event.pointerId;
    sim.phase = 'grabbed';
    sim.clock = 0;
    setPhase('grabbed');
    setGrip('fist');
  };

  const releaseNeck = (event: React.PointerEvent<SVGElement>) => {
    const sim = simRef.current;
    if (sim.pointerId !== event.pointerId) return;
    sim.pointerId = null;
    setGrip('open');
    // Still holding on when it hit the floor? Nothing left to decide.
    if (sim.phase !== 'grabbed') return;

    // Let go any time before the floor and the neck hauls the body back up.
    sim.phase = 'snapping';
    sim.clock = 0;
    setPhase('snapping');
  };

  const poke = (which: 'head' | 'body') => () => {
    const sim = simRef.current;

    // Once finished, the goose stays finished: the reaction is only skin deep.
    if (sim.phase === 'done') {
      if (which === 'head') sim.headNudge.velocity = 90;
      else sim.bodyNudge.velocity = -170;
      setDoneReaction(which === 'head' ? 'happy' : 'annoyed');
      window.clearTimeout(reactionTimer.current);
      reactionTimer.current = window.setTimeout(
        () => setDoneReaction(null),
        REACTION_SECONDS * 1000
      );
      return;
    }

    // No cool-down: a fresh pat or poke cuts straight into whatever reaction
    // is still playing and starts it over.
    if (sim.phase !== 'idle' && sim.phase !== 'patting' && sim.phase !== 'tickling') return;
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
    simRef.current = finishedSim(0);
    setPhase('done');
    setGrip('open');
    completeRef.current?.();
  };

  /** Back to the start, ready to be bothered all over again. */
  /** Knock the tiles (and the text) off the stage and start over. */
  const replay = () => {
    const sim = simRef.current;
    if (sim.phase !== 'done') return;
    for (const tile of sim.tiles) {
      tile.state = 'tumbling';
      tile.tumble = {
        delay: Math.random() * TIMING.tumbleStagger * sim.tiles.length,
        x: tile.to.x,
        y: tile.to.y,
        vx: (Math.random() - 0.35) * 260,
        vy: -(120 + Math.random() * 220),
        angle: 0,
        spin: (Math.random() - 0.5) * 900,
      };
    }
    sim.phase = 'clearing';
    sim.clock = 0;
    setPhase('clearing');
    setDoneReaction(null);
    setGrip('open');
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

  const expression = (phase === 'done' && doneReaction) || expressionFor(phase);
  const slots = messageSlots(MESSAGE);

  const asideShown = phase === 'done' || phase === 'clearing';
  const asideClass = [
    styles.aside,
    asideShown && styles.asideShown,
    phase === 'clearing' && styles.asideTumbling,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={[
        styles.stage,
        pointerFine && styles.stageHidesCursor,
        children != null && styles.stageWithAside,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ '--stage-aspect': STAGE.width / STAGE.height } as CSSProperties}
    >
      <div className={styles.canvas}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="A cartoon goose. Grab its neck and pull to reveal the name Rey Pogue."
        >
          <ellipse
            ref={rippleRef}
            cx={REST.body.x}
            cy={PHYSICS.floorY + 60}
            rx={30}
            ry={6}
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
            <GooseHead expression={expression} beak={beakRef} />
          </g>

          <text ref={phewRef} className={styles.phew} opacity={0}>
            phew!
          </text>

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
          <g ref={headHitRef} transform={`translate(${REST.head.x} ${REST.head.y})`}>
            <rect
              className={styles.hitZone}
              x={-34}
              y={-30}
              width={80}
              height={58}
              onPointerDown={poke('head')}
              onPointerEnter={() => setGrip('open')}
            />
          </g>
          <g ref={bodyHitRef} transform={`translate(${REST.body.x} ${REST.body.y})`}>
            <ellipse
              className={styles.hitZone}
              rx={58}
              ry={50}
              onPointerDown={poke('body')}
              onPointerEnter={() => setGrip('poke')}
            />
          </g>
          {/* The neck can only be grabbed where it rests; once the goose is
            done it is out of the way of the body and head zones. */}
          <rect
            className={styles.hitZone}
            x={REST.head.x - 26}
            y={REST.head.y + 24}
            width={52}
            height={REST.body.y - REST.head.y - 60}
            style={{ pointerEvents: phase === 'done' ? 'none' : 'all' }}
            onPointerDown={grabNeck}
            onPointerUp={releaseNeck}
            onPointerCancel={releaseNeck}
            onPointerEnter={() => setGrip('fist')}
            onPointerLeave={() => simRef.current.phase !== 'grabbed' && setGrip('open')}
          />
        </svg>

        {children != null && (
          <div className={asideClass} style={ASIDE_POSITION} aria-hidden={!asideShown}>
            {children}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        {asideShown ? (
          <button
            type="button"
            className={styles.skip}
            onClick={replay}
            disabled={phase === 'clearing'}
          >
            Replay the goose
          </button>
        ) : (
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
      if (sim.clock > REACTION_SECONDS) setPhase('idle');
      break;

    // While held, gravity owns the body. Let go before it lands and it
    // snaps home (see 'snapping').
    case 'grabbed': {
      sim.body.velocity += PHYSICS.gravity * dt;
      sim.body.value += sim.body.velocity * dt;
      // The head is pulled upward as the body descends.
      sim.head.value = REST.head.y - 26 * easeInQuad(stretchOf(sim));
      if (sim.body.value >= PHYSICS.floorY) {
        sim.body.value = PHYSICS.floorY;
        sim.body.velocity = 0;
        setPhase('landing');
      }
      break;
    }

    case 'snapping':
      if (springHome(sim, dt)) setPhase('idle');
      break;

    case 'clearing': {
      const home = springHome(sim, dt);

      let gone = true;
      for (const tile of sim.tiles) {
        const t = tile.tumble;
        if (sim.clock >= t.delay) {
          t.vy += TUMBLE_GRAVITY * dt;
          t.x += t.vx * dt;
          t.y += t.vy * dt;
          t.angle += t.spin * dt;
        }
        if (t.y < TUMBLE_GONE_Y) gone = false;
      }

      if ((gone && home) || sim.clock >= TIMING.clearing) {
        sim.tiles = initialSim().tiles;
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
            // Launch from the open beak, wherever the tilted head has put it.
            tile.from = beakMouth(sim);
            // ...and the head kicks back a little with each spit.
            sim.headNudge.velocity -= 55;
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

/**
 * Pulls the body and head back to their rest pose. Returns true, having
 * snapped them exactly into place, once they have arrived.
 */
function springHome(sim: Sim, dt: number): boolean {
  sim.body = springStep(sim.body, REST.body.y, dt, PHYSICS.snapStiffness, PHYSICS.snapDamping);
  sim.head = springStep(sim.head, REST.head.y, dt, PHYSICS.snapStiffness, PHYSICS.snapDamping);
  const settled = Math.abs(sim.body.value - REST.body.y) < 0.4 && Math.abs(sim.body.velocity) < 2;
  if (settled) {
    sim.body = { value: REST.body.y, velocity: 0 };
    sim.head = { value: REST.head.y, velocity: 0 };
  }
  return settled;
}

const stretchOf = (sim: Sim): number => mapRange(sim.body.value, REST.body.y, PHYSICS.floorY, 0, 1);

/** Where the head is and how far it is tipped back, in stage space. */
function headPose(sim: Sim): { x: number; y: number; tilt: number } {
  // Head tips back as the neck goes taut...
  const strained = -stretchOf(sim) * 26;
  // ...and, once the job is done, sags forward a bit in relief.
  const relaxed = strained * 0.4;
  const tilt =
    sim.phase === 'done'
      ? lerp(strained, relaxed, easeOutCubic(sim.clock / TIMING.relax))
      : sim.phase === 'clearing'
        ? relaxed
        : strained;
  return { x: REST.head.x, y: sim.head.value + sim.headNudge.value, tilt };
}

/** The middle of the open beak in stage space, accounting for the head's tilt. */
function beakMouth(sim: Sim): Pt {
  const { x, y, tilt } = headPose(sim);
  const a = (tilt * Math.PI) / 180;
  return {
    x: x + BEAK_MOUTH.x * Math.cos(a) - BEAK_MOUTH.y * Math.sin(a),
    y: y + BEAK_MOUTH.x * Math.sin(a) + BEAK_MOUTH.y * Math.cos(a),
  };
}

/**
 * How open the beak is, 0 → 1. While delivering, each tile gets its own
 * gape: the beak opens as the tile reaches the top of the neck, then snaps
 * shut just after it pops out.
 */
function beakOpenness(sim: Sim): number {
  if (sim.phase === 'grabbed') return 0.45; // a honk of alarm
  if (sim.phase !== 'delivering') return 0;

  let open = 0;
  for (const tile of sim.tiles) {
    let gape = 0;
    if (tile.state === 'ascending') {
      const untilEject = (1 - tile.progress) * TIMING.ascentPerTile;
      gape = 1 - untilEject / TIMING.beakOpen;
    } else if (tile.state === 'ejecting') {
      gape = 1 - tile.ejectElapsed / TIMING.beakClose;
    }
    open = Math.max(open, clamp(gape, 0, 1));
  }
  return open;
}

function expressionFor(phase: Phase): Expression {
  switch (phase) {
    case 'patting':
      return 'happy';
    case 'tickling':
      return 'annoyed';
    case 'grabbed':
      return 'alarmed';
    case 'done':
      return 'relieved';
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
        // Index finger up, the rest curled, thumb tucked across the front.
        // The fingertip sits on the hotspot so the poke lands where it points.
        <g>
          <path
            d="M 11 30 V 7 a 3 3 0 0 1 6 0 V 18 a 3 3 0 0 1 6 0 a 3 3 0 0 1 6 0 a 2.6 2.6 0 0 1 5 1 V 30 q 0 8 -8 8 h -7 q -8 0 -8 -8 Z"
            {...common}
          />
          <path d="M 23 18 v 3 M 29 18 v 3 M 11 25 q 7 -1 10 4" {...common} fill="none" />
        </g>
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
