import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const VISIBLE_MS = 2200;
const FADE_MS = 500;
const BOT_PATTERN = /bot|crawl|spider|slurp|lighthouse|headless|prerender/i;

function shouldShowSplash() {
  if (typeof window === 'undefined') return false;
  // Splash is only for the home page, and never for crawlers (SEO).
  if (window.location.pathname !== '/') return false;
  if (BOT_PATTERN.test(navigator.userAgent || '')) return false;
  return true;
}

/**
 * Splash shown every time the site is opened (each full page load of the home
 * page, including a refresh or a new tab). Navigating inside the app back to
 * "/" does not replay it. The page underneath is already rendered, so crawlers
 * and screen readers are never blocked by it.
 */
export default function SplashScreen() {
  const { pathname } = useLocation();
  const [phase, setPhase] = useState(() => (shouldShowSplash() ? 'show' : 'off'));
  const [progress, setProgress] = useState(0);

  // Progress bar: fills 0 → 100% over the splash duration, then the splash fades out.
  useEffect(() => {
    if (phase !== 'show') return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration = reduce ? 900 : VISIBLE_MS;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const ratio = Math.min(1, (now - start) / duration);
      // Ease-out so it feels like it is "loading", reaching exactly 100 at the end.
      setProgress(Math.round((1 - (1 - ratio) ** 2) * 100));
      if (ratio < 1) frame = requestAnimationFrame(tick);
      else setPhase('hide');
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  // Once fading out, unmount after the transition. Kept in its own effect so
  // the phase change above doesn't cancel this timer.
  useEffect(() => {
    if (phase !== 'hide') return undefined;
    const timer = setTimeout(() => setPhase('off'), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // Lock scroll while visible.
  useEffect(() => {
    if (phase === 'off') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  // If the visitor navigated away from home before it ended, drop it at once.
  useEffect(() => {
    if (pathname !== '/' && phase !== 'off') setPhase('off');
  }, [pathname, phase]);

  if (phase === 'off') return null;

  return (
    <div
      aria-hidden="true"
      className={`splash-screen ${phase === 'hide' ? 'splash-screen--hide' : ''}`}
      onClick={() => setPhase('hide')}
    >
      <div className="splash-screen__inner">
        <img src="/animals-super-store-logo.png" alt="" className="splash-screen__logo" width="120" height="120" />
        <p className="splash-screen__title">
          Animals Super <span>Store</span>
        </p>
        <p className="splash-screen__tag">Everything for Goats. One Place.</p>
        <div
          className="splash-screen__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="splash-screen__percent">{progress}%</p>
      </div>
    </div>
  );
}
