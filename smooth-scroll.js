import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.15,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  smoothWheel: true,
});
window.lenis = lenis;

lenis.on('scroll', () => {
  if (typeof window.animateFilm === 'function') window.animateFilm();
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -82 });
  });
});
