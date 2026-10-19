// 홈 GNB — 스크롤 위치에 맞춰 해당 섹션 메뉴를 진하게 표시한다(aria-current="true").
// 섹션 머리가 헤더 아래 화면 위쪽 1/3 지점을 지나면 그 섹션이 현재 섹션이다. 첫 섹션 전(히어로·생각·Story)에는 아무것도 켜지 않는다.
(() => {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const pairs = links.map(a => [a, document.querySelector(a.getAttribute('href'))]).filter(p => p[1]);
  if (!pairs.length) return;
  let cur = null, ticking = false;
  function update() {
    ticking = false;
    const line = 64 + (window.innerHeight - 64) * 0.33;
    let hit = null;
    for (const [a, sec] of pairs) if (sec.getBoundingClientRect().top <= line) hit = a;
    // 페이지 맨 아래에 닿으면 마지막 섹션을 켠다(짧은 마지막 섹션이 기준선에 못 닿는 경우)
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) hit = pairs[pairs.length - 1][0];
    if (hit === cur) return; cur = hit;
    for (const [a] of pairs) a === hit ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  update();
})();
