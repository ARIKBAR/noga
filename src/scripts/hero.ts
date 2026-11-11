import gsap from 'gsap';

type Slide = { img: string; title: string; meta: string; href: string; kind: string };

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D t0, t1;
uniform vec2 res, r0, r1, mouse;
uniform float prog, time, zoom0, zoom1, vel, hover;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.03; a *= .5; } return s; }

vec2 cover(vec2 uv, vec2 tr, float z){
  float sa = res.x/res.y, ta = tr.x/tr.y; vec2 s = sa > ta ? vec2(1., ta/sa) : vec2(sa/ta, 1.);
  return (uv - .5) * s / z + .5;
}
void main(){
  vec2 uv = v;
  float asp = res.x / res.y;
  // pointer ripple
  vec2 d = (uv - mouse) * vec2(asp, 1.);
  float dist = length(d);
  float wave = sin(dist * 34. - time * 3.2) * exp(-dist * 5.5) * (0.010 + vel * 0.05) * hover;
  uv += normalize(d + 1e-5) * wave;
  // liquid transition
  float n = fbm(uv * vec2(asp, 1.) * 2.6 + time * .04);
  float e = prog * 1.5;
  float m = 1. - smoothstep(e - .5, e, n + (1. - uv.y) * .25);
  vec2 disp = (vec2(n) - .5) * .42;
  vec2 u0 = cover(uv + disp * prog, r0, zoom0);
  vec2 u1 = cover(uv - disp * (1. - prog), r1, zoom1);
  float sh = (vel * .02 + .0015) * hover;
  vec3 c0 = vec3(texture2D(t0, u0 + vec2(sh, 0.)).r, texture2D(t0, u0).g, texture2D(t0, u0 - vec2(sh, 0.)).b);
  vec3 c1 = vec3(texture2D(t1, u1 + vec2(sh, 0.)).r, texture2D(t1, u1).g, texture2D(t1, u1 - vec2(sh, 0.)).b);
  vec3 c = mix(c0, c1, m);
  // glowing edge on the transition front
  float edge = smoothstep(0., .5, m) * (1. - smoothstep(.5, 1., m));
  c += vec3(.23, .24, 1.) * edge * .55 * step(.001, prog) * step(prog, .999);
  // film grain + vignette
  c += (hash(uv * res + time) - .5) * .035;
  c *= 1. - .35 * pow(length((v - .5) * vec2(1., 1.2)), 2.2);
  gl_FragColor = vec4(c, 1.);
}`;

export function initHero(root: HTMLElement, motion: boolean) {
  const slides: Slide[] = JSON.parse(root.dataset.slides || '[]');
  if (!slides.length) return;
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const canvas = $<HTMLCanvasElement>('[data-gl]')!;
  const fallback = $<HTMLImageElement>('[data-fallback]')!;
  const verbs = $$('[data-verbs] > span');
  const bars = $$<HTMLButtonElement>('[data-bar]');
  const elCur = $('[data-cur]'), elName = $('[data-name]'), elMeta = $('[data-meta]'), elKind = $('[data-kind]');
  const link = $<HTMLAnchorElement>('[data-link]');
  const DUR = 6;
  let cur = 0, busy = false, timer: gsap.core.Tween | null = null, visible = true;

  /* ---------- text + bars ---------- */
  const setText = (i: number, animate: boolean) => {
    const s = slides[i];
    const swap = () => {
      if (elCur) elCur.textContent = String(i + 1).padStart(2, '0');
      if (elName) elName.textContent = s.title;
      if (elMeta) elMeta.textContent = s.meta;
      if (elKind) elKind.textContent = s.kind;
      if (link) { link.href = s.href; link.setAttribute('aria-label', `לתערוכה ${s.title}`); }
    };
    bars.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.classList.toggle('is-done', j < i); });
    if (!animate) { swap(); verbs.forEach((el, j) => el.classList.toggle('is-on', j === i)); return; }
    const info = [elName, elMeta, elKind].filter(Boolean);
    gsap.to(info, { yPercent: -60, opacity: 0, duration: 0.35, ease: 'power2.in', stagger: 0.03, onComplete: () => { swap(); gsap.fromTo(info, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05 }); } });
    const prev = verbs.find((el) => el.classList.contains('is-on'));
    const next = verbs[i];
    if (prev && prev !== next) gsap.to(prev, { yPercent: -110, duration: 0.8, ease: 'power3.inOut', onComplete: () => { prev.classList.remove('is-on'); gsap.set(prev, { clearProps: 'all' }); } });
    if (next) { next.classList.add('is-on'); gsap.fromTo(next, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power3.inOut' }); }
  };
  const runBar = (i: number) => {
    timer?.kill();
    bars.forEach((b) => gsap.set(b.querySelector('i'), { scaleX: 0 }));
    const fill = bars[i]?.querySelector('i');
    if (!fill || !motion) return;
    timer = gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: DUR, ease: 'none', onComplete: () => go((cur + 1) % slides.length) });
    if (!visible) timer.pause();
  };

  /* ---------- WebGL ---------- */
  const gl = motion ? (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) as WebGLRenderingContext | null) : null;
  let draw: (() => void) | null = null;
  const state = { prog: 0, zoom0: 1.08, zoom1: 1.08, vel: 0, hover: 0 };
  let from = 0, to = 0;
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  const tex: (WebGLTexture | null)[] = [];
  const size: [number, number][] = [];

  if (gl) {
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prg = gl.createProgram()!;
    gl.attachShader(prg, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prg, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { console.warn('hero shader failed'); }
    else {
      gl.useProgram(prg);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prg, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = (n: string) => gl.getUniformLocation(prg, n);
      const u = { t0: U('t0'), t1: U('t1'), res: U('res'), r0: U('r0'), r1: U('r1'), mouse: U('mouse'), prog: U('prog'), time: U('time'), zoom0: U('zoom0'), zoom1: U('zoom1'), vel: U('vel'), hover: U('hover') };
      const load = (i: number) => new Promise<void>((resolve) => {
        if (tex[i]) return resolve();
        const img = new Image(); img.decoding = 'async';
        img.onload = () => {
          const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          tex[i] = t; size[i] = [img.naturalWidth, img.naturalHeight]; resolve();
        };
        img.onerror = () => resolve();
        img.src = slides[i].img;
      });
      const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, 1.75);
        const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      };
      const t0 = performance.now();
      draw = () => {
        if (!tex[from] || !visible) return;
        resize();
        mouse.x += (mouse.tx - mouse.x) * 0.08; mouse.y += (mouse.ty - mouse.y) * 0.08;
        state.vel += (Math.hypot(mouse.tx - mouse.x, mouse.ty - mouse.y) * 4 - state.vel) * 0.1;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[from]!);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[to] || tex[from]!);
        gl.uniform1i(u.t0, 0); gl.uniform1i(u.t1, 1);
        gl.uniform2f(u.res, canvas.width, canvas.height);
        gl.uniform2f(u.r0, size[from][0], size[from][1]);
        const s1 = size[to] || size[from]; gl.uniform2f(u.r1, s1[0], s1[1]);
        gl.uniform2f(u.mouse, mouse.x, 1 - mouse.y);
        gl.uniform1f(u.prog, state.prog); gl.uniform1f(u.time, (performance.now() - t0) / 1000);
        gl.uniform1f(u.zoom0, state.zoom0); gl.uniform1f(u.zoom1, state.zoom1);
        gl.uniform1f(u.vel, Math.min(state.vel, 1)); gl.uniform1f(u.hover, state.hover);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      gsap.ticker.add(() => draw && draw());
      root.addEventListener('pointermove', (e) => { const r = root.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width; mouse.ty = (e.clientY - r.top) / r.height; });
      root.addEventListener('pointerenter', () => gsap.to(state, { hover: 1, duration: 0.8 }));
      root.addEventListener('pointerleave', () => gsap.to(state, { hover: 0, duration: 1.2 }));
      load(0).then(() => { root.classList.add('is-gl'); gsap.to(state, { zoom0: 1, duration: DUR + 2, ease: 'none' }); load(1); });
      (root as any).__load = load;
    }
  }

  /* ---------- navigation ---------- */
  function go(i: number) {
    if (i === cur || busy) return;
    busy = true;
    setText(i, motion);
    const load: ((n: number) => Promise<void>) | undefined = (root as any).__load;
    if (gl && load && root.classList.contains('is-gl')) {
      load(i).then(() => {
        from = cur; to = i; state.prog = 0; state.zoom1 = 1.1;
        gsap.to(state, { zoom1: 1, duration: DUR + 2, ease: 'none' });
        gsap.to(state, { prog: 1, duration: 1.6, ease: 'power2.inOut', onComplete: () => { from = i; to = i; state.zoom0 = state.zoom1; state.prog = 0; cur = i; busy = false; gsap.to(state, { zoom0: 1, duration: DUR, ease: 'none' }); load((i + 1) % slides.length); } });
      });
    } else {
      fallback.style.opacity = '0';
      setTimeout(() => { fallback.src = slides[i].img; fallback.style.opacity = '1'; cur = i; busy = false; }, 350);
    }
    runBar(i);
  }
  bars.forEach((b, i) => b.addEventListener('click', () => go(i)));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go((cur + 1) % slides.length);
    if (e.key === 'ArrowRight') go((cur - 1 + slides.length) % slides.length);
  });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting && !document.hidden; visible ? timer?.resume() : timer?.pause(); }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { visible = false; timer?.pause(); } else { visible = true; timer?.resume(); } });

  setText(0, false);
  runBar(0);

  if (motion) {
    gsap.from(root.querySelectorAll('.hx__title .line > span, [data-verbs]'), { yPercent: 115, duration: 1.3, ease: 'power4.out', stagger: 0.12, delay: 0.2 });
    gsap.from(root.querySelectorAll('.hx__top > *, .hx__bottom > *'), { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.7 });
  }
}
