# Goose art assets — what you need to draw

The rig is built and running with placeholder art. This is the shopping list for
replacing it. **The single rule that matters: draw parts, not pictures.** The
code positions everything; your file should contain no goose-shaped composition
at all, just loose parts each sitting at its own origin.

---

## 1. Format and export settings

- **Format:** SVG. Not PNG. The neck is generated at runtime, so raster art can't
  match its line weight, and vector scales cleanly on every display.
- **Strokes:** expand strokes to filled paths **or** leave them as strokes with a
  uniform width — but pick one and be consistent. Uniform strokes are preferred,
  because they let the code thin the line when the neck goes taut.
- **Colours:** use flat fills only. No gradients, no filters, no clipping masks.
  Anything you want to theme (dark mode) must be a solid fill I can swap for a
  CSS variable.
- **Text:** convert to outlines, or don't include any.
- **Export:** "Presentation attributes", not inline `style=""` — much easier to
  override from CSS.
- Run the export through [SVGOMG](https://jakearchibald.github.io/svgomg/) with
  "prefix IDs" **on** and "remove viewBox" **off**.

---

## 2. Coordinate contract

Every part must be drawn **around its own local origin `(0, 0)`** — the origin is
the point the code rotates and translates it from. Concretely:

| Part | Origin should sit at | Facing |
| --- | --- | --- |
| **Body** | Centre of the body mass (not the feet) | Right |
| **Head** | Centre of the skull, roughly where the eye socket is | Right, beak along +x |

If the body's origin is at its feet, it will pinwheel around its ankles when it
tilts. This is the single most common thing to get wrong.

Do **not** draw the neck. Do not draw a stub of neck on either part. The code
generates the whole thing as a curve between two anchor points, and any drawn
neck will double up.

---

## 3. The parts list

### Body — one file or one layer group, `body`

Everything below the neck, drawn together and moving as one:

- body mass (with tail and wing markings)
- both legs and feet
- the wing squiggle

The top of the body needs a clean, flat-ish area where the neck plugs in — the
code joins the neck at an anchor point offset from the origin, currently
`(+4, −46)`. If your body is a different size I'll adjust that number; just tell
me where the neck should meet it.

### Head — one group per expression, `head-idle`, `head-happy`, `head-annoyed`, `head-alarmed`

Four variants, all **identically positioned** relative to the origin. The only
things that change between them:

| Variant | When it shows | What differs |
| --- | --- | --- |
| `head-idle` | Default | Plain dot eye, closed beak |
| `head-happy` | After a pat, and after the name lands | Closed happy-arc eye, closed beak |
| `head-annoyed` | After a tickle | Half-lidded eye with a brow line, closed beak |
| `head-alarmed` | While the neck is being stretched | Wide ringed eye, **open beak** |

Easiest way to supply these: draw one head, then four copies with only the eye
and beak swapped. Don't reposition the skull between variants or it will pop.

The beak tip matters — letter tiles launch from it. Tell me its coordinate
relative to the head origin (currently assumed to be about `(+40, 0)`).

### Neck — **do not draw**

Generated. What I do need from you is a decision on two things:

- **Line weight** of the neck outline, so it matches the body and head strokes.
- **Whether the neck is hollow or filled.** Right now it's an outlined tube with
  a paper-coloured interior, which is what makes the letter-tile bulges read.

### Sweat drop — `sweat`

One drop, origin at its centre. The code clones it three times and animates
position, scale and opacity.

### Hand cursor — three variants, `hand-open`, `hand-poke`, `hand-fist`

Drawn in a **44×44 box**, origin at top-left (unlike the goose parts). The
pointer's hotspot is roughly `(14, 8)` — the fingertip area.

- `hand-open` — flat hand, the default and the idle-bobbing one
- `hand-poke` — index finger extended, shows over the body
- `hand-fist` — closed grip, shows over the neck and while dragging

### Letter tiles — **do not draw**

Generated rounded rectangles with text. What I need is a **font decision**:
right now `--font-hand` falls back to Comic Sans, which is a placeholder and a
crime. Pick a real handwriting webfont for the tiles and the "Grab here!" label.
Good self-hostable options: *Patrick Hand*, *Caveat*, *Gloria Hallelujah*,
*Shantell Sans*. Drop the `.woff2` into `public/fonts/` and I'll wire it up.

### "Grab here!" label and arrow — optional

Currently rendered as live text plus an SVG arrow. If you'd rather it were
genuine hand-lettering, supply it as one SVG group with the arrow included and
I'll swap it in.

---

## 4. Layer naming

If you send one combined SVG rather than separate files, name the top-level
groups exactly:

```
body
head-idle
head-happy
head-annoyed
head-alarmed
sweat
hand-open
hand-poke
hand-fist
grab-here      (optional)
```

Illustrator, Figma and Inkscape all write layer names into the SVG `id`
attribute, so this is enough for me to split them mechanically.

---

## 5. Things that will cost you a redraw

- Origins at the feet or at the bounding-box corner rather than the part centre.
- A neck drawn onto the body or head.
- Expression variants where the skull shifted between copies.
- Gradients or drop shadows (they can't be themed for dark mode).
- Raster images embedded inside the SVG.
- Text left as live text with a font that isn't bundled.

---

## 6. Where the code lives

| File | What it holds |
| --- | --- |
| `src/features/goose/GooseArt.tsx` | The placeholder drawings. Replace the paths here. |
| `src/features/goose/config.ts` | Positions, anchor offsets, gravity, timings. Tune here. |
| `src/features/goose/neck.ts` | Neck curve generation. Pure, tested. |
| `src/features/goose/math.ts` | Easing and the spring integrator. Pure, tested. |
| `src/features/goose/layout.ts` | Where each letter tile ends up. Pure, tested. |
| `src/features/goose/GooseIntro.tsx` | Phase machine, animation loop, pointer handling. |

Swapping the art should touch `GooseArt.tsx` and a few numbers in `config.ts`,
and nothing else. If it starts touching `GooseIntro.tsx`, something has drifted
from this spec.
