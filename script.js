const film = document.querySelector('.solar-film');
const canvas = document.getElementById('sequenceCanvas');
const introCopy = document.querySelector('.film-intro');
const finalCopy = document.querySelector('.film-final');
const steps = [...document.querySelectorAll('.film-progress span')];
const skipBtn = document.querySelector('.film-skip');

const FRAME_START = 1;
const FRAME_END = 192;
const FRAME_COUNT = FRAME_END - FRAME_START + 1;
const PLAY_DURATION = 6800; // ms que tarda la cinemática completa (0 → 1)

if (film && canvas) {
  const ctx = canvas.getContext('2d');
  const images = new Array(FRAME_COUNT);
  let ready = false;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    const n = String(FRAME_START + i).padStart(3, '0');
    img.src = `assets/ezgif-frame-${n}.webp`;
    if (i === 0) img.onload = () => { ready = true; drawFrame(0); lockScroll(); };
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
      introCopy.style.transform = visible ? 'none' : 'translateY(22px)';
    }
    if (finalCopy) {
      const visible = progress > 0.58;
      finalCopy.style.opacity = visible ? 1 : 0;
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
    if (!ready || playing || progress >= 1) return false;
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

  resizeCanvas();
  render();
}

function attachTilt(el, { maxTilt = 10, scale = 1.02, shadow = false } = {}) {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${(-y * maxTilt).toFixed(2)}deg) rotateY(${(x * maxTilt).toFixed(2)}deg) scale(${scale})`;
    if (shadow) el.style.boxShadow = `${(-x * 26).toFixed(0)}px ${(24 - y * 10).toFixed(0)}px 46px rgba(0,0,0,.22)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
    if (shadow) el.style.boxShadow = '';
  });
}

document.querySelectorAll('.project-grid img').forEach((img) => attachTilt(img, { maxTilt: 9, scale: 1.06 }));

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
