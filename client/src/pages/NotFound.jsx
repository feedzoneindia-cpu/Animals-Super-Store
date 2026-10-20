import PageShell from '../components/common/PageShell.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { buttonStyles } from '../components/common/Button.jsx';
import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO.js';

export default function NotFound() {
  useSEO({ title: 'Page Not Found', noindex: true, description: 'The page you are looking for does not exist.' });

  return (
    <PageShell title="Page not found">
      <EmptyState
        title="404 — This page doesn't exist"
        message="The page you're looking for may have been moved, or the link is incorrect."
        action={
          <Link to="/" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
            Back to Home
          </Link>
        }
      />
    </PageShell>
  );
}
