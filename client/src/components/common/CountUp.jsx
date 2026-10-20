import { useEffect, useRef, useState } from 'react';

/**
 * Gently counts a number up from 0 when mounted. Falls back to the final value
 * immediately for non-numbers or when the user prefers reduced motion.
 */
export default function CountUp({ value, duration = 800 }) {
  const target = Number(value);
  const animatable = Number.isFinite(target) && typeof value !== 'string';
  const [display, setDisplay] = useState(animatable ? 0 : value);
  const frame = useRef(0);

  useEffect(() => {
    if (!animatable) {
      setDisplay(value);
      return undefined;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return undefined;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, animatable, duration, value]);

  return <span className="tabular-nums">{display}</span>;
}
