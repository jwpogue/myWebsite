import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GooseIntro } from '@/features/goose/GooseIntro';

const SEEN_KEY = 'goose-intro-seen';

export function Home() {
  // Repeat visitors within a session shouldn't have to wrestle the bird again;
  // they get the goose as they left it. Read synchronously so the goose mounts
  // in the right state rather than flashing the idle pose first.
  const [startFinished] = useState(
    () =>
      sessionStorage.getItem(SEEN_KEY) === '1' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const handleComplete = () => {
    sessionStorage.setItem(SEEN_KEY, '1');
  };

  // The copy lives inside the goose's stage: it fades in under the tiles
  // once the name is spelled out.
  return (
    <GooseIntro onComplete={handleComplete} startFinished={startFinished}>
      <h1>Rey Pogue</h1>
      <p>
        Placeholder. One or two lines on who you are and what you do — the thing a stranger should
        remember thirty seconds after closing the tab.
      </p>
      <p>
        Start with <Link to="/projects">the projects</Link>, or read{' '}
        <Link to="/about">more about me</Link>.
      </p>
    </GooseIntro>
  );
}
