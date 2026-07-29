import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GooseIntro } from '@/features/goose/GooseIntro';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const SEEN_KEY = 'goose-intro-seen';

export function Home() {
  const reducedMotion = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(false);

  // Repeat visitors within a session shouldn't have to wrestle the bird again.
  useEffect(() => {
    if (reducedMotion || sessionStorage.getItem(SEEN_KEY) === '1') setIntroDone(true);
  }, [reducedMotion]);

  const handleComplete = () => {
    sessionStorage.setItem(SEEN_KEY, '1');
    setIntroDone(true);
  };

  return (
    <div>
      {!introDone && <GooseIntro onComplete={handleComplete} />}

      {introDone && (
        <section>
          <h1>Rey Pogue</h1>
          <p>
            Placeholder. One or two lines on who you are and what you do — the thing a stranger
            should remember thirty seconds after closing the tab.
          </p>
          <p>
            Start with <Link to="/projects">the projects</Link>, or read{' '}
            <Link to="/about">more about me</Link>.
          </p>
        </section>
      )}
    </div>
  );
}
