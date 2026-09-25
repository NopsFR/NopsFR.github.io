// Per-character reveal for [data-typewriter] elements. Reads the element's
// own text once, blanks it, then types it back in with a blinking caret.
// Triggers on scroll-into-view (or immediately if already on screen at
// mount, e.g. the hero). Skips straight to the full text under
// prefers-reduced-motion — this is a display effect, not a loading state,
// so it must never delay or hide real content for anyone who disables motion.
export function mountTypewriter(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-typewriter]');
  if (!targets.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  const run = (el: HTMLElement) => {
    if (el.dataset.typed) return;
    el.dataset.typed = 'true';
    const text = el.textContent || '';
    const speed = Number(el.dataset.typewriterSpeed) || 22;
    el.textContent = '';
    el.classList.add('is-typing');
    let i = 0;
    const tick = () => {
      i++;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        window.setTimeout(tick, speed + (Math.random() * 14 - 7));
      } else {
        el.classList.remove('is-typing');
      }
    };
    tick();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          run(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.4 }
  );
  targets.forEach((el) => observer.observe(el));
}
