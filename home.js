(() => {
  const video = document.querySelector('.items video');
  if (!video || !('IntersectionObserver' in window)) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let onScreen = false;
  const sync = () => {
    if (onScreen && !reduce.matches) video.play().catch(() => {});
    else video.pause();
  };
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(video);
  reduce.addEventListener('change', sync);
})();
