import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const html = document.documentElement;
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));
const still = () => html.classList.contains('a11y-still') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const motion = !still();

/* ---------- smooth scroll ---------- */
let lenis: Lenis | null = null;
if (motion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  (window as any).__lenis = lenis;
}
const scrollTo = (target: string | number) => {
  if (lenis) lenis.scrollTo(target as any, { offset: -90 });
  else if (typeof target === 'number') window.scrollTo({ top: target });
  else document.querySelector(target)?.scrollIntoView();
};
$$<HTMLAnchorElement>('a[href^="/#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    if (location.pathname !== '/') return;
    const id = a.getAttribute('href')!.slice(1);
    if (!document.querySelector(id)) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id);
    history.replaceState(null, '', id);
  });
});
$('[data-top]')?.addEventListener('click', () => scrollTo(0));

/* ---------- header ---------- */
const header = $('[data-header]');
let lastY = 0;
const progress = $('[data-progress]');
const onScroll = () => {
  const y = window.scrollY;
  if (header && !html.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > 500 && y > lastY);
  lastY = y;
  if (progress) {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleY(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- mobile menu ---------- */
const burger = $('[data-burger]');
function closeMenu() {
  html.classList.remove('menu-open');
  burger?.setAttribute('aria-expanded', 'false');
  burger?.setAttribute('aria-label', 'פתיחת תפריט');
  lenis?.start();
}
burger?.addEventListener('click', () => {
  const open = html.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'סגירת תפריט' : 'פתיחת תפריט');
  open ? lenis?.stop() : lenis?.start();
});
$$('[data-menu] a').forEach((a) => a.addEventListener('click', closeMenu));
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); toggleA11y(false); } });

/* ---------- accessibility panel ---------- */
const aBtn = $('[data-a11y-btn]');
const aPanel = $('[data-a11y-panel]');
function toggleA11y(force?: boolean) {
  if (!aPanel || !aBtn) return;
  const open = force ?? aPanel.hidden;
  aPanel.hidden = !open;
  aBtn.setAttribute('aria-expanded', String(open));
}
aBtn?.addEventListener('click', () => toggleA11y());
$$('[data-a11y]').forEach((b) => {
  const cls = b.dataset.a11y!;
  b.setAttribute('aria-pressed', String(html.classList.contains(cls)));
  b.addEventListener('click', () => {
    const on = html.classList.toggle(cls);
    b.setAttribute('aria-pressed', String(on));
    const active = ['a11y-big', 'a11y-contrast', 'a11y-links', 'a11y-still'].filter((c) => html.classList.contains(c));
    try { localStorage.setItem('a11y', JSON.stringify(active)); } catch {}
    if (cls === 'a11y-still') location.reload();
    else ScrollTrigger.refresh();
  });
});

/* ---------- hero ---------- */
const heroEl = $('[data-hero]');
if (heroEl) import('./hero').then((m) => { m.initHero(heroEl, motion); ScrollTrigger.refresh(); });
const rot = $('[data-rot]');
if (rot) {
  const words = $$('span', rot);
  let i = 0;
  if (motion && words.length > 1) {
    setInterval(() => {
      const cur = words[i];
      i = (i + 1) % words.length;
      const next = words[i];
      gsap.to(cur, { yPercent: -110, duration: 0.7, ease: 'power3.inOut', onComplete: () => { cur.classList.remove('is-on'); gsap.set(cur, { clearProps: 'all' }); } });
      next.classList.add('is-on');
      gsap.fromTo(next, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'power3.inOut' });
    }, 2400);
  }
}
if (motion) {
  const lines = $$('.hero h1 .line > span, .hero h1 .rot');
  if (lines.length) {
    gsap.from(lines, { yPercent: 115, duration: 1.2, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
    gsap.from('.hero__eyebrow, .hero__lead, .hero__actions, .hero__stats > *', { opacity: 0, y: 26, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.6 });
  }
  const frame = $('[data-frame]');
  if (frame) {
    gsap.fromTo(frame, { scale: 0.7, borderRadius: 40 }, {
      scale: 1, borderRadius: 26, ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 12%', scrub: 0.6 },
    });
  }
}

/* ---------- reveal ---------- */
if (motion) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true }),
  });
} else {
  $$('[data-reveal]').forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
}

/* ---------- giant marquees (scroll driven) ---------- */
$$('[data-giant]').forEach((wrap) => {
  $$('.giant__row', wrap).forEach((row, idx) => {
    const dir = idx % 2 === 0 ? -1 : 1;
    if (!motion) { gsap.set(row, { xPercent: -15 }); return; }
    gsap.fromTo(row, { xPercent: dir < 0 ? -2 : -32 }, {
      xPercent: dir < 0 ? -32 : -2, ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
  });
});

/* ---------- parallax ---------- */
if (motion) {
  $$('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax || '10');
    gsap.fromTo(el, { yPercent: -amt }, {
      yPercent: amt, ease: 'none',
      scrollTrigger: { trigger: el.parentElement!, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

/* ---------- word-by-word text ---------- */
$$('[data-words]').forEach((el) => {
  const parts: string[] = [];
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) (n.textContent || '').split(/(\s+)/).forEach((w) => parts.push(w.trim() ? `<span class="w">${w}</span>` : w));
    else if (n instanceof HTMLElement) (n.textContent || '').split(/(\s+)/).forEach((w) => parts.push(w.trim() ? `<span class="w ${n.className}">${w}</span>` : w));
  });
  el.innerHTML = parts.join('');
  const ws = $$('.w', el);
  if (!motion) { ws.forEach((w) => (w.style.opacity = '1')); return; }
  gsap.to(ws, {
    opacity: 1, ease: 'none', stagger: 0.5,
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 45%', scrub: 0.5 },
  });
});

/* ---------- counters ---------- */
$$('[data-count]').forEach((el) => {
  const end = parseFloat(el.dataset.count!);
  const fmt = (v: number) => Math.round(v).toLocaleString('en-US');
  if (!motion) { el.textContent = fmt(end); return; }
  const o = { v: 0 };
  el.textContent = '0';
  ScrollTrigger.create({
    trigger: el, start: 'top 88%', once: true,
    onEnter: () => gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v)) }),
  });
});

/* ---------- shared pointer tracking for hover effects ---------- */
const pointerWatchers: ((x: number, y: number) => void)[] = [];
{
  let px = -1, py = -1, queued = false;
  const run = () => { queued = false; pointerWatchers.forEach((fn) => fn(px, py)); };
  const queue = () => { if (!queued && pointerWatchers.length) { queued = true; requestAnimationFrame(run); } };
  addEventListener('mousemove', (e) => { px = e.clientX; py = e.clientY; queue(); }, { passive: true });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('wheel', queue, { passive: true });
  addEventListener('blur', () => { px = py = -1; queue(); });
  document.addEventListener('mouseleave', () => { px = py = -1; queue(); });
}

/* ---------- cursor bubble on cards ---------- */
const cursor = $('[data-cursor]');
if (cursor && fine && motion) {
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  // Hover state is derived from what is actually under the pointer, and re-checked on scroll:
  // scrolling moves the page under a still pointer without firing mouseleave.
  let on: HTMLElement | null = null;
  const sync = (x: number, y: number) => {
    const el = x < 0 ? null : (document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cursor-label]') ?? null);
    if (el === on) return;
    on = el;
    if (el) { cursor.textContent = el.dataset.cursorLabel || ''; gsap.to(cursor, { scale: 1, duration: 0.4, ease: 'back.out(1.6)', overwrite: true }); }
    else gsap.to(cursor, { scale: 0, duration: 0.25, overwrite: true });
  };
  pointerWatchers.push(sync);
  addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); });
}

/* ---------- row hover preview ---------- */
const preview = $('[data-preview]');
if (preview && fine && motion) {
  const xTo = gsap.quickTo(preview, 'x', { duration: 0.5, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.5, ease: 'power3' });
  const imgs = $$('img', preview);
  addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); });
  const rows = $$('[data-row]');
  let onRow = -1;
  const sync = (x: number, y: number) => {
    const el = x < 0 ? null : (document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-row]') ?? null);
    const i = el ? rows.indexOf(el) : -1;
    if (i === onRow) return;
    onRow = i;
    if (i >= 0) {
      imgs.forEach((im, j) => im.classList.toggle('is-on', i === j));
      gsap.to(preview, { opacity: 1, scale: 1, rotate: i % 2 ? 4 : -4, duration: 0.45, ease: 'power3.out', overwrite: true });
    } else gsap.to(preview, { opacity: 0, scale: 0.7, duration: 0.25, overwrite: true });
  };
  pointerWatchers.push(sync);
}

/* ---------- events filter ---------- */
const list = $('[data-events]');
if (list) {
  const rows = $$('.ev', list);
  const empty = $('[data-empty]');
  const search = $<HTMLInputElement>('[data-search]');
  let type = 'הכול';
  const apply = () => {
    const q = (search?.value || '').trim();
    let shown = 0;
    rows.forEach((r) => {
      const ok = (type === 'הכול' || r.dataset.type === type) && (!q || (r.textContent || '').includes(q));
      r.hidden = !ok;
      if (ok) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    const live = $('[data-live]');
    if (live) live.textContent = `מוצגים ${shown} אירועים`;
    if (motion) gsap.fromTo(rows.filter((r) => !r.hidden), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out', overwrite: true });
    ScrollTrigger.refresh();
  };
  $$('[data-chip]').forEach((c) => c.addEventListener('click', () => {
    type = c.dataset.chip!;
    $$('[data-chip]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    apply();
  }));
  search?.addEventListener('input', apply);
}

/* ---------- quotes ---------- */
const qs = $$('[data-q]');
if (qs.length) {
  let i = 0;
  const counter = $('[data-q-count]');
  const show = (n: number) => {
    i = (n + qs.length) % qs.length;
    qs.forEach((q, j) => { q.classList.toggle('is-on', j === i); q.setAttribute('aria-hidden', String(j !== i)); });
    if (counter) counter.textContent = `${i + 1} — ${qs.length}`;
  };
  $('[data-q-prev]')?.addEventListener('click', () => show(i - 1));
  $('[data-q-next]')?.addEventListener('click', () => show(i + 1));
  show(0);
}

/* ---------- newsletter ---------- */
const form = $<HTMLFormElement>('[data-form]');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = $('[data-form-ok]');
  if (ok) ok.textContent = 'תודה, נרשמת! נתראה במוזיאון.';
  form.reset();
});

addEventListener('load', () => ScrollTrigger.refresh());

/* ---------- make sure videos actually play ---------- */
const vids = $$<HTMLVideoElement>('[data-video]');
const kick = () => vids.forEach((v) => { v.muted = true; if (still()) v.pause(); else if (v.paused) v.play().catch(() => {}); });
kick();
addEventListener('load', kick);
['pointerdown', 'touchstart', 'scroll', 'keydown'].forEach((ev) => addEventListener(ev, kick, { once: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
