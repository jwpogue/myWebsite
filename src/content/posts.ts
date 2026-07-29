export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string; // ISO 8601
  href?: string;
};

/** Placeholder data — replace with the real thing. */
export const posts: Post[] = [
  {
    slug: 'necks',
    title: 'On the Structural Integrity of Cartoon Necks',
    summary:
      'What happens when you model a goose neck as a stroked path whose length is a free variable.',
    date: '2026-07-01',
  },
  {
    slug: 'placeholder',
    title: 'A Second Post',
    summary: 'Replace me.',
    date: '2026-03-14',
  },
];
