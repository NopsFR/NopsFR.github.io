// "Oscar Senior" as a living point system. The name is rasterised once into
// an offscreen canvas and sampled into a few thousand home positions; each
// point is a spring that assembles left-to-right on load, breathes slightly
// at rest, scatters away from the pointer and settles back. Points carry a
// depth value (size, brightness, parallax), and a sparse layer of ambient
// points drifts around the name, linking to each other and to the cursor.
// 2D canvas with colour/depth-bucketed fillRect batches — no WebGL needed at
// this particle count. Pauses off-screen / in hidden tabs; a single static
// frame under prefers-reduced-motion.

interface Pt {
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  size: number;
  seed: number;
  delay: number;
}

interface Amb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  c: number;
}

const DAMP = 0.84;
const SPRING = 0.055;

function readVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}


export async function mountParticleName(canvas: HTMLCanvasElement, host: HTMLElement, text: string): Promise<(() => void) | undefined> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  try {
    await document.fonts.load(`800 120px Archivo`);
  } catch {
    /* fall through with whatever font is available */
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cream = readVar('--color-text-primary', '#f1efe8');
  const accent = readVar('--page-accent', '#ff2b3c');
  const accent2 = readVar('--page-accent-2', '#2fd8c9');
  const palette = [cream, accent, accent2];
  // Normalise any CSS colour to rgba() via a probe context — canvas fillStyle
  // doesn't accept color-mix() everywhere.
  const probe = document.createElement('canvas').getContext('2d')!;
  const rgba = (color: string, a: number) => {
    probe.fillStyle = '#000';
    probe.fillStyle = color;
    const c = String(probe.fillStyle);
    if (c.startsWith('#')) {
      const n = parseInt(c.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    const [r, g, b] = c.replace(/rgba?\(|\)/g, '').split(',').map((v) => v.trim());
    return `rgba(${r},${g},${b},${a})`;
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let pts: Pt[] = [];
  let amb: Amb[] = [];
  let buckets: Pt[][] = [];
  let bucketStyles: string[] = [];
  let ambStyles: string[] = [];
  let lineStyle = '';

  const pointer = { x: 0, y: 0, active: false, sx: 0, sy: 0 };
  let start = performance.now();
  let raf = 0;
  let running = false;
  let visible = true;
  let frame = 0;

  const build = () => {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Rasterise the name, fitted to the canvas width.
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true })!;
    let fontSize = H * 0.7;
    o.font = `800 ${fontSize}px Archivo, sans-serif`;
    const setSpacing = (fs: number) => {
      if ('letterSpacing' in o) (o as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${-0.035 * fs}px`;
    };
    setSpacing(fontSize);
    const measured = o.measureText(text).width;
    fontSize = Math.min(fontSize, fontSize * ((W * 0.965) / measured));
    o.font = `800 ${fontSize}px Archivo, sans-serif`;
    setSpacing(fontSize);
    o.textBaseline = 'middle';
    o.fillStyle = '#fff';
    o.fillText(text, W * 0.005, H * 0.53);

    const data = o.getImageData(0, 0, W, H).data;
    const gap = Math.max(3, Math.round(fontSize / 34));
    const small = W < 640;
    pts = [];
    for (let y = 0; y < H; y += gap) {
      for (let x = 0; x < W; x += gap) {
        if (data[(y * W + x) * 4 + 3] > 140) {
          const z = Math.pow(Math.random(), 1.5);
          const hx = x + (Math.random() - 0.5) * gap * 0.5;
          const hy = y + (Math.random() - 0.5) * gap * 0.5;
          const ang = Math.random() * Math.PI * 2;
          const r = (0.3 + Math.random() * 0.7) * Math.max(W, H) * 0.55;
          pts.push({
            hx,
            hy,
            x: reduced ? hx : hx + Math.cos(ang) * r,
            y: reduced ? hy : hy + Math.sin(ang) * r * 0.5,
            vx: 0,
            vy: 0,
            z,
            size: (small ? 0.9 : 1.15) + z * (small ? 1.4 : 1.9),
            seed: Math.random() * 100,
            delay: (hx / W) * 520 + Math.random() * 180,
          });
        }
      }
    }

    // Colour × depth buckets: mostly warm white, accent weighted left, accent-2 weighted right.
    buckets = Array.from({ length: 9 }, () => []);
    for (const p of pts) {
      const f = p.hx / W;
      const r = Math.random();
      const c = r < 0.05 + 0.17 * (1 - f) ? 1 : r < 0.1 + 0.17 * (1 - f) + 0.13 * f ? 2 : 0;
      const zb = p.z < 0.33 ? 0 : p.z < 0.66 ? 1 : 2;
      buckets[c * 3 + zb].push(p);
    }
    const alphas = [0.55, 0.8, 1];
    bucketStyles = buckets.map((_, i) => rgba(palette[Math.floor(i / 3)], alphas[i % 3]));

    const ambCount = small ? 14 : 42;
    amb = Array.from({ length: ambCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.2,
      z: Math.random(),
      c: Math.random() < 0.5 ? 1 : Math.random() < 0.5 ? 2 : 0,
    }));
    ambStyles = palette.map((c) => rgba(c, 0.55));
    lineStyle = rgba(accent2, 0.5);
  };

  const draw = (now: number, idle: boolean) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, W, H);

    pointer.sx += ((pointer.active ? pointer.x / W - 0.5 : 0) - pointer.sx) * 0.08;
    pointer.sy += ((pointer.active ? pointer.y / H - 0.5 : 0) - pointer.sy) * 0.08;
    const R = W < 640 ? 70 : 120;
    const R2 = R * R;
    const elapsed = now - start;

    if (!idle || reduced) {
      for (const p of pts) {
        if (elapsed < p.delay) continue;
        const tx = p.hx + Math.sin(t * 1.1 + p.seed) * 0.6 * p.z;
        const ty = p.hy + Math.cos(t * 0.9 + p.seed) * 0.6 * p.z;
        let ax = (tx - p.x) * SPRING;
        let ay = (ty - p.y) * SPRING;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            const f = 1 - d / R;
            const force = f * f * (2.4 + p.z * 4.2);
            ax += (dx / d) * force;
            ay += (dy / d) * force;
          }
        }
        p.vx = (p.vx + ax) * DAMP;
        p.vy = (p.vy + ay) * DAMP;
        p.x += p.vx;
        p.y += p.vy;
      }
    }

    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b];
      if (!list.length) continue;
      ctx.fillStyle = bucketStyles[b];
      for (const p of list) {
        const s = p.size;
        ctx.fillRect(p.x + pointer.sx * p.z * 10 - s / 2, p.y + pointer.sy * p.z * 6 - s / 2, s, s);
      }
    }

    // Ambient layer: slow drift, links to neighbours and to the cursor.
    const L = W < 640 ? 70 : 110;
    ctx.lineWidth = 1;
    for (const a of amb) {
      if (!reduced) {
        a.x += a.vx * (0.4 + a.z);
        a.y += a.vy * (0.4 + a.z);
        if (a.x < -10) a.x = W + 10;
        if (a.x > W + 10) a.x = -10;
        if (a.y < -10) a.y = H + 10;
        if (a.y > H + 10) a.y = -10;
      }
    }
    for (let i = 0; i < amb.length; i++) {
      const a = amb[i];
      const ax = a.x + pointer.sx * a.z * 18;
      const ay = a.y + pointer.sy * a.z * 10;
      for (let j = i + 1; j < amb.length; j++) {
        const b = amb[j];
        const dx = ax - (b.x + pointer.sx * b.z * 18);
        const dy = ay - (b.y + pointer.sy * b.z * 10);
        const d = Math.hypot(dx, dy);
        if (d < L) {
          ctx.globalAlpha = (1 - d / L) * 0.22;
          ctx.strokeStyle = lineStyle;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax - dx, ay - dy);
          ctx.stroke();
        }
      }
      if (pointer.active) {
        const d = Math.hypot(ax - pointer.x, ay - pointer.y);
        if (d < L * 1.5) {
          ctx.globalAlpha = (1 - d / (L * 1.5)) * 0.45;
          ctx.strokeStyle = lineStyle;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.35 + a.z * 0.55;
      ctx.fillStyle = ambStyles[a.c];
      const s = 1.2 + a.z * 2.4;
      ctx.beginPath();
      ctx.arc(ax, ay, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now: number) => {
    if (!running) return;
    frame++;
    const settled = now - start > 2200;
    const idle = settled && !pointer.active;
    // At rest the only motion is breathing + drift: render every other frame.
    if (!idle || frame % 2 === 0) draw(now, false);
    raf = requestAnimationFrame(loop);
  };

  const play = () => {
    if (running || reduced || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  build();
  if (reduced) {
    draw(performance.now(), true);
  } else {
    start = performance.now();
    play();
  }

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.active = true;
  };
  const onLeave = () => {
    pointer.active = false;
  };
  if (!reduced) {
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') onLeave();
    });
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) play();
    else pause();
  });
  io.observe(canvas);

  const onVis = () => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVis);

  let lastW = W;
  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const w = Math.round(canvas.getBoundingClientRect().width);
      if (Math.abs(w - lastW) < 2) return;
      lastW = w;
      build();
      for (const p of pts) {
        p.x = p.hx;
        p.y = p.hy;
      }
      if (reduced) draw(performance.now(), true);
    }, 160);
  });
  ro.observe(canvas);

  return () => {
    pause();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
  };
}
