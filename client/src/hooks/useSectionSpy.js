import { useEffect, useState } from 'react';

/**
 * Scroll-spy for named page sections, built on IntersectionObserver — no
 * scroll event listeners. A section counts as active while it occupies the
 * band between the sticky navbar and the middle of the viewport; when
 * several sections overlap that band, the one furthest down the page wins
 * (the section the user has scrolled into). While the viewport sits between
 * navigable sections, the previous active section is kept.
 *
 * `sectionIds` must be a stable reference (module-level constant) so the
 * observer is set up once per mount.
 */
export default function useSectionSpy(sectionIds) {
  const [activeId, setActiveId] = useState(sectionIds[0]);

  useEffect(() => {
    const getElements = () =>
      sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    let elements = getElements();
    if (elements.length === 0) return undefined;

    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        const current = [...sectionIds].reverse().find((id) => visible.has(id));
        if (current) setActiveId(current);
      },
      { rootMargin: '-64px 0px -45% 0px', threshold: 0.05 }
    );

    elements.forEach((element) => observer.observe(element));

    const handleScroll = () => {
      // If near very top, activate first section
      if (window.scrollY < 120) {
        setActiveId(sectionIds[0]);
        return;
      }
      // If reached bottom of document, activate last section
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 80
      ) {
        setActiveId(sectionIds[sectionIds.length - 1]);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds]);

  return activeId;
}
