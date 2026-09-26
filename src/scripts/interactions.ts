// Site-wide pointer interactions + scroll progress. One delegated
// pointermove listener drives three effects, all rAF-throttled and
// writing only CSS custom properties / the individual `translate`
// property (never layout):
//   [data-spotlight]  soft light that follows the cursor inside an element
//   [data-tilt]       small perspective tilt toward the cursor
//   [data-magnetic]   element eases a few px toward the cursor
// Pointer effects are skipped on touch/coarse pointers and under
// prefers-reduced-motion; the scroll progress bar always works.
export function mountInteractions(): void {
  const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (bar) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = 0;
  let spot: HTMLElement | null = null;
  let tilt: HTMLElement | null = null;
  let magnet: HTMLElement | null = null;

  const reset = {
    spot: (el: HTMLElement) => el.style.setProperty('--spot-opacity', '0'),
    tilt: (el: HTMLElement) => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    },
    magnet: (el: HTMLElement) => (el.style.translate = ''),
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const target = e.target as Element | null;

        const s = target?.closest<HTMLElement>('[data-spotlight]') ?? null;
        if (spot && spot !== s) reset.spot(spot);
        if (s) {
          const r = s.getBoundingClientRect();
          s.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
          s.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
          s.style.setProperty('--spot-opacity', '1');
        }
        spot = s;

        const t = target?.closest<HTMLElement>('[data-tilt]') ?? null;
        if (tilt && tilt !== t) reset.tilt(tilt);
        if (t) {
          const r = t.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          t.style.setProperty('--tilt-x', `${(-py * 3).toFixed(2)}deg`);
          t.style.setProperty('--tilt-y', `${(px * 4).toFixed(2)}deg`);
        }
        tilt = t;

        const m = target?.closest<HTMLElement>('[data-magnetic]') ?? null;
        if (magnet && magnet !== m) reset.magnet(magnet);
        if (m) {
          const r = m.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
          const dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
          m.style.translate = `${Math.max(-7, Math.min(7, dx)).toFixed(1)}px ${Math.max(-5, Math.min(5, dy)).toFixed(1)}px`;
        }
        magnet = m;
      });
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => {
    if (spot) reset.spot(spot);
    if (tilt) reset.tilt(tilt);
    if (magnet) reset.magnet(magnet);
    spot = tilt = magnet = null;
  });
}
