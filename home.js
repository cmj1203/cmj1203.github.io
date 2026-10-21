(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const enterOnce = (targets, onEnter, margin = '0px 0px -12% 0px') => {
    if (!('IntersectionObserver' in window)) { targets.forEach(onEnter); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { onEnter(e.target); io.unobserve(e.target); } });
    }, { rootMargin: margin, threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  };

  enterOnce(document.querySelectorAll('[data-enter]'), (el) => el.classList.add('in'));

  enterOnce(document.querySelectorAll('.run'), (run) => {
    run.querySelectorAll('.frame').forEach((f, i) => {
      f.style.setProperty('--d', `${Math.min(i * 40, 600)}ms`);
      f.classList.add('in');
    });
  }, '0px');

  const video = document.querySelector('.sheet video');
  if (video && !reduce.matches && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }).observe(video);
  }

  const root = document.querySelector('.index');
  if (!root) return;
  const frame = root.querySelector('.index__frame');
  const picture = frame.querySelector('img');
  const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
  const rows = [...root.querySelectorAll('.index__row')];
  let current = rows[0];
  let warmed = false;
  const show = (row) => {
    if (!fine.matches || row === current) return;
    if (!warmed) {
      warmed = true;
      rows.forEach((r) => { new Image().src = r.dataset.preview; });
    }
    current = row;
    picture.src = row.dataset.preview;
    frame.classList.toggle('has-pet', row.hasAttribute('data-pet'));
    if (!reduce.matches) {
      picture.animate(
        [{ opacity: 0.35, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0)' }],
        { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      );
    }
  };
  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => show(row));
    row.addEventListener('focus', () => show(row));
  });
})();
