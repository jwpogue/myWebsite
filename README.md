# reypogue.com

Personal site. Vite + React + TypeScript. The front door is a goose.

## Running it

```bash
npm install
npm run dev
```

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, in place |
| `npm run test` | Vitest, once |
| `npm run check` | Everything CI runs |

## Layout

```
src/
  components/     Layout and shared UI
  content/        Projects and posts as typed data (placeholder — replace)
  features/goose/ The intro animation
  hooks/
  pages/
  styles/
docs/
  ART-ASSETS.md   What artwork the goose rig needs
```

## The goose

The intro is the only non-trivial part of the site, so briefly:

The goose is a **rig**, not a drawing. The body and head are independently
transformed SVG groups; the neck doesn't exist as artwork at all — it's a cubic
Bezier regenerated from the two anchor points on every frame. That's what makes
it stretchable.

A `requestAnimationFrame` loop mutates SVG attributes through refs. React owns
only the phase (`idle → grabbed → falling → landing → delivering → done`) and
the declarative bits that follow from it, like which expression to render.
Per-frame React state would not hold 60fps.

The maths is separated into pure modules (`neck.ts`, `math.ts`, `layout.ts`) so
it's unit tested without a DOM. jsdom doesn't implement `getPointAtLength`,
which is a second reason the Bezier evaluation is hand-rolled.

**The artwork is placeholder.** See [`docs/ART-ASSETS.md`](docs/ART-ASSETS.md)
for the spec the real art needs to meet.

## Accessibility

- Honours `prefers-reduced-motion` by skipping the intro entirely
- "Skip the goose" button jumps to the end state
- Intro only plays once per session (`sessionStorage`)
- Skip link, visible focus rings, the SVG carries a text alternative

## Deploying

Two workflows, doing different jobs:

- **`.github/workflows/ci.yml`** — on every push and PR, runs lint, format check,
  typecheck, tests and a build. Reports pass/fail. Publishes nothing.
- **`.github/workflows/deploy.yml`** — on every push to `main`, builds and
  publishes to GitHub Pages.

### One-time setup

In the repo: **Settings → Pages → Build and deployment → Source → GitHub
Actions**. That's the only manual step. The site then appears at
`https://jwpogue.github.io/myWebsite/`.

### Moving to the custom domain

Two changes, both small:

1. Add `public/CNAME` containing just the domain, e.g. `reypogue.com`.
2. Delete the `env: VITE_BASE: /myWebsite/` block from `deploy.yml`, so the
   build uses the default base of `/`.

Then point DNS at GitHub: a `CNAME` record for `www` → `jwpogue.github.io`, or
`A` records for the apex domain at GitHub's four Pages IPs.

The base path is deliberately the only thing that differs between the two
setups. `vite.config.ts` reads it from `VITE_BASE`, and `src/router.tsx` takes
its `basename` from `import.meta.env.BASE_URL`, so the router and the asset URLs
can't drift apart.

### Notes

`deploy.yml` copies `dist/index.html` to `dist/404.html`. GitHub Pages has no
rewrite rules, so this is what lets a deep link like `/projects` boot the router
instead of showing a Pages 404. If you move to Cloudflare Pages or Netlify
later, delete that step and add a `public/_redirects` containing
`/*  /index.html  200`.
