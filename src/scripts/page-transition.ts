// Adapted from EloyEMC/bilingual-astro-editorial-template's wormhole-transition.ts
// (MIT). See THIRD_PARTY_NOTICES.md. Canvas2D only — no WebGL — so it's cheap.
interface TunnelStar {
  angle: number;
  radius: number;
  depth: number;
}

export function mountPageTransition(): void {
  const overlay = document.querySelector<HTMLElement>('[data-page-transition]');
  if (!overlay) return;
  const canvas = overlay.querySelector<HTMLCanvasElement>('.page-transition__canvas');
  const skip = overlay.querySelector<HTMLButtonElement>('.page-transition__skip');
  const context = canvas?.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let destination = '';
  let timer: number | undefined;
  let frame = 0;
  let stars: TunnelStar[] = [];
  let selectedLink: HTMLAnchorElement | undefined;

  const finish = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    selectedLink?.classList.remove('is-transitioning');
    if (destination) window.location.assign(destination);
  };

  const draw = (start: number) => {
    if (!canvas || !context) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cx = width / 2;
    const cy = height / 2;
    canvas.width = width * Math.min(window.devicePixelRatio || 1, 2);
    canvas.height = height * Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    const elapsed = Math.min(1, (performance.now() - start) / 900);
    context.fillStyle = '#0b0b0d';
    context.fillRect(0, 0, width, height);

    const glowRadius = Math.min(width, height) * (0.05 + elapsed * 0.9);
    const glow = context.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    glow.addColorStop(0, `rgba(255, 69, 80, ${0.5 * (1 - elapsed * 0.3)})`);
    glow.addColorStop(0.4, `rgba(255, 42, 58, ${0.22 * (1 - elapsed * 0.3)})`);
    glow.addColorStop(1, 'rgba(255, 42, 58, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    for (const star of stars) {
      const depth = Math.max(0.01, star.depth - elapsed * 1.6);
      const radius = star.radius / depth;
      const x = cx + Math.cos(star.angle) * radius;
      const y = cy + Math.sin(star.angle) * radius;
      const previous = star.radius / Math.max(0.01, depth + 0.08);
      context.strokeStyle = `rgba(255, 120, 130, ${Math.min(1, elapsed + 0.3)})`;
      context.lineWidth = 1.5 + elapsed * 3.5;
      context.beginPath();
      context.moveTo(cx + Math.cos(star.angle) * previous, cy + Math.sin(star.angle) * previous);
      context.lineTo(x, y);
      context.stroke();
    }
    context.strokeStyle = 'rgba(237, 233, 224, .6)';
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(cx, cy, Math.min(width, height) * (0.1 + elapsed * 0.6), Math.min(width, height) * (0.025 + elapsed * 0.16), 0, 0, Math.PI * 2);
    context.stroke();
    if (elapsed < 1) frame = requestAnimationFrame(() => draw(start));
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
    stars = Array.from({ length: 220 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * Math.min(innerWidth, innerHeight) * 0.7 + 10,
      depth: Math.random(),
    }));
    draw(performance.now());
    skip?.focus({ preventScroll: true });
    timer = window.setTimeout(finish, 950);
  }

  document.addEventListener('click', begin);
  skip?.addEventListener('click', finish);
}
