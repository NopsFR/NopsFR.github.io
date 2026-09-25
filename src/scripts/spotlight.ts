// Cursor-reactive border highlight for any [data-spotlight] element. One
// delegated pointermove listener for the whole page rather than one per
// card — cheap, GPU-friendly (just repaints a gradient via CSS vars).
export function mountSpotlight(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0;
  let lastTarget: HTMLElement | null = null;

  document.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = (e.target as Element)?.closest<HTMLElement>('[data-spotlight]');
      if (lastTarget && lastTarget !== el) lastTarget.style.setProperty('--spot-opacity', '0');
      if (el) {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
        el.style.setProperty('--spot-opacity', '1');
      }
      lastTarget = el;
    });
  });
}
