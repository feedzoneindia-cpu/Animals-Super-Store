import { useEffect } from 'react';

/**
 * Eases page content into view the first time it scrolls close to the
 * viewport. Targets every top-level <section> plus, for pages built from
 * plain blocks (cart, checkout, profile, policies…), the page's main content
 * blocks. Blocks already on screen at load are left alone, and blocks start
 * their fade slightly BEFORE they enter the viewport so the animation has
 * finished by the time the visitor sees them (no blank, half-faded areas
 * while scrolling).
 *
 * Does nothing when the visitor prefers reduced motion or the browser lacks
 * IntersectionObserver, so content is always shown. Pass the current route so
 * the observers are rebuilt on navigation.
 */
const MAX_DESCENT = 4;

function collectBlocks(main) {
  const found = new Set();

  main.querySelectorAll('section').forEach((el) => found.add(el));

  // Walk down through single-child wrappers to the element that actually
  // lays out the page, then treat its children as the page's content blocks.
  let el = main.firstElementChild;
  for (let depth = 0; el && el.children.length === 1 && depth < MAX_DESCENT; depth += 1) {
    el = el.firstElementChild;
  }
  if (el && el !== main) Array.from(el.children).forEach((child) => found.add(child));

  // Keep only outermost targets so a block never animates inside another one.
  return Array.from(found).filter((node) => {
    for (let parent = node.parentElement; parent && parent !== main; parent = parent.parentElement) {
      if (found.has(parent)) return false;
    }
    return !node.hasAttribute('data-no-reveal') && !node.matches('script, style, [role="dialog"], [aria-live]');
  });
}

export default function useScrollReveal(routeKey) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const main = document.getElementById('main-content');
    if (!main) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.replace('sr-hidden', 'sr-shown');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px 14% 0px', threshold: 0 }
    );

    const seen = new WeakSet();
    let queued = false;
    const scan = () => {
      queued = false;
      collectBlocks(main).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        if (node.getBoundingClientRect().top < window.innerHeight) return;
        node.classList.add('sr-hidden');
        io.observe(node);
      });
    };
    // Coalesce bursts of DOM changes into one scan per frame.
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(scan);
    };

    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(main, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [routeKey]);
}
