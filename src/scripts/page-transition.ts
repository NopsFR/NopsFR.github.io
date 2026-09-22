// Adapted from EloyEMC/bilingual-astro-editorial-template's wormhole-transition.ts
// (MIT). See THIRD_PARTY_NOTICES.md. Canvas2D only — no WebGL — so it's cheap,
// but layered + additive-blended so it reads as a real glowing tunnel rather
// than a handful of thin lines.
interface TunnelStar {
  angle: number;
  radius: number;
  depth: number;
  width: number;
}

interface DustMote {
  angle: number;
  radius: number;
  depth: number;
  size: number;
  hue: 'ember' | 'cream';
}

const DURATION = 1900;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  let dust: DustMote[] = [];
  let rotation = 0;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const raw = Math.min(1, (performance.now() - start) / DURATION);
    const elapsed = easeInOutCubic(raw);
    // Fade in over the first 12%, hold, fade out over the last 18% — so it
    // never feels like an abrupt on/off flash.
    const veil = raw < 0.12 ? raw / 0.12 : raw > 0.82 ? Math.max(0, (1 - raw) / 0.18) : 1;
    rotation += 0.0035;

    context.globalCompositeOperation = 'source-over';
    context.fillStyle = '#08080a';
    context.fillRect(0, 0, width, height);

    // Layered pulsing nebula glow, additive so colours build up richly.
    context.globalCompositeOperation = 'lighter';
    const layers: Array<[number, string, string]> = [
      [0.55 + elapsed * 0.5, 'rgba(255, 69, 80,', 'rgba(255, 42, 58,'],
      [0.3 + elapsed * 0.4, 'rgba(255, 150, 90,', 'rgba(200, 40, 60,'],
    ];
    for (const [sizeMul, inner, mid] of layers) {
      const r = Math.min(width, height) * sizeMul;
      const grad = context.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `${inner} ${0.45 * veil})`);
      grad.addColorStop(0.45, `${mid} ${0.2 * veil})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = grad;
      context.fillRect(0, 0, width, height);
    }

    // Dust motes drifting outward — gives the tunnel volume, not just edges.
    for (const mote of dust) {
      const depth = Math.max(0.01, mote.depth - elapsed * 1.3);
      const radius = mote.radius / depth;
      const angle = mote.angle + rotation;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const size = mote.size * (1.4 - depth);
      if (size <= 0) continue;
      context.fillStyle = mote.hue === 'ember' ? `rgba(255, 130, 110, ${0.7 * veil})` : `rgba(237, 233, 224, ${0.6 * veil})`;
      context.beginPath();
      context.arc(x, y, Math.max(0.4, size), 0, Math.PI * 2);
      context.fill();
    }

    // Streaking light trails, thicker and glow-blurred.
    context.shadowColor = 'rgba(255, 80, 90, 0.9)';
    context.shadowBlur = 14;
    context.lineCap = 'round';
    for (const star of stars) {
      const depth = Math.max(0.01, star.depth - elapsed * 1.5);
      const radius = star.radius / depth;
      const angle = star.angle + rotation;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const previous = star.radius / Math.max(0.01, depth + 0.1);
      const px = cx + Math.cos(angle) * previous;
      const py = cy + Math.sin(angle) * previous;
      context.strokeStyle = `rgba(255, 140, 150, ${Math.min(1, elapsed + 0.35) * veil})`;
      context.lineWidth = star.width * (1 + elapsed * 3);
      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(x, y);
      context.stroke();
    }
    context.shadowBlur = 0;

    // A soft rotating ring at the tunnel mouth.
    context.strokeStyle = `rgba(237, 233, 224, ${0.55 * veil})`;
    context.lineWidth = 1.4;
    context.beginPath();
    context.ellipse(cx, cy, Math.min(width, height) * (0.08 + elapsed * 0.55), Math.min(width, height) * (0.02 + elapsed * 0.14), rotation * 6, 0, Math.PI * 2);
    context.stroke();

    context.globalCompositeOperation = 'source-over';

    if (raw < 1) frame = requestAnimationFrame(() => draw(start));
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
    rotation = 0;
    stars = Array.from({ length: 260 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * Math.min(innerWidth, innerHeight) * 0.7 + 10,
      depth: Math.random(),
      width: 1 + Math.random() * 1.6,
    }));
    dust = Array.from({ length: 160 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * Math.min(innerWidth, innerHeight) * 0.6 + 5,
      depth: Math.random(),
      size: 1 + Math.random() * 2.4,
      hue: Math.random() > 0.6 ? 'ember' : 'cream',
    }));
    draw(performance.now());
    skip?.focus({ preventScroll: true });
    timer = window.setTimeout(finish, DURATION);
  }

  document.addEventListener('click', begin);
  skip?.addEventListener('click', finish);
}
