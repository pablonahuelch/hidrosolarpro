const film = document.querySelector('.solar-film');
const solar = document.querySelector('.solar-photo');
const water = document.querySelector('.water-photo');
const production = document.querySelector('.production-photo');
const sun = document.querySelector('.moving-sun');
const energy = document.querySelector('.energy-line');
const copies = [...document.querySelectorAll('.film-copy')];
const steps = [...document.querySelectorAll('.film-progress span')];

function animateFilm() {
  const rect = film.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - innerHeight)));
  solar.style.transform = `scale(${1.04 + progress * .11})`;
  solar.style.filter = `brightness(${1 - progress * .28}) saturate(${1 + progress * .18})`;
  water.style.opacity = Math.max(0, Math.min(1, (progress - .26) / .14)) * Math.max(0, Math.min(1, (.82 - progress) / .14));
  water.style.transform = `scale(${1.12 - Math.max(0, progress - .46) * .12})`;
  production.style.opacity = Math.max(0, Math.min(1, (progress - .76) / .16));
  production.style.transform = `scale(${1.1 - Math.max(0, progress - .64) * .14})`;
  const finalStage = Math.max(0, (progress - .76) / .24);
  sun.style.transform = `translate(${-progress * 28 - finalStage * 46}vw, ${progress * 76 - finalStage * 104}vh) scale(${1 - progress * .3 + finalStage * .13})`;
  energy.style.opacity = progress > .22 && progress < .68 ? Math.sin((progress - .22) / .46 * Math.PI) : 0;
  copies.forEach((copy, index) => {
    const ranges = [[0,.18],[.13,.31],[.26,.82],[.76,1]][index];
    const visible = progress >= ranges[0] && progress <= ranges[1];
    copy.style.opacity = visible ? 1 : 0;
    copy.style.transform = visible ? 'translateY(0)' : 'translateY(22px)';
  });
  const active = progress < .30 ? 0 : progress < .80 ? 1 : 2;
  steps.forEach((step, index) => step.classList.toggle('active', index <= active));
}

addEventListener('scroll', animateFilm, { passive: true });
addEventListener('resize', animateFilm);
animateFilm();
