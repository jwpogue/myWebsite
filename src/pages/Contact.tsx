const LINKS = [
  { label: 'Email', href: 'mailto:hello@example.com', text: 'hello@example.com' },
  { label: 'GitHub', href: 'https://github.com/', text: 'github.com/reypogue' },
  { label: 'LinkedIn', href: 'https://linkedin.com/', text: 'linkedin.com/in/reypogue' },
] as const;

export function Contact() {
  return (
    <article>
      <h1>Contact</h1>
      <p>The goose does not handle correspondence. I do.</p>

      <dl style={{ display: 'grid', gap: '0.75rem', marginTop: '2rem' }}>
        {LINKS.map(({ label, href, text }) => (
          <div key={label} style={{ display: 'flex', gap: '0.75rem' }}>
            <dt style={{ minWidth: '6rem', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              {label}
            </dt>
            <dd style={{ margin: 0 }}>
              <a href={href}>{text}</a>
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
