import { Link } from 'react-router-dom';

export function Home() {
  return (
    <section>
      <h1>Rey Pogue</h1>
      <p>
        Placeholder. One or two lines on who you are and what you do — the thing a stranger should
        remember thirty seconds after closing the tab.
      </p>
      <p>
        Start with <Link to="/projects">the projects</Link>, or read{' '}
        <Link to="/about">more about me</Link>.
      </p>
    </section>
  );
}
