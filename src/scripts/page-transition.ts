// A fast circular wipe that expands from the clicked point (or screen centre
// for keyboard activation) rather than the old pulsing-dot loader. The
// clip-path is driven directly via inline styles with a forced reflow
// between the "from" and "to" states — CSS custom properties referenced
// inside clip-path: circle() proved unreliable across a class toggle in
// Chromium, so this sets concrete pixel values on both ends instead.
const DURATION = 380;

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

    const originX = event.clientX || window.innerWidth / 2;
    const originY = event.clientY || window.innerHeight / 2;
    overlay!.style.setProperty('--origin-x', `${originX}px`);
    overlay!.style.setProperty('--origin-y', `${originY}px`);
    overlay!.style.clipPath = `circle(0% at ${originX}px ${originY}px)`;
    overlay!.removeAttribute('aria-hidden');
    overlay!.removeAttribute('inert');
    overlay!.classList.add('is-active');
    // Force a style flush so the browser paints the 0% state before the
    // target state is applied — without this the two writes can coalesce
    // into one frame and the transition never visibly runs.
    void overlay!.offsetHeight;
    overlay!.style.clipPath = `circle(150% at ${originX}px ${originY}px)`;
    skip?.focus({ preventScroll: true });
    timer = window.setTimeout(finish, DURATION);
  }

  document.addEventListener('click', begin);
  skip?.addEventListener('click', finish);
}
