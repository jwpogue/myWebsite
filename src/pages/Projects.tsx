import { projects } from '@/content/projects';
import styles from './Projects.module.css';

export function Projects() {
  return (
    <article>
      <h1>Projects</h1>
      <p>Things I built, roughly in the order I stopped being able to leave them alone.</p>

      <ul className={styles.list}>
        {projects.map((p) => (
          <li key={p.slug} className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{p.name}</h2>
              <span className={styles.year}>{p.year}</span>
            </div>

            <p className={styles.blurb}>{p.blurb}</p>

            <ul className={styles.stack}>
              {p.stack.map((s) => (
                <li key={s} className={styles.tag}>
                  {s}
                </li>
              ))}
            </ul>

            <p className={styles.links}>
              {p.href && <a href={p.href}>Live</a>}
              {p.href && p.repo && <span aria-hidden="true"> · </span>}
              {p.repo && <a href={p.repo}>Source</a>}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}
