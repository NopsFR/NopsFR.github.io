// Scroll-triggered entrance reveals. Elements opt in with `data-reveal`
// (optionally `data-reveal-group` to stagger siblings). Runs once per element;
// does nothing under prefers-reduced-motion, where content is simply visible.
export function mountReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!targets.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const groups = new Map<string, HTMLElement[]>();
  targets.forEach((el) => {
    const group = el.dataset.revealGroup ?? '';
    const list = groups.get(group) ?? [];
    list.push(el);
    groups.set(group, list);
  });
  groups.forEach((list) => {
    list.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 60, 360)}ms`;
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}
