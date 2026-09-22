// Simple, deliberate page transition: a dark fade with a small pulsing mark.
// Earlier versions tried to replicate a busy WebGL "wormhole" tunnel with
// Canvas2D streaks and glow — after repeated visual review it read as messy
// rather than cinematic. This is intentionally minimal and clean instead.
const DURATION = 650;

export function mountPageTransition(): void {
  const overlay = document.querySelector<HTMLElement>('[data-page-transition]');
  if (!overlay) return;
  const skip = overlay.querySelector<HTMLButtonElement>('.page-transition__skip');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let destination = '';
  let timer: number | undefined;
  let selectedLink: HTMLAnchorElement | undefined;

  const finish = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    selectedLink?.classList.remove('is-transitioning');
    if (destination) window.location.assign(destination);
  };

  function begin(event: MouseEvent) {
    const target = event.target as Element;
    const link = target.closest<HTMLAnchorElement>('a[data-page-link]');
    if (!link || !link.href || link.target === '_blank') return;
    if (link.href === window.location.href) return;
    event.preventDefault();
    destination = link.href;
    selectedLink = link;
    link.classList.add('is-transitioning');
    if (reducedMotion) {
      finish();
      return;
    }
    overlay!.removeAttribute('aria-hidden');
    overlay!.removeAttribute('inert');
    overlay!.classList.add('is-active');
    skip?.focus({ preventScroll: true });
    timer = window.setTimeout(finish, DURATION);
  }

  document.addEventListener('click', begin);
  skip?.addEventListener('click', finish);
}
