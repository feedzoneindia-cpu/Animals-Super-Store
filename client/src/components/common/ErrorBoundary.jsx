import { Component } from 'react';
import Button from './Button.jsx';

/**
 * Top-level render error boundary. A crash in any page shows a friendly
 * fallback instead of a blank white screen; navigation reloads the app
 * cleanly.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Surface it in the console for debugging; never shown to the user.
    console.error('[ErrorBoundary]', error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl" aria-hidden="true">
              😕
            </span>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              An unexpected error occurred while loading this page. Please try again — if it keeps
              happening, come back a little later.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="primary" onClick={this.handleReset}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
