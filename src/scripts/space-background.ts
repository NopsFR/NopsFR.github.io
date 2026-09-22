// Adapted from EloyEMC/bilingual-astro-editorial-template's wormhole-space.ts (MIT).
// See THIRD_PARTY_NOTICES.md. Restyled for a dark/red/cream cybersecurity palette —
// no planet imagery (tonally wrong here); a subtle starfield + nebula haze + two
// faint glowing "network nodes" with a connecting line instead.
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
  scene.fog = new THREE.FogExp2(0x0b0b0d, 0.00055);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 4000);
  camera.position.z = 260;

  const pointer = new THREE.Vector2();
  const cameraOffset = new THREE.Vector3();

  // Starfield
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xede9e0), new THREE.Color(0xff4550), new THREE.Color(0xffffff), new THREE.Color(0x8f8f96)];
  const colors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 2200;
    positions[i3 + 1] = (Math.random() - 0.5) * 1400;
    positions[i3 + 2] = -Math.random() * 3000;
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
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // Two faint glowing "network nodes" with a connecting line — a network-map
  // motif in place of the template's literal planets.
  const nodeGeometry = new THREE.IcosahedronGeometry(26, 1);
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xff2a3a, wireframe: true, transparent: true, opacity: 0.35 });
  const nodeA = new THREE.Mesh(nodeGeometry, nodeMaterial);
  nodeA.position.set(-320, 110, -900);
  const nodeB = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
  (nodeB.material as THREE.MeshBasicMaterial).color.set(0xede9e0);
  (nodeB.material as THREE.MeshBasicMaterial).opacity = 0.25;
  nodeB.position.set(340, -140, -1400);
  scene.add(nodeA, nodeB);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints([nodeA.position, nodeB.position]);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.12 });
  const connector = new THREE.Line(lineGeometry, lineMaterial);
  scene.add(connector);

  const pointLight = new THREE.PointLight(0xff2a3a, 1.5, 1800);
  pointLight.position.set(0, 0, -600);
  scene.add(pointLight);

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
    stars.rotation.y += delta * 0.006;
    nodeA.rotation.y += delta * 0.15;
    nodeA.rotation.x += delta * 0.08;
    nodeB.rotation.y -= delta * 0.1;
    cameraOffset.x += (pointer.x * 24 - cameraOffset.x) * delta * 2.5;
    cameraOffset.y += (-pointer.y * 16 - cameraOffset.y) * delta * 2.5;
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
    nodeGeometry.dispose();
    nodeMaterial.dispose();
    renderer.dispose();
  };
}
