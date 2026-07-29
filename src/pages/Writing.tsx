import { posts } from '@/content/posts';

const fmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' });

export function Writing() {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article>
      <h1>Writing</h1>
      <p>Occasional notes, mostly about things that turned out harder than expected.</p>

      <ul
        style={{ listStyle: 'none', padding: 0, marginTop: '2rem', display: 'grid', gap: '1.5rem' }}
      >
        {sorted.map((post) => (
          <li key={post.slug}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem' }}>
              {post.href ? <a href={post.href}>{post.title}</a> : post.title}
            </h2>
            <time dateTime={post.date} style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              {fmt.format(new Date(post.date))}
            </time>
            <p style={{ margin: '0.4rem 0 0', color: 'var(--ink-soft)' }}>{post.summary}</p>
          </li>
        ))}
      </ul>
    </article>
  );
}
