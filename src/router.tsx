import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
import { Projects } from '@/pages/Projects';
import { Writing } from '@/pages/Writing';
import { Contact } from '@/pages/Contact';
import { NotFound } from '@/pages/NotFound';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      errorElement: <NotFound />,
      children: [
        { index: true, element: <Home /> },
        { path: 'about', element: <About /> },
        { path: 'projects', element: <Projects /> },
        { path: 'writing', element: <Writing /> },
        { path: 'contact', element: <Contact /> },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  {
    // Vite injects the base path it was built with. On a custom domain that is
    // '/', on a GitHub Pages project site it is '/<repo>/'. Keeping the router
    // in step with it means links work in both places without a code change.
    basename: import.meta.env.BASE_URL,
  }
);
