// D안 — 셰이더 글리치 워드마크.
// 포트폴리오 덱 표지의 색수차 셰이더를 2D 캔버스로 재현한다.
// 텍스트를 오프스크린에 그린 뒤 R/G/B 채널을 서로 다른 오프셋으로 합성하고, 가장자리 번짐(bloom)과
// 주기적인 가로 슬라이스 글리치를 더한다. 포인터 위치가 수차 방향을 바꾼다.
(() => {
  const c = document.getElementById('hero-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  const word = c.dataset.word || 'PORTFOLIO';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr, base, R, G, B, mx = 0.5, my = 0.5, visible = true;

  function tint(src, color) {
    const t = document.createElement('canvas'); t.width = src.width; t.height = src.height;
    const g = t.getContext('2d'); g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, t.width, t.height);
    return t;
  }
  function build() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr;
    base = document.createElement('canvas'); base.width = c.width; base.height = c.height;
    const b = base.getContext('2d');
    // 본문(.wrap)의 왼쪽 거터와 콘텐츠 폭에 맞춘다
    const wrap = c.parentElement.querySelector('.wrap');
    const cs = getComputedStyle(wrap), rect = wrap.getBoundingClientRect(), cRect = c.getBoundingClientRect();
    const left = (rect.left - cRect.left) + parseFloat(cs.paddingLeft);
    const contentW = rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // 글자 잉크의 양 끝이 좌우 거터선에 정확히 닿도록 크기를 맞춘다(세로 상한 34%)
    let fs = 200;
    b.font = `800 ${fs}px "Pretendard Variable", Pretendard, sans-serif`;
    const m0 = b.measureText(word), ink0 = m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight;
    fs = Math.min(fs * contentW / ink0, H * 0.34);
    b.font = `800 ${fs * dpr}px "Pretendard Variable", Pretendard, sans-serif`;
    b.textAlign = 'left'; b.textBaseline = 'alphabetic'; b.fillStyle = '#F5F6F7';
    const m = b.measureText(word);
    const ink = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / dpr;
    const x = (left + (contentW - ink) / 2 + m.actualBoundingBoxLeft / dpr) * dpr;  // 세로 상한에 걸리면 가운데, 아니면 양끝 정렬
    b.fillText(word, x, c.height * 0.46);
    R = tint(base, '#ff2a1a'); G = tint(base, '#ffe04a'); B = tint(base, '#2a6cff');
  }
  const t0 = performance.now();
  function draw(now) {
    const t = reduce ? 10 : (now - t0) / 1000;
    const settle = Math.max(0, 1 - t / 1.6);               // 진입 1.6초 동안 크게 흔들리다 안정
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.3);
    const amp = (3.5 + breathe * 2.5 + settle * 40) * dpr;   // 기본 수차 3.5 — 덱 셰이더와 같은 출발점
    const ax = (mx - 0.5) * 2, ay = (my - 0.5) * 2;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${(6 + settle * 10) * dpr}px)`; ctx.globalAlpha = 0.35;
    ctx.drawImage(R, -amp * 1.4 + ax * amp, ay * amp * 0.4);
    ctx.drawImage(B, amp * 1.4 + ax * amp, -ay * amp * 0.4);
    ctx.filter = 'none'; ctx.globalAlpha = 1;
    ctx.drawImage(R, -amp + ax * amp * 0.6, 0);
    ctx.drawImage(G, 0, 0);
    ctx.drawImage(B, amp + ax * amp * 0.6, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.85; ctx.drawImage(base, 0, 0); ctx.globalAlpha = 1;
    if (!reduce && ((t % 2.4) < 0.18 || settle > 0.2)) {     // 약 2.4초마다 0.18초 글리치
      for (let i = 0; i < 5; i++) {
        const sy = Math.random() * c.height * 0.8 + c.height * 0.05;
        const sh = (4 + Math.random() * 26) * dpr, off = (Math.random() - 0.5) * 60 * dpr;
        ctx.drawImage(c, 0, sy, c.width, sh, off, sy, c.width, sh);
      }
    }
  }
  function loop(now) { if (visible) draw(now); if (!reduce) requestAnimationFrame(loop); }

  window.addEventListener('resize', () => { build(); if (reduce) draw(performance.now()); });
  window.addEventListener('pointermove', e => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(c);

  // 히어로를 지나면 헤더를 라이트로 되돌린다
  const header = document.querySelector('.site-header');
  if (header) new IntersectionObserver(([e]) => header.classList.toggle('on-dark', e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' }).observe(c.parentElement);

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { build(); reduce ? draw(performance.now()) : requestAnimationFrame(loop); });
})();
