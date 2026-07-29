import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <article>
      <h1>404</h1>
      <p>
        This page does not exist. The goose insists it never did, and honestly it has been right
        about stranger things.
      </p>
      <p>
        <Link to="/">Back to the goose</Link>
      </p>
    </article>
  );
}
