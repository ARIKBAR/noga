import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type Slide = { key: string; img: string; title: string; en: string; meta: string; href: string; kind: string };
type Art = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; room: number; url: string; loaded: boolean; base: THREE.Vector3 };

const GAP = 23; // distance between rooms along the corridor
let VIEW = 10; // how far the camera stands from a room's main work (set per screen shape)
let LOOK = 0.6; // how far the camera turns toward the main work
const BG = 0x05061f;

export function initHero(root: HTMLElement, motion: boolean) {
  const slides: Slide[] = JSON.parse(root.dataset.slides || '[]');
  if (!slides.length) return;
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s);
  const $$ = <T extends HTMLElement = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const canvas = $<HTMLCanvasElement>('[data-gl]')!;
  const fallback = $<HTMLImageElement>('[data-fallback]')!;
  const bars = $$<HTMLButtonElement>('[data-bar]');
  const elCur = $('[data-cur]'), elName = $('[data-name]'), elMeta = $('[data-meta]'), elKind = $('[data-kind]');
  const link = $<HTMLAnchorElement>('[data-link]');
  const tip = $('[data-tip]');
  const n = slides.length;
  let cur = -1;

  const setText = (i: number, animate = true) => {
    if (i === cur) return;
    cur = i;
    const s = slides[i];
    const swap = () => {
      if (elCur) elCur.textContent = String(i + 1).padStart(2, '0');
      if (elName) elName.textContent = s.title;
      if (elMeta) elMeta.textContent = s.meta;
      if (elKind) elKind.textContent = s.kind;
      if (link) { link.href = s.href; link.setAttribute('aria-label', `לתערוכה ${s.title}`); }
    };
    bars.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.classList.toggle('is-done', j <= i); });
    const info = [elName, elMeta, elKind].filter(Boolean) as HTMLElement[];
    if (!animate || !motion) { swap(); return; }
    gsap.to(info, { yPercent: -50, opacity: 0, duration: 0.25, ease: 'power2.in', overwrite: true, onComplete: () => { swap(); gsap.fromTo(info, { yPercent: 50, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.04 }); } });
  };
  setText(0, false);

  /* ---------- static fallback (no WebGL / reduced motion) ---------- */
  let renderer: THREE.WebGLRenderer | null = null;
  if (motion) {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch { renderer = null; }
  }
  if (!renderer) {
    root.classList.add('is-static');
    bars.forEach((b, i) => b.addEventListener('click', () => { fallback.src = slides[i].img; setText(i, false); }));
    return;
  }

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 9, 40);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const loader = new THREE.TextureLoader();
  const arts: Art[] = [];
  const hit: THREE.Mesh[] = [];
  const world = new THREE.Group();
  scene.add(world);
  let xs = 1, ps = 1, mainX = 4.6; // horizontal spread, plane scale, x of the main works

  const addArt = (room: number, url: string, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x1b1d4a, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z); mesh.rotation.y = ry;
    mesh.userData = { room, bx: x, w, h };
    // thin frame behind the artwork
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.16, h + 0.16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
    frame.position.z = -0.02; mesh.add(frame);
    world.add(mesh); hit.push(mesh);
    arts.push({ mesh, mat, room, url, loaded: false, base: mesh.position.clone() });
  };

  slides.forEach((s, i) => {
    const side = i % 2 ? 1 : -1;
    const z = -i * GAP;
    addArt(i, `/media/${s.key}-wide.webp`, 7.4, 4.16, side * 4.6, 0.2, z, -side * 0.42);
    addArt(i, `/media/${s.key}-detail.webp`, 3.0, 3.75, -side * 4.2, 0.9, z + 2.6, side * 0.55);
    addArt(i, `/media/${s.key}-life.webp`, 4.6, 2.59, -side * 5.2, -1.1, z - 4.2, side * 0.45);
  });

  /* big typography living inside the space */
  const makeLabel = (text: string, sub: string, i: number) => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 640;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 330; g.font = `800 ${size}px Nostela, Plinko, sans-serif`;
    while (g.measureText(text).width > c.width - 80 && size > 80) { size -= 10; g.font = `800 ${size}px Nostela, Plinko, sans-serif`; }
    g.fillStyle = '#ffffff'; g.fillText(text, c.width / 2, 270);
    g.direction = 'ltr'; g.font = `500 74px Nostela, Plinko, sans-serif`; g.fillStyle = '#ffc940'; g.fillText(sub, c.width / 2, 540);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.06), mat);
    const side = i % 2 ? 1 : -1;
    m.position.set(side * 1.6, 3.1, -i * GAP - 6);
    m.userData.bx = side * 1.6;
    m.userData.label = true;
    world.add(m);
    gsap.to(mat, { opacity: 1, duration: 1.2, delay: 0.3 });
    return m;
  };
  const labels: THREE.Mesh[] = [];
  const fontsReady = (document as any).fonts?.load ? Promise.all([(document as any).fonts.load('800 100px Nostela'), (document as any).fonts.load('500 40px Nostela')]) : Promise.resolve();
  fontsReady.catch(() => {}).then(() => slides.forEach((s, i) => labels.push(makeLabel(s.title, s.en, i))));

  /* field of light lines: depth cue, and a nod to the museum's light installation */
  const total = GAP * (n - 1) + 14;
  {
    const N = 520, pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    const c1 = new THREE.Color(0x3a3dff), c2 = new THREE.Color(0x45cbff), c3 = new THREE.Color(0xa98bff);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 30, z = 10 - Math.random() * (total + 20);
      const near = Math.abs(x) < 2.2 ? (x < 0 ? -2.2 : 2.2) : x; // keep the walkway clear
      const y0 = (Math.random() - 0.5) * 16, len = 0.8 + Math.random() * 5;
      pos.set([near, y0, z, near, y0 + len, z], i * 6);
      const c = [c1, c2, c3][i % 3];
      col.set([c.r * 0.2, c.g * 0.2, c.b * 0.2, c.r, c.g, c.b], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    lines.userData.lines = true;
    scene.add(lines);
    (scene as any).__lines = lines;
  }

  /* ---------- lazy textures ---------- */
  const loadRoom = (room: number) => arts.filter((a) => a.room === room && !a.loaded).forEach((a) => {
    a.loaded = true;
    loader.load(a.url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; a.mat.map = t; a.mat.color.set(0xffffff); a.mat.needsUpdate = true; gsap.to(a.mat, { opacity: 1, duration: 0.9 }); });
  });
  arts.forEach((a) => gsap.to(a.mat, { opacity: 0.35, duration: 0.6 })); // placeholders
  loadRoom(0); loadRoom(1);

  /* ---------- state ---------- */
  const st = { t: 0, intro: 1 };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const camPos = new THREE.Vector3(0, 0, VIEW);
  const look = new THREE.Vector3();
  let hovered: Art | null = null;
  let active = true;

  const layout = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer!.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer!.setSize(w, h, false);
    const asp = w / h;
    camera.aspect = asp;
    camera.fov = asp < 0.8 ? 68 : asp < 1.2 ? 58 : 50;
    xs = asp < 0.8 ? 0.4 : asp < 1.2 ? 0.7 : 1;
    ps = asp < 0.8 ? 0.66 : asp < 1.2 ? 0.82 : 1;
    VIEW = asp < 0.8 ? 7.4 : asp < 1.2 ? 8.8 : 10;
    LOOK = asp < 0.8 ? 1 : asp < 1.2 ? 0.8 : 0.6;
    arts.forEach((a) => {
      // never let a work hang across the walkway, whatever the screen shape
      const half = (a.mesh.userData.w * ps * 0.5) * Math.cos(Math.abs(a.mesh.rotation.y));
      a.mesh.position.x = Math.sign(a.base.x) * Math.max(Math.abs(a.base.x) * xs, half + 1.15);
      a.mesh.scale.setScalar(ps * (a === hovered ? 1.05 : 1));
    });
    mainX = Math.abs(arts[0].mesh.position.x);
    labels.forEach((l) => { l.scale.setScalar(asp < 0.8 ? 0.5 : asp < 1.2 ? 0.82 : 1); l.position.y = asp < 0.8 ? 4.5 : asp < 1.2 ? 5.0 : 4.35; l.position.x = Math.sign(l.userData.bx) * (asp < 0.8 ? mainX : Math.abs(l.userData.bx)); });
    camera.updateProjectionMatrix();
  };
  layout();
  addEventListener('resize', layout);
  fontsReady.then(() => setTimeout(layout, 50));

  /* ---------- scroll drives the camera ---------- */
  const trigger = ScrollTrigger.create({
    trigger: root, start: 'top top', end: () => `+=${Math.round(innerHeight * (n - 1) * 0.95)}`, pin: true, scrub: 0.9, anticipatePin: 1,
    // Created after the page's other triggers (lazy import) but sits above them: refresh it first so they account for its pin spacing.
    refreshPriority: 1,
    onUpdate: (self) => { st.t = self.progress; },
  });
  new IntersectionObserver(([en]) => { active = en.isIntersecting; }, { threshold: 0.01 }).observe(root);
  bars.forEach((b, i) => b.addEventListener('click', () => {
    const y = trigger.start + (trigger.end - trigger.start) * (i / (n - 1));
    const lenis = (window as any).__lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  }));

  /* ---------- pointer: look around, hover, click ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(2, 2);
  const setHover = (a: Art | null) => {
    if (a === hovered) return;
    hovered = a;
    arts.forEach((x) => {
      gsap.to(x.mesh.scale, { x: ps * (x === a ? 1.06 : 1), y: ps * (x === a ? 1.06 : 1), duration: 0.5, ease: 'power3.out' });
      if (x.mat.map) gsap.to(x.mat.color, { r: a && x !== a ? 0.42 : 1, g: a && x !== a ? 0.42 : 1, b: a && x !== a ? 0.5 : 1, duration: 0.4 });
    });
    canvas.style.cursor = a ? 'pointer' : '';
    if (tip) { tip.textContent = a ? slides[a.room].title : ''; gsap.to(tip, { scale: a ? 1 : 0, duration: 0.35, ease: a ? 'back.out(1.6)' : 'power2.in' }); }
  };
  const pick = (cx: number, cy: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const res = ray.intersectObjects(hit, false)[0];
    return res && res.distance < 26 ? arts.find((a) => a.mesh === res.object) || null : null;
  };
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (e.pointerType === 'mouse') { setHover(pick(e.clientX, e.clientY)); if (tip) gsap.to(tip, { x: e.clientX - r.left, y: e.clientY - r.top, duration: 0.3, ease: 'power3' }); }
  });
  canvas.addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; setHover(null); });
  canvas.addEventListener('click', (e) => { const a = pick(e.clientX, e.clientY); if (a) location.href = slides[a.room].href; });

  /* ---------- render loop ---------- */
  gsap.fromTo(st, { intro: 1 }, { intro: 0, duration: 2.4, ease: 'power3.out', delay: 0.15 });
  const clock = new THREE.Clock();
  const lines: THREE.Object3D = (scene as any).__lines;
  gsap.ticker.add(() => {
    if (!active) return;
    const time = clock.getElapsedTime();
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    const z = VIEW - st.t * (GAP * (n - 1)) + st.intro * 9;
    const r = (VIEW - z) / GAP;                 // fractional room index
    const side = -Math.cos(Math.PI * r);        // -1 at even rooms, +1 at odd ones, smooth in between
    camPos.set(side * mainX * (LOOK - 0.6) * 0.9 - side * 0.5 * xs + ptr.x * 0.8, -ptr.y * 0.4 + Math.sin(time * 0.5) * 0.06, z);
    camera.position.lerp(camPos, 0.12);
    look.set(side * mainX * LOOK + ptr.x * 1.8, 0.35 - ptr.y * 0.9, camera.position.z - VIEW);
    camera.lookAt(look);
    lines.position.y = Math.sin(time * 0.25) * 0.4;
    arts.forEach((a, i) => { a.mesh.position.y = a.base.y + Math.sin(time * 0.6 + i * 1.7) * 0.07; });
    const idx = Math.max(0, Math.min(n - 1, Math.round(r)));
    setText(idx);
    loadRoom(Math.min(n - 1, idx + 1)); loadRoom(Math.min(n - 1, idx + 2));
    renderer!.render(scene, camera);
  });

  root.classList.add('is-gl');
  gsap.from(root.querySelectorAll('.hx__top > *, .hx__bottom > *, .hx__hint'), { opacity: 0, y: 22, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.9 });
}
