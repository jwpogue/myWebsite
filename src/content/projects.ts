export type Project = {
  slug: string;
  name: string;
  blurb: string;
  stack: string[];
  href?: string;
  repo?: string;
  year: number;
};

/** Placeholder data — replace with the real thing. */
export const projects: Project[] = [
  {
    slug: 'goose',
    name: 'The Goose',
    blurb:
      'The intro to this website. A rigged SVG waterfowl with a procedurally generated neck, a hand-written physics integrator, and strong opinions about being picked up.',
    stack: ['React', 'TypeScript', 'SVG', 'requestAnimationFrame'],
    repo: 'https://github.com/reypogue/mysite',
    year: 2026,
  },
  {
    slug: 'placeholder-two',
    name: 'Project Two',
    blurb: 'One or two sentences on what it does and, more interestingly, why it was hard.',
    stack: ['TypeScript', 'Node'],
    year: 2025,
  },
  {
    slug: 'placeholder-three',
    name: 'Project Three',
    blurb: 'Same again. Lead with the problem, not the framework.',
    stack: ['Python'],
    year: 2024,
  },
];
