import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GSI_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise;
/** Loads Google Identity Services once, however many buttons mount. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error('Could not load Google sign-in'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * "Continue with Google" using Google's official button (Google Identity
 * Services). On success the signed ID token is sent to the API, which verifies
 * it and starts the normal cookie session. `onSuccess` runs after sign-in.
 * Needs VITE_GOOGLE_CLIENT_ID; without it a disabled-looking fallback is shown.
 */
export default function GoogleSignInButton({ onSuccess, onError }) {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef(null);
  const [failed, setFailed] = useState(false);
  // Latest callbacks without re-initialising Google's button on every render.
  const handlers = useRef({});
  handlers.current = { loginWithGoogle, onSuccess, onError, toast };

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const el = containerRef.current;
        if (cancelled || !el) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            const h = handlers.current;
            try {
              const user = await h.loginWithGoogle(credential);
              h.onSuccess?.(user);
            } catch (err) {
              h.onError?.(err.message);
              h.toast(err.message || 'Google sign-in failed', 'error');
            }
          },
        });
        window.google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, Math.round(el.getBoundingClientRect().width))),
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID || failed) {
    return (
      <button
        type="button"
        onClick={() =>
          toast(
            failed ? 'Could not reach Google. Check your connection and try again.' : 'Google sign-in is not set up yet.',
            'warning'
          )
        }
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
      >
              <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
                <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.9 2.3-8.8 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
        Continue with Google
      </button>
    );
  }

  return <div ref={containerRef} className="flex min-h-11 w-full justify-center" />;
}
