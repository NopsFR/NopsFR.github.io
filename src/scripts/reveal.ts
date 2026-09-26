// Scroll/entrance reveals for [data-reveal] (variants: "" fade-up, "mask"
// image wipe, "line" rule draw). Implemented with keyframe animations rather
// than transitions so they never collide with an element's own hover
// transitions. Elements that enter together are staggered in reading order
// (top→bottom, left→right). When arriving through the page transition, the
// first batch waits for the planes to start opening (`pt:reveal`).
export function mountReveal(): void {
  const targets = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!targets.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      visible.forEach((entry, i) => {
        const el = entry.target as HTMLElement;
        el.style.setProperty('--reveal-delay', `${Math.min(i * 60, 360)}ms`);
        el.classList.add('is-revealed');
        observer.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -5% 0px' }
  );

  const begin = () => targets.forEach((el) => observer.observe(el));

  if (document.documentElement.classList.contains('pt-incoming')) {
    window.addEventListener('pt:reveal', () => window.setTimeout(begin, 140), { once: true });
  } else {
    begin();
  }
}
