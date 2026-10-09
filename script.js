const film = document.querySelector('.solar-film');
const canvas = document.getElementById('sequenceCanvas');
const introCopy = document.querySelector('.film-intro');
const finalCopy = document.querySelector('.film-final');
const steps = [...document.querySelectorAll('.film-progress span')];
const skipBtn = document.querySelector('.film-skip');

const FRAME_START = 1;
const FRAME_END = 160;
const FRAME_COUNT = FRAME_END - FRAME_START + 1;
const PLAY_DURATION = 5700; // ms que tarda la cinemática completa (0 → 1)

// Al recargar, el navegador restauraba el scroll a mitad de página y la intro
// bloqueaba la pantalla igual. Siempre arrancamos arriba, salvo que se entre
// con un ancla (#contacto, etc.): en ese caso la intro se da por vista.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let skipIntro = false;
try { skipIntro = !!location.hash && !!document.querySelector(location.hash); } catch (e) { /* ancla inválida */ }
if (!skipIntro) scrollTo(0, 0);

if (film && canvas) {
  const ctx = canvas.getContext('2d');
  const images = new Array(FRAME_COUNT);
  let ready = false;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    const n = String(FRAME_START + i).padStart(3, '0');
    img.src = `assets/ezgif-frame-${n}.webp`;
    if (i === 0) img.onload = () => { ready = true; render(); if (!skipIntro && scrollY < 40) lockScroll(); };
    images[i] = img;
  }

  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = innerWidth, ch = innerHeight;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    ctx.clearRect(0, 0, cw, ch);

    // Los frames son horizontales (16:9). En pantallas angostas y altas
    // (celulares) "cover" recorta demasiado, así que ahí mostramos el
    // frame completo (contain) sobre un fondo del mismo frame, cubierto
    // y difuminado, en vez de barras negras.
    if (cr < 0.85) {
      let bw, bh, bx, by;
      if (ir > cr) { bh = ch; bw = ch * ir; bx = (cw - bw) / 2; by = 0; }
      else { bw = cw; bh = cw / ir; bx = 0; by = (ch - bh) / 2; }
      ctx.save();
      ctx.filter = 'blur(24px) brightness(.55) saturate(1.15)';
      ctx.drawImage(img, bx, by, bw, bh);
      ctx.restore();

      let dw, dh, dx, dy;
      if (ir > cr) { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
      else { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
      ctx.drawImage(img, dx, dy, dw, dh);
      return;
    }

    let dw, dh, dx, dy;
    if (ir > cr) { dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0; }
    else { dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // progress (0..1) es la única fuente de verdad: la cinemática se reproduce
  // sola con requestAnimationFrame, nunca se ata 1:1 al delta del scroll.
  let progress = 0;
  let playing = false;
  let playFrom = 0;
  let playStart = 0;
  let rafId = null;

  function render() {
    const frameIndex = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(progress * (FRAME_COUNT - 1))));
    drawFrame(frameIndex);

    if (introCopy) {
      const visible = progress < 0.42;
      introCopy.style.opacity = visible ? 1 : 0;
      introCopy.style.pointerEvents = visible ? 'auto' : 'none';
      introCopy.style.transform = visible ? 'none' : 'translateY(22px)';
    }
    if (finalCopy) {
      const visible = progress > 0.58;
      finalCopy.style.opacity = visible ? 1 : 0;
      finalCopy.style.pointerEvents = visible ? 'auto' : 'none';
      finalCopy.style.transform = visible ? 'translateY(0)' : 'translateY(22px)';
    }
    const active = progress < 0.5 ? 0 : 1;
    steps.forEach((step, index) => step.classList.toggle('active', index <= active));
  }

  // La sección queda anclada en pantalla completa mientras dura la cinemática:
  // se libera al llegar sola al final o al apretar "Saltar intro", lo que
  // pase primero. El sitio usa Lenis para el smooth-scroll (smooth-scroll.js),
  // así que el bloqueo real pasa por su API: overflow:hidden solo no alcanza
  // porque Lenis maneja el scroll por su cuenta.
  let locked = false;
  function lockScroll() {
    if (locked) return;
    locked = true;
    document.documentElement.style.overflow = 'hidden';
    window.lenis?.stop();
  }
  function unlockScroll() {
    if (!locked) return;
    locked = false;
    document.documentElement.style.overflow = '';
    window.lenis?.start();
  }

  function step(now) {
    const elapsed = now - playStart;
    const t = Math.min(1, elapsed / PLAY_DURATION);
    progress = playFrom + (1 - playFrom) * easeInOutCubic(t);
    render();
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      progress = 1;
      render();
      playing = false;
      rafId = null;
      // Llegó sola al final: se libera el scroll igual que con "Saltar intro".
      unlockScroll();
      skipBtn?.classList.remove('visible');
    }
  }

  function startPlay() {
    playFrom = progress;
    playStart = performance.now();
    playing = true;
    skipBtn?.classList.add('visible');
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  }

  function advance() {
    cancelAnimationFrame(rafId);
    rafId = null;
    playing = false;
    progress = 1;
    render();
    unlockScroll();
    skipBtn?.classList.remove('visible');
    const targetY = film.offsetTop + film.offsetHeight;
    if (window.lenis) window.lenis.scrollTo(targetY, { offset: 0 });
    else window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  function tryPlay() {
    if (!ready || playing || progress >= 1 || !locked) return false;
    startPlay();
    return true;
  }

  // El bloqueo real (Lenis detenido + overflow:hidden) ya impide que la
  // página se mueva; estos listeners solo detectan la intención de bajar
  // para disparar la cinemática, no necesitan preventDefault propio.
  function handleWheel(e) {
    if (e.deltaY > 0) tryPlay();
  }

  let touchStartY = null;
  function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
  function handleTouchMove(e) {
    if (touchStartY === null) return;
    if (touchStartY - e.touches[0].clientY > 8) tryPlay();
  }

  const DOWN_KEYS = ['ArrowDown', 'PageDown', ' '];
  function handleKeydown(e) {
    if (DOWN_KEYS.includes(e.key)) tryPlay();
  }

  addEventListener('wheel', handleWheel, { passive: true });
  addEventListener('touchstart', handleTouchStart, { passive: true });
  addEventListener('touchmove', handleTouchMove, { passive: true });
  addEventListener('keydown', handleKeydown);
  addEventListener('resize', () => { resizeCanvas(); render(); });
  skipBtn?.addEventListener('click', advance);

  // Un ancla interna (Ver hogares, menú, etc.) con la intro bloqueada: se da
  // la intro por vista y se libera el scroll antes de que Lenis navegue.
  // Va en captura para correr antes del handler de smooth-scroll.js.
  document.addEventListener('click', (e) => {
    if (!locked) return;
    const link = e.target.closest('a[href^="#"]');
    if (!link || link.getAttribute('href') === '#inicio') return;
    cancelAnimationFrame(rafId);
    rafId = null;
    playing = false;
    progress = 1;
    render();
    unlockScroll();
    skipBtn?.classList.remove('visible');
  }, true);

  if (skipIntro) progress = 1;
  resizeCanvas();
  render();
}

const navEl = document.querySelector('.nav');
const navToggle = document.querySelector('.nav-toggle');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = navEl.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('.nav nav a').forEach(link => {
    link.addEventListener('click', () => {
      navEl.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Navegación: fondo al scrollear, se oculta al bajar ----------
const filmEl = document.querySelector('.solar-film');
let lastY = 0;
function onNavScroll() {
  const y = scrollY;
  navEl.classList.toggle('scrolled', y > 40);
  navEl.classList.toggle('hidden', y > lastY && y > innerHeight && !navEl.classList.contains('open'));
  lastY = y;
  document.querySelector('.wa-float')?.classList.toggle('visible', y > (filmEl ? filmEl.offsetHeight * .8 : 400));
}

// Marca en el menú la sección visible
const navLinks = [...document.querySelectorAll('.nav nav a')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('current', a.getAttribute('href') === `#${entry.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const t = document.querySelector(a.getAttribute('href')); if (t) sectionObserver.observe(t); });

// ---------- Aparición al entrar en pantalla ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ---------- Vitrina de equipos ----------
const EQUIPOS = [
  { img: 'assets/equipo-perforadora-camion.webp', title: 'Perforadora sobre camión', word: 'PERFORACIÓN',
    alt: 'Perforadora de pozos montada sobre camión de tres ejes',
    text: 'Equipo de perforación autopropulsado: mástil, bomba de lodo y motor sobre un mismo chasis para llegar a campos y parajes alejados.',
    tags: ['Chasis de 3 ejes', 'Mástil rebatible', 'Gatos niveladores'] },
  { img: 'assets/equipo-bomba-motor.webp', title: 'Unidad de bombeo', word: 'BOMBEO',
    alt: 'Bomba de lodo triplex acoplada a motor diésel con radiador',
    text: 'Bomba de pistones acoplada a motor diésel: hace circular el fluido de perforación que enfría la herramienta y saca el material del pozo.',
    tags: ['Bomba triplex', 'Motor diésel', 'Enfriador de aceite'] },
  { img: 'assets/equipo-panel-comando.webp', title: 'Panel de comando', word: 'CONTROL',
    alt: 'Panel de comando hidráulico naranja con manómetros y palancas',
    text: 'Puesto de operación con manómetros y palancas para controlar avance, rotación y bomba desde un mismo lugar, protegido por baranda.',
    tags: ['6 manómetros', 'Mandos hidráulicos', 'Plataforma protegida'] },
  { img: 'assets/equipo-unidad-potencia.webp', title: 'Unidad de potencia', word: 'POTENCIA',
    alt: 'Unidad de potencia hidráulica con tanques, motor y bomba',
    text: 'Central hidráulica compacta con tanques, motor y bomba en un mismo bastidor: la fuerza que mueve todo el equipo en el terreno.',
    tags: ['Central hidráulica', 'Tanque integrado', 'Bastidor compacto'] },
];

const stage = document.querySelector('.showcase-stage');
if (stage) {
  const stageImg = stage.querySelector('.stage-img');
  const info = document.querySelector('.showcase-info');
  const title = info.querySelector('.info-title');
  const text = info.querySelector('.info-text');
  const tags = info.querySelector('.info-tags');
  const count = info.querySelector('.info-count');
  const bar = info.querySelector('.info-bar span');
  const word = document.querySelector('.equipment-word');
  const tabs = [...document.querySelectorAll('.showcase-list button')];
  const CYCLE = 7000;
  let current = 0;
  let timer = null;
  let inView = false;

  EQUIPOS.forEach((e) => { const i = new Image(); i.src = e.img; });

  function restartBar() {
    bar.classList.remove('run');
    void bar.offsetWidth;
    if (inView) bar.classList.add('run');
  }

  function schedule() {
    clearTimeout(timer);
    restartBar();
    if (inView) timer = setTimeout(() => show(current + 1), CYCLE);
  }

  function show(i) {
    i = (i + EQUIPOS.length) % EQUIPOS.length;
    if (i === current) { schedule(); return; }
    const e = EQUIPOS[i];
    current = i;
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));

    stage.classList.remove('switching'); void stage.offsetWidth; stage.classList.add('switching');
    stageImg.style.transform = '';
    stageImg.classList.add('out');
    info.classList.add('swap');
    word.style.opacity = 0;

    setTimeout(() => {
      stageImg.onload = () => {
        stageImg.classList.remove('out');
        stageImg.classList.add('from-right');
        void stageImg.offsetWidth;
        stageImg.classList.remove('from-right');
      };
      stageImg.src = e.img;
      stageImg.alt = e.alt;
      title.textContent = e.title;
      text.textContent = e.text;
      tags.innerHTML = e.tags.map((t) => `<li>${t}</li>`).join('');
      count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(EQUIPOS.length).padStart(2, '0')}`;
      word.textContent = e.word;
      word.style.opacity = 1;
      info.classList.remove('swap');
    }, 420);
    schedule();
  }

  tabs.forEach((t) => t.addEventListener('click', () => show(+t.dataset.i)));
  info.querySelector('.info-prev').addEventListener('click', () => show(current - 1));
  info.querySelector('.info-next').addEventListener('click', () => show(current + 1));

  // Solo rota automáticamente mientras la sección está en pantalla
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) schedule(); else { clearTimeout(timer); bar.classList.remove('run'); }
  }, { threshold: 0.35 }).observe(stage);

  // El equipo sigue sutilmente al mouse
  stage.addEventListener('mousemove', (ev) => {
    if (stageImg.classList.contains('out')) return;
    const r = stage.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5;
    const y = (ev.clientY - r.top) / r.height - 0.5;
    stageImg.style.transform = `rotateY(${(x * 10).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg) translateY(${(y * -8).toFixed(1)}px)`;
  });
  stage.addEventListener('mouseleave', () => { stageImg.style.transform = ''; });
}

// ---------- Proceso: la mecha baja con el scroll ----------
const track = document.querySelector('.process-track');
const drill = document.querySelector('.drill');
const stepsEls = [...document.querySelectorAll('.step')];
const depthValue = document.querySelector('.depth-value');
let spinTimeout = null;
function onProcessScroll() {
  if (!track) return;
  const r = track.getBoundingClientRect();
  const anchor = innerHeight * 0.55;
  const p = Math.min(1, Math.max(0, (anchor - r.top) / r.height));
  drill.style.setProperty('--p', p.toFixed(4));
  if (depthValue) depthValue.textContent = Math.round(p * 100);
  stepsEls.forEach((s) => {
    const sr = s.getBoundingClientRect();
    s.classList.toggle('active', sr.top < anchor);
  });
  drill.style.setProperty('--spin', 'running');
  clearTimeout(spinTimeout);
  spinTimeout = setTimeout(() => drill.style.setProperty('--spin', 'paused'), 160);
}

// ---------- Parallax suave en fotos y máquina ----------
const parallaxEls = [...document.querySelectorAll('.homes-photo img, .statement-machine')];
function onParallax() {
  parallaxEls.forEach((el) => {
    const r = el.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const mid = r.top + r.height / 2 - innerHeight / 2;
    el.style.setProperty('--py', (mid * -0.08).toFixed(1));
  });
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    onNavScroll();
    onProcessScroll();
    onParallax();
    ticking = false;
  });
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();
