// Cross-page transition controller — see PageTransition.astro for the scene.
// Leaving: set the destination's label/accent, add `pt-leaving`, navigate
// after the planes have closed. Arriving: Layout's inline <head> script has
// already added `pt-incoming` (covered) from sessionStorage; here we swap it
// for `pt-revealing` and announce `pt:reveal` so page content starts its
// entrance as the planes open.
import { routeMeta } from '../data/routes';

const EXIT_MS = 500;
const REVEAL_MS = 620;
const HOLD_MS = 130;

export function mountPageTransition(): void {
  const html = document.documentElement;
  const overlay = document.querySelector<HTMLElement>('[data-pt]');
  if (!overlay) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = import.meta.env.BASE_URL;

  const clearLabel = () => {
    ['--pt-title', '--pt-index', '--pt-path'].forEach((p) => html.style.removeProperty(p));
    delete overlay.dataset.accent;
  };

  if (html.classList.contains('pt-incoming')) {
    window.setTimeout(() => {
      requestAnimationFrame(() => {
        html.classList.add('pt-revealing');
        html.classList.remove('pt-incoming');
        window.dispatchEvent(new Event('pt:reveal'));
        window.setTimeout(() => {
          html.classList.remove('pt-revealing');
          clearLabel();
        }, REVEAL_MS + 120);
      });
    }, HOLD_MS);
  }

  // Returning via the back/forward cache must never land on a covered page.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      html.classList.remove('pt-leaving', 'pt-incoming', 'pt-revealing');
      clearLabel();
    }
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-page-link]');
    if (!link || link.target === '_blank' || !link.href) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname) return;
    event.preventDefault();

    if (reduced) {
      window.location.assign(url.href);
      return;
    }

    const meta = routeMeta(url.pathname, base);
    const label = link.dataset.ptLabel || meta.label;
    const index = `${meta.index} / ${meta.label.toUpperCase()}`;
    const path = `${url.host}${url.pathname.replace(/\/$/, '')}`;

    html.style.setProperty('--pt-title', JSON.stringify(label));
    html.style.setProperty('--pt-index', JSON.stringify(index));
    html.style.setProperty('--pt-path', JSON.stringify(path));
    overlay.dataset.accent = meta.accent;
    try {
      sessionStorage.setItem('pt', JSON.stringify({ label, index, path, t: Date.now() }));
    } catch {
      /* storage unavailable — the destination simply loads without the arrival half */
    }

    html.classList.add('pt-leaving');
    window.setTimeout(() => window.location.assign(url.href), EXIT_MS);
  });
}
