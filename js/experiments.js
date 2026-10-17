// Experiments — 실험 구조를 설명하는 추상 선 도식.
// 미출시 화면을 재현하지 않고, 실험이 무엇을 바꿨는지(관계·원리)만 그린다.
// 데스크톱: 활성 실험 하나만(호버/포커스 우선, 없으면 화면 가운데 줄). 바뀔 때 한 번 그려지고 최종 상태 유지.
// 모바일: 각 줄 아래 같은 도식을 최종 상태로 정지 표시.
(() => {
  const rows = [...document.querySelectorAll('.exp-row')];
  if (!rows.length) return;
  const main = document.getElementById('exp-canvas');
  const cap = document.getElementById('exp-cap');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FONT = '"Pretendard Variable", Pretendard, sans-serif';
  const C = { ink: '#191919', sub: '#616161', cap: '#999999', line: '#E1E1E1', red: '#C13A18' };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (k, a, b) => ease(clamp((k - a) / (b - a), 0, 1));   // k의 [a,b] 구간을 0..1로
  const lerp = (a, b, t) => a + (b - a) * t;

  function setup(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W, H };
  }
  function label(ctx, s, x, y, color = C.cap, align = 'left', size = 12) {
    ctx.font = `500 ${size}px ${FONT}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(s, x, y);
  }
  function box(ctx, x, y, w, h, color = C.ink, lw = 1.5) { ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
  function line(ctx, x1, y1, x2, y2, color = C.ink, lw = 1.5, t = 1) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, t), lerp(y1, y2, t)); ctx.stroke();
  }
  function dot(ctx, x, y, r, color = C.ink) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  // CASE 01 — 위쪽 영역이 커지고, 두 결과가 서로 다른 방향으로 갈라진다
  function d1(ctx, W, H, k, mini) {
    const fw = Math.min(W * 0.42, H * 0.5), fx = mini ? 8 : W * 0.1, fy = H * 0.1, fh = H * 0.8;
    const top = lerp(fh * 0.16, fh * 0.42, seg(k, 0, 0.5));
    box(ctx, fx, fy, fw, fh, C.line, 1);
    box(ctx, fx, fy, fw, top);
    ctx.fillStyle = 'rgba(25,25,25,0.06)'; ctx.fillRect(fx, fy, fw, top);
    // 아래 콘텐츠 줄
    for (let i = 0; i < 4; i++) { const y = fy + top + 14 + i * 16; if (y < fy + fh - 6) line(ctx, fx + 10, y, fx + fw - 10 - i * 12, y, C.line, 1); }
    if (!mini) label(ctx, '결제 영역', fx, fy - 8);
    // 결과선 두 개
    const gx = fx + fw + (mini ? 24 : W * 0.08), gw = W - gx - (mini ? 8 : W * 0.06), mid = H * 0.5;
    const t2 = seg(k, 0.45, 0.9);
    line(ctx, gx, mid, gx + gw, mid, C.line, 1);
    line(ctx, gx, mid - 4, gx + gw, mid - H * 0.26, C.ink, 1.5, t2);
    line(ctx, gx, mid + 4, gx + gw, mid + H * 0.2, C.red, 1.5, t2);
    if (t2 > 0.95) {
      label(ctx, '탭 이용', gx + gw, mid - H * 0.26 - 8, C.ink, 'right');
      label(ctx, '광고 매출', gx + gw, mid + H * 0.2 + 16, C.red, 'right');
    }
  }

  // CASE 02 — 그리드가 리스트로 풀리고, 일부 항목의 순서가 바뀐다
  function d2(ctx, W, H, k, mini) {
    const n = 8, cs = Math.min(W, H) * (mini ? 0.13 : 0.1), g = cs * 0.35;
    const gx = W * 0.5 - (4 * cs + 3 * g) / 2, gy = H * 0.5 - (2 * cs + g) / 2;
    const lx = W * 0.5 - (mini ? W * 0.32 : W * 0.26), rowH = H * 0.8 / n, ly = H * 0.1;
    const tList = seg(k, 0, 0.55), tSwap = seg(k, 0.6, 1);
    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    // 6번 항목이 맨 위로 올라가는 재배열
    const pos = i => { if (i === 6) return lerp(6, 0, tSwap); if (i < 6) return lerp(i, i + 1, tSwap); return i; };
    order.forEach(i => {
      const sx = gx + (i % 4) * (cs + g), sy = gy + Math.floor(i / 4) * (cs + g);
      const p = pos(i), tx = lx, ty = ly + p * rowH + (rowH - cs * 0.7) / 2;
      const x = lerp(sx, tx, tList), y = lerp(sy, ty, tList), s = lerp(cs, cs * 0.7, tList);
      const hi = i === 6 && tSwap > 0;
      box(ctx, x, y, s, s, C.ink, hi ? 2 : 1.5);
      if (tList > 0.3) line(ctx, x + s + 10, y + s / 2, x + s + 10 + (mini ? W * 0.3 : W * 0.34) * (1 - (i % 3) * 0.18), y + s / 2, hi ? C.ink : C.line, 1, clamp((tList - 0.3) / 0.7, 0, 1));
    });
    if (!mini && tSwap > 0.95) label(ctx, '배치 순서', lx, ly - 8);
  }

  // CASE 03 — 일부는 첫 화면 그리드에 남고, 나머지는 아래 리스트가 된다
  function d3(ctx, W, H, k, mini) {
    const cs = Math.min(W, H) * (mini ? 0.12 : 0.095), g = cs * 0.32, cols = 4;
    const gw = cols * cs + (cols - 1) * g, gx = W * 0.5 - gw / 2, gy = H * 0.12;
    const t = seg(k, 0.1, 0.9);
    for (let i = 0; i < 12; i++) {
      const sx = gx + (i % 4) * (cs + g), sy = gy + Math.floor(i / 4) * (cs + g);
      if (i < 8) { box(ctx, sx, sy, cs, cs); continue; }
      const j = i - 8, ty = gy + 2 * (cs + g) + 14 + j * (cs * 0.75), tx = gx;
      const x = lerp(sx, tx, t), y = lerp(sy, ty, t), s = lerp(cs, cs * 0.55, t);
      box(ctx, x, y, s, s);
      if (t > 0.4) line(ctx, x + s + 10, y + s / 2, gx + gw, y + s / 2, C.line, 1, (t - 0.4) / 0.6);
    }
    if (t > 0.6) line(ctx, gx - 10, gy + 2 * (cs + g) + 4, gx + gw + 10, gy + 2 * (cs + g) + 4, C.ink, 1, (t - 0.6) / 0.4);
    if (!mini && t > 0.95) { label(ctx, '첫 화면', gx + gw + 18, gy + cs); label(ctx, '리스트', gx + gw + 18, gy + 2 * (cs + g) + 26); }
  }

  // CASE 04 — 칩에 점이 켜지고, 하단 탭 표시가 함께 켜진다
  function d4(ctx, W, H, k, mini) {
    const cw = Math.min(W * 0.36, 150), ch = cw * 0.34, cx = W * 0.5 - cw / 2, cy = H * 0.24;
    box(ctx, cx, cy, cw, ch);
    line(ctx, cx + 12, cy + ch / 2, cx + cw * 0.55, cy + ch / 2, C.line, 1);
    const ty = H * 0.78, tw = Math.min(W * 0.7, 300), tx = W * 0.5 - tw / 2;
    line(ctx, tx, ty, tx + tw, ty, C.ink, 1.5);
    for (let i = 0; i < 5; i++) line(ctx, tx + tw * (i + 0.5) / 5, ty + 10, tx + tw * (i + 0.5) / 5, ty + 18, C.line, 2);
    const a = seg(k, 0.1, 0.4), b = seg(k, 0.4, 0.8), c = seg(k, 0.75, 1);
    if (a > 0) dot(ctx, cx + cw, cy, 4.5 * a);
    line(ctx, cx + cw, cy + ch + 6, tx + tw * 4.5 / 5, ty - 6, C.ink, 1, b);
    if (c > 0) dot(ctx, tx + tw * 4.5 / 5 + 8, ty + 8, 3.5 * c);
    if (!mini && c > 0.95) { label(ctx, '지갑 칩', cx, cy - 10); label(ctx, '하단 탭', tx, ty + 34); }
  }

  // CASE 05 — 하나의 진입이 상태에 따라 두 경로로 나뉘고, 각자 다음 행동으로 이어진다
  function d5(ctx, W, H, k, mini) {
    const x0 = W * 0.08, xm = W * 0.36, x1 = W * 0.62, x2 = W * 0.9, ym = H * 0.5, dy = H * 0.24;
    const a = seg(k, 0, 0.3), b = seg(k, 0.3, 0.65), c = seg(k, 0.65, 1);
    line(ctx, x0, ym, xm, ym, C.ink, 1.5, a);
    if (b > 0) {
      for (const s of [-1, 1]) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xm, ym);
        const ex = lerp(xm, x1, b), ey = lerp(ym, ym + s * dy, b);
        ctx.bezierCurveTo(lerp(xm, ex, 0.5), ym, lerp(xm, ex, 0.5), ey, ex, ey); ctx.stroke();
      }
    }
    if (b > 0.98) for (const s of [-1, 1]) box(ctx, x1, ym + s * dy - 14, W * 0.12, 28);
    for (const s of [-1, 1]) line(ctx, x1 + W * 0.12 + 6, ym + s * dy, x2, ym + s * dy, C.sub, 1, c);
    if (c > 0.95) for (const s of [-1, 1]) dot(ctx, x2, ym + s * dy, 3);
    if (!mini && c > 0.95) { label(ctx, '가입', x1, ym - dy - 22); label(ctx, '미가입', x1, ym + dy + 32); }
  }

  const D = [null, d1, d2, d3, d4, d5];
  const CAP = ['', '결제 영역을 키우자 두 지표가 다른 방향으로 움직였습니다', '같은 서비스도 배치 순서에 따라 클릭이 달라졌습니다',
               '핵심 서비스는 첫 화면에 두고 나머지는 리스트로', '배지가 켜지면 하단 탭 표시도 함께 켜집니다', '가입 상태에 따라 다른 정보로 이어집니다'];

  // 01→03 세로선 길이: 첫 번호 원 중심에서 마지막 번호 원 중심까지
  function rail() {
    const chain = document.querySelector('.exp-chain'); if (!chain) return;
    const nums = chain.querySelectorAll('.exp-num'); const cr = chain.getBoundingClientRect();
    const a = nums[0].getBoundingClientRect(), b = nums[nums.length - 1].getBoundingClientRect();
    chain.style.setProperty('--rail-top', (a.top + a.height / 2 - cr.top) + 'px');
    chain.style.setProperty('--rail-h', (b.top - a.top) + 'px');
  }

  // 모바일 미니 도식(정지)
  function drawMinis() {
    rows.forEach(r => { const cv = r.querySelector('.exp-mini'); if (!cv || !cv.offsetParent) return;
      const { ctx, W, H } = setup(cv); ctx.clearRect(0, 0, W, H); D[+r.dataset.case](ctx, W, H, 1, true); });
  }

  // 데스크톱 주 도식
  let active = 0, hover = 0, start = 0, raf = 0, M = null;
  function render(now) {
    if (!M || !active) return;
    const k = reduce ? 1 : clamp((now - start) / 1100, 0, 1);
    M.ctx.clearRect(0, 0, M.W, M.H); D[active](M.ctx, M.W, M.H, k, false);
    if (k < 1) raf = requestAnimationFrame(render);
  }
  function activate(n) {
    if (n === active || !n) return;
    active = n; rows.forEach(r => r.classList.toggle('is-active', +r.dataset.case === n));
    if (cap) cap.textContent = CAP[n];
    cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(render);
  }
  function centerRow() {
    const mid = innerHeight * 0.4; let best = 1, bd = Infinity;
    rows.forEach(r => { const b = r.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = +r.dataset.case; } });
    return best;
  }
  rows.forEach(r => {
    const n = +r.dataset.case;
    r.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = n; activate(n); } });
    r.addEventListener('pointerleave', () => { hover = 0; });
    r.addEventListener('focus', () => { hover = n; activate(n); });
    r.addEventListener('blur', () => { hover = 0; });
  });
  window.addEventListener('scroll', () => { if (!hover && main && main.offsetParent) activate(centerRow()); }, { passive: true });

  function layout() {
    rail();
    if (main && main.offsetParent) { M = setup(main); const n = active || 1; active = 0; activate(n); }
    drawMinis();
  }
  window.addEventListener('resize', layout);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
})();
