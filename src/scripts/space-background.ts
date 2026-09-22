// Adapted from EloyEMC/bilingual-astro-editorial-template's wormhole-space.ts (MIT).
// See THIRD_PARTY_NOTICES.md. Restyled for a dark/red/cream cybersecurity palette:
// a dense starfield, layered glowing nebula sprites (canvas-generated, no image
// assets), and a small connected "network graph" motif instead of the
// template's literal planets.
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

function makeNebulaSprite(colorStops: [number, string][]): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [stop, color] of colorStops) gradient.addColorStop(stop, color);
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

  // Dense starfield.
  const starCount = 1800;
  const positions = new Float32Array(starCount * 3);
  const palette = [new THREE.Color(0xede9e0), new THREE.Color(0xff4550), new THREE.Color(0xffffff), new THREE.Color(0x9a9aa2)];
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 2600;
    positions[i3 + 1] = (Math.random() - 0.5) * 1700;
    positions[i3 + 2] = -Math.random() * 3200;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    sizes[i] = 3 + Math.random() * 6;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const starMaterial = new THREE.PointsMaterial({
    map: makeStarSprite(),
    size: 7,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // Layered glowing nebula sprites — real colour/volume, no external images.
  const nebulaTexRed = makeNebulaSprite([
    [0, 'rgba(255,90,100,0.55)'],
    [0.35, 'rgba(200,40,55,0.28)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  const nebulaTexCream = makeNebulaSprite([
    [0, 'rgba(237,233,224,0.22)'],
    [0.4, 'rgba(180,170,150,0.1)'],
    [1, 'rgba(0,0,0,0)'],
  ]);
  const nebulaConfigs: Array<{ tex: THREE.CanvasTexture; pos: [number, number, number]; scale: number }> = [
    { tex: nebulaTexRed, pos: [-500, 180, -1400], scale: 2200 },
    { tex: nebulaTexRed, pos: [620, -260, -2000], scale: 1800 },
    { tex: nebulaTexCream, pos: [80, 380, -1800], scale: 1600 },
    { tex: nebulaTexCream, pos: [-300, -400, -2400], scale: 2000 },
  ];
  const nebulaSprites: THREE.Sprite[] = [];
  for (const cfg of nebulaConfigs) {
    const material = new THREE.SpriteMaterial({ map: cfg.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...cfg.pos);
    sprite.scale.set(cfg.scale, cfg.scale, 1);
    scene.add(sprite);
    nebulaSprites.push(sprite);
  }

  // Small "network graph" — ambient background texture, not a foreground
  // element: deliberately dim/small so it never competes with page content
  // regardless of where it lands behind the text or the spotlight card.
  const nodeCount = 6;
  const nodePositions: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i += 1) {
    nodePositions.push(
      new THREE.Vector3((Math.random() - 0.5) * 1600, (Math.random() - 0.5) * 900, -1300 - Math.random() * 1200),
    );
  }
  const nodeGeometry = new THREE.IcosahedronGeometry(10, 1);
  const nodeGroup = new THREE.Group();
  const nodeMeshes: THREE.Mesh[] = [];
  for (const pos of nodePositions) {
    const material = new THREE.MeshBasicMaterial({ color: 0xff4550, wireframe: true, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(nodeGeometry, material);
    mesh.position.copy(pos);
    nodeGroup.add(mesh);
    nodeMeshes.push(mesh);
  }
  // Connect each node to its nearest neighbour for a constellation feel.
  const linePositions: number[] = [];
  for (let i = 0; i < nodePositions.length; i += 1) {
    let nearest = -1;
    let nearestDist = Infinity;
    for (let j = 0; j < nodePositions.length; j += 1) {
      if (i === j) continue;
      const d = nodePositions[i].distanceTo(nodePositions[j]);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = j;
      }
    }
    if (nearest >= 0) {
      linePositions.push(nodePositions[i].x, nodePositions[i].y, nodePositions[i].z, nodePositions[nearest].x, nodePositions[nearest].y, nodePositions[nearest].z);
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.18 });
  const connectors = new THREE.LineSegments(lineGeometry, lineMaterial);
  nodeGroup.add(connectors);
  scene.add(nodeGroup);

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
    nodeGroup.rotation.y += delta * 0.03;
    for (const mesh of nodeMeshes) {
      mesh.rotation.y += delta * 0.2;
      mesh.rotation.x += delta * 0.1;
    }
    for (const sprite of nebulaSprites) {
      sprite.material.rotation += delta * 0.01;
    }
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
    nodeGeometry.dispose();
    lineGeometry.dispose();
    lineMaterial.dispose();
    renderer.dispose();
  };
}
