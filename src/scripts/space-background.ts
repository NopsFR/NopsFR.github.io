// Full-screen starfield background with mouse-parallax. Earlier versions
// layered in nebula glow sprites and a connected "network graph" motif —
// after review that read as clutter, not atmosphere, so it's just stars now.
import * as THREE from 'three';

function makeStarSprite(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function mountSpaceBackground(canvasSelector: string): (() => void) | null {
  const canvas = document.querySelector<HTMLCanvasElement>(canvasSelector);
  if (!canvas) return null;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return null;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0b0b0d, 1);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
  camera.position.z = 260;

  const pointer = new THREE.Vector2();
  const cameraOffset = new THREE.Vector3();

  const starCount = 1800;
  const positions = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xede9e0), new THREE.Color(0xff4550), new THREE.Color(0xffffff), new THREE.Color(0x9a9aa2)];
  const colors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 2600;
    positions[i3 + 1] = (Math.random() - 0.5) * 1700;
    positions[i3 + 2] = -Math.random() * 3200;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const starMaterial = new THREE.PointsMaterial({
    map: makeStarSprite(),
    size: 6,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas.parentElement ?? document.body;
    camera.aspect = (clientWidth || window.innerWidth) / (clientHeight || window.innerHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth || window.innerWidth, clientHeight || window.innerHeight, false);
  };

  const onPointer = (event: PointerEvent) => {
    pointer.set((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * 2);
  };

  let last = performance.now();
  let raf = 0;
  const animate = (now: number) => {
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    stars.rotation.y += delta * 0.008;
    cameraOffset.x += (pointer.x * 30 - cameraOffset.x) * delta * 2.5;
    cameraOffset.y += (-pointer.y * 20 - cameraOffset.y) * delta * 2.5;
    camera.position.x = cameraOffset.x;
    camera.position.y = cameraOffset.y;
    camera.lookAt(cameraOffset.x * 0.08, cameraOffset.y * 0.08, -900);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointer, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    starGeometry.dispose();
    starMaterial.dispose();
    renderer.dispose();
  };
}
