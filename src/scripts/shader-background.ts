// A fullscreen, continuously-flowing plasma/aurora field rendered with raw
// WebGL (no three.js — a single triangle + fragment shader is a few hundred
// bytes of JS and costs one draw call per frame). Colour is drawn from the
// site's own red/cyan/gold accent tokens so it stays "on brand" rather than
// generic rainbow plasma. Pauses when the tab is hidden and under
// prefers-reduced-motion (a single still frame is drawn instead).
const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_red;
uniform vec3 u_cyan;
uniform vec3 u_gold;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 2.2;
  float t = u_time * 0.045;

  vec2 flow = vec2(fbm(p + vec2(t, -t * 0.6)), fbm(p - vec2(t * 0.7, t * 0.3)));
  float n1 = fbm(p + flow * 1.4 + t);
  float n2 = fbm(p * 1.6 - flow * 1.1 - t * 0.8);
  float n3 = fbm(p * 0.8 + flow * 0.7 + t * 1.3);

  vec3 col = vec3(0.018, 0.019, 0.023);
  col += u_red * smoothstep(0.4, 0.95, n1) * 0.3;
  col += u_cyan * smoothstep(0.45, 0.95, n2) * 0.26;
  col += u_gold * smoothstep(0.6, 0.98, n3) * 0.14;

  float vign = smoothstep(1.2, 0.2, length(uv - 0.5));
  col *= mix(0.6, 1.0, vign);

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToVec3(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

export function mountShaderBackground(selector: string): (() => void) | undefined {
  const canvas = document.querySelector<HTMLCanvasElement>(selector);
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, 'u_time');
  const uRes = gl.getUniformLocation(program, 'u_resolution');
  const style = getComputedStyle(document.documentElement);
  gl.uniform3fv(gl.getUniformLocation(program, 'u_red'), hexToVec3(style.getPropertyValue('--color-accent-interactive').trim() || '#ff2b3c'));
  gl.uniform3fv(gl.getUniformLocation(program, 'u_cyan'), hexToVec3(style.getPropertyValue('--color-accent-secondary').trim() || '#2fd8c9'));
  gl.uniform3fv(gl.getUniformLocation(program, 'u_gold'), hexToVec3(style.getPropertyValue('--color-accent-gold').trim() || '#f0b429'));

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr * 0.6);
    canvas.height = Math.floor(window.innerHeight * dpr * 0.6);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let running = true;
  const start = performance.now();

  const draw = (time: number) => {
    gl.uniform1f(uTime, (time - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (running && !reduced) raf = requestAnimationFrame(draw);
  };
  draw(start);

  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
    if (running && !reduced) raf = requestAnimationFrame(draw);
    else cancelAnimationFrame(raf);
  });

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}
