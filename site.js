// 자동으로 움직이는 것(띠, 도트 그림) 멈춤 단추.
// <button data-motion="이름"> 를 누르면 <html> 에 "이름-paused" 클래스를 붙였다 뗀다.
// 고른 상태는 localStorage "motion-이름" 에 기억하고, 첫 화면 전에 <head> 의 한 줄 스크립트가 다시 붙인다.
const root = document.documentElement;

document.querySelectorAll('[data-motion]').forEach((btn) => {
  const name = btn.dataset.motion;
  const cls = `${name}-paused`;

  btn.addEventListener('click', () => {
    const paused = root.classList.toggle(cls);
    try {
      localStorage.setItem(`motion-${name}`, paused ? 'paused' : 'playing');
    } catch (err) {
      // 저장소를 막은 브라우저(사생활 보호 모드 등): 이 페이지에서만 멈춤이 유지된다
      console.warn('motion state not saved', err);
    }
  });
});
