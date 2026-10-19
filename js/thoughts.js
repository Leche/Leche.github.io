// 디자인에 대한 생각 — 스크롤에 맞춰 세 원칙이 차례로 켜지고, 오른쪽 선 그래픽이 원칙마다 바뀐다.
// 1 사용자와 제품: 떨어져 있던 두 원이 다가와 겹친다.
// 2 구조로 정리: 흩어진 사각형 12개가 4×3 격자로 맞춰진다. 포인터 근처는 살짝 밀려난다.
// 3 차이 확인: 기존 선과 바뀐 선이 그려지며 벌어지고, 마지막에 차이를 표시한다.
(() => {
  const section = document.getElementById('thoughts');
  const canvas = document.getElementById('thoughts-canvas');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');
  const items = [...section.querySelectorAll('.thought')];
  const counter = section.querySelector('.thought-count b');
  const dots = [];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mq = window.matchMedia('(max-width:820px)'), isMo = () => mq.matches;
  const FONT = '"Pretendard Variable", Pretendard, sans-serif';

  let W, H, dpr;
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const ink = a => `rgba(25,25,25,${a})`;
  const S = v => v * dpr;

  // 스크롤 진행도 0..3
  function progress() {
    const r = section.getBoundingClientRect();
    const stage = section.querySelector('.thoughts-stage').getBoundingClientRect();
    const total = r.height - stage.height;
    return clamp(-r.top / total, 0, 1) * 3;
  }

  // ── 장면 1: 두 원 ───────────────────────────────
  function scene1(lp, t) {
    const cx = W / 2, cy = H * (isMo() ? 0.44 : 0.46), R = Math.min(W, H) * (isMo() ? 0.24 : 0.22);
    const gap = R * (1.7 - 1.05 * ease(lp));           // 중심 간 거리: 멀리 → 겹침
    const L = [cx - gap / 2, cy], Rt = [cx + gap / 2, cy];
    ctx.lineWidth = S(1.5);
    // 겹친 부분을 가는 사선으로 채운다
    if (lp > 0.2) {
      ctx.save();
      ctx.beginPath(); ctx.arc(S(L[0]), S(L[1]), S(R), 0, Math.PI * 2); ctx.clip();
      ctx.beginPath(); ctx.arc(S(Rt[0]), S(Rt[1]), S(R), 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = ink(0.35 * clamp((lp - 0.2) / 0.5, 0, 1)); ctx.lineWidth = S(1);
      for (let x = -H; x < W + H; x += 9) { ctx.beginPath(); ctx.moveTo(S(x), S(0)); ctx.lineTo(S(x + H), S(H)); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = ink(1); ctx.lineWidth = S(1.5);
    for (const c of [L, Rt]) { ctx.beginPath(); ctx.arc(S(c[0]), S(c[1]), S(R), 0, Math.PI * 2); ctx.stroke(); }
    // 원 위를 도는 점 — 같은 방향·반 바퀴 차이로 돌아 서로 스치지 않는다
    const dot = (c, a) => { ctx.fillStyle = ink(1); ctx.fillRect(S(c[0] + Math.cos(a) * R) - S(2), S(c[1] + Math.sin(a) * R) - S(2), S(4), S(4)); };
    dot(L, t * 0.8); dot(Rt, t * 0.8 + Math.PI);
    // 라벨은 각 원의 바깥 가장자리에 붙인다(원이 겹쳐도 라벨끼리 만나지 않는다). 폭이 모자라면 두 줄로 떨어뜨린다
    // 라벨은 원과 다른 비율로 움직인다. 떨어져 있을 땐 각 원 아래 가운데, 원이 다 겹쳐도 라벨끼리는 최소 간격(14px)을 지킨다
    const tl = '사용자가 하려는 일', tr = '제품이 이루려는 것', g0 = R * 1.7, k1 = ease(lp);
    ctx.font = `500 ${S(13)}px ${FONT}`;
    const wl = ctx.measureText(tl).width / dpr, wr = ctx.measureText(tr).width / dpr;
    const lgEnd = Math.max(g0 * 0.6, (wl + wr) / 2 + 14);      // 끝 상태의 라벨 중심 간 거리
    const lg = g0 + (lgEnd - g0) * k1;
    ctx.fillStyle = ink(0.5); ctx.textAlign = 'center'; const y1 = cy + R + 32;
    ctx.fillText(tl, S(cx - lg / 2), S(y1)); ctx.fillText(tr, S(cx + lg / 2), S(y1));
  }

  // ── 장면 2: 흩어진 사각형 → 4×3 격자 ─────────────
  const rand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const CELLS = Array.from({ length: 12 }, (_, i) => ({ i, sx: rand(), sy: rand(), rot: (rand() - 0.5) * 1.6, sc: 0.5 + rand() * 0.9, ph: rand() * 6 }));
  let px = -999, py = -999;
  function scene2(lp, t) {
    const cols = 4, rows = 3, cell = Math.min(W / 6.2, H / 5.2), g = cell * 0.22;
    const gw = cols * cell + (cols - 1) * g, gh = rows * cell + (rows - 1) * g;
    const ox = (W - gw) / 2, oy = H * 0.46 - gh / 2;
    const k = ease(clamp(lp * 1.15, 0, 1));
    ctx.strokeStyle = ink(1); ctx.lineWidth = S(1.5);
    CELLS.forEach(c => {
      const gx = ox + (c.i % cols) * (cell + g) + cell / 2, gy = oy + Math.floor(c.i / cols) * (cell + g) + cell / 2;
      const wob = reduce ? 0 : (1 - k) * 6;
      const fx = W * 0.12 + c.sx * W * 0.76 + Math.sin(t + c.ph) * wob, fy = H * 0.12 + c.sy * H * 0.68 + Math.cos(t * 0.9 + c.ph) * wob;
      let x = fx + (gx - fx) * k, y = fy + (gy - fy) * k;
      // 포인터 근처는 밀려난다
      const dx = x - px, dy = y - py, d = Math.hypot(dx, dy), push = Math.max(0, 1 - d / 120) * 18;
      if (d > 0) { x += dx / d * push; y += dy / d * push; }
      const rot = c.rot * (1 - k), sz = cell * (c.sc + (1 - c.sc) * k);
      ctx.save(); ctx.translate(S(x), S(y)); ctx.rotate(rot);
      ctx.strokeRect(S(-sz / 2), S(-sz / 2), S(sz), S(sz)); ctx.restore();
    });
    if (k > 0.98) {
      ctx.font = `500 ${S(13)}px ${FONT}`; ctx.fillStyle = ink(0.5); ctx.textAlign = 'left';
      ctx.fillText('4 × 3', S(ox), S(oy + gh + 30));
    }
  }

  // ── 장면 3: 기존 선과 바뀐 선 ─────────────────────
  function scene3(lp, t) {
    const x0 = W * 0.1, x1 = W * (W < 560 ? 0.8 : 0.9), base = H * 0.62, amp = H * 0.28, n = 60;
    const k = ease(clamp(lp * 1.2, 0, 1)), m = Math.max(2, Math.floor(n * k));
    const wav = (u, s) => Math.sin(u * 9 + s) * 6 + Math.sin(u * 23 + s * 1.7) * 3;
    const ctrl = u => base - wav(u, 1) * (reduce ? 1 : 1 + 0.15 * Math.sin(t));
    const vari = u => base - wav(u, 2.2) - amp * ease(clamp((u - 0.35) / 0.5, 0, 1));
    ctx.strokeStyle = ink(0.2); ctx.lineWidth = S(1);
    ctx.beginPath(); ctx.moveTo(S(x0), S(base + 40)); ctx.lineTo(S(x1), S(base + 40)); ctx.stroke();
    // 기존(점선)
    ctx.setLineDash([S(4), S(5)]); ctx.strokeStyle = ink(0.45); ctx.lineWidth = S(1.5);
    ctx.beginPath(); for (let i = 0; i < m; i++) { const u = i / (n - 1); const x = x0 + (x1 - x0) * u; i ? ctx.lineTo(S(x), S(ctrl(u))) : ctx.moveTo(S(x), S(ctrl(u))); } ctx.stroke();
    ctx.setLineDash([]);
    // 바뀐 선(실선)
    ctx.strokeStyle = ink(1); ctx.lineWidth = S(2);
    ctx.beginPath(); for (let i = 0; i < m; i++) { const u = i / (n - 1); const x = x0 + (x1 - x0) * u; i ? ctx.lineTo(S(x), S(vari(u))) : ctx.moveTo(S(x), S(vari(u))); } ctx.stroke();
    // 끝에서 차이를 표시
    if (k > 0.97) {
      const ex = x1 + 18, ya = vari(1), yb = ctrl(1);
      ctx.strokeStyle = ink(1); ctx.lineWidth = S(1.5);
      ctx.beginPath(); ctx.moveTo(S(ex - 6), S(ya)); ctx.lineTo(S(ex), S(ya)); ctx.lineTo(S(ex), S(yb)); ctx.lineTo(S(ex - 6), S(yb)); ctx.stroke();
      ctx.font = `600 ${S(15)}px ${FONT}`; ctx.fillStyle = ink(1); ctx.textAlign = 'left';
      ctx.fillText('Δ', S(ex + 10), S((ya + yb) / 2 + 5));
    }
    ctx.font = `500 ${S(13)}px ${FONT}`; ctx.fillStyle = ink(0.5); ctx.textAlign = 'left';
    ctx.fillText('기존', S(x0), S(base + 64)); ctx.fillStyle = ink(0.9); ctx.fillText('바뀐 설계', S(x0 + 48), S(base + 64));
  }

  const SCENES = [scene1, scene2, scene3];
  let active = -1, fade = 1, last = performance.now(), ps = -1, pt = -1;
  const t0 = performance.now();
  const smooth = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10);   // smootherstep — 시작·끝이 아주 완만하다
  // 모바일 한 장면(구간 길이 1)의 나타남 정도: 들어옴 0~0.22, 머묾, 나감 0.78~1. 첫 장면은 처음부터 보이고 마지막 장면은 나가지 않는다
  const env = (i, u) => {
    const a = i === 0 ? 1 : smooth(u / 0.22), b = i === 2 ? 1 : smooth((1 - u) / 0.22);
    return { e: Math.min(a, b), dir: u < 0.5 ? 1 : -1 };
  };
  function setActive(idx) {
    if (idx === active) return; active = idx;
    if (!isMo()) items.forEach((el, i) => el.classList.toggle('on', i === idx));
    dots.forEach((el, i) => el.classList.toggle('on', i === idx));
    if (counter) counter.textContent = String(idx + 1).padStart(2, '0');
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = (now - t0) / 1000;
    const p = progress();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isMo()) {
      // 데스크톱 — 기존 연출 그대로
      items.forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
      const idx = Math.min(2, Math.floor(p)), lp = clamp(p - idx, 0, 1);
      if (idx !== active) fade = 0;
      setActive(idx);
      fade = Math.min(1, fade + dt * 3);
      ctx.globalAlpha = ease(fade);
      SCENES[idx](reduce ? 1 : lp, t);
    } else {
      // 모바일 — 스크롤 위치에 직접 묶고(스크럽), 관성 보정으로 손가락보다 살짝 늦게 부드럽게 따라온다
      ps = ps < 0 || reduce ? p : ps + (p - ps) * (1 - Math.exp(-dt * 5));
      const idx = Math.min(2, Math.floor(ps)), u = clamp(ps - idx, 0, 1);
      setActive(idx);
      // 문장은 도식보다 한 번 더 늦게 따라온다 — 스크롤을 멈춘 뒤에도 천천히 자리를 찾아간다
      pt = pt < 0 || reduce ? ps : pt + (ps - pt) * (1 - Math.exp(-dt * 2.2));
      const ti = Math.min(2, Math.floor(pt)), tu = clamp(pt - ti, 0, 1);
      items.forEach((el, i) => {
        if (i !== ti) { el.style.opacity = 0; return; }
        const a = i === 0 ? 1 : smooth(tu / 0.3), b = i === 2 ? 1 : smooth((1 - tu) / 0.3);
        const e = Math.min(a, b), dir = tu < 0.5 ? 1 : -1;
        el.style.opacity = e.toFixed(3); el.style.transform = `translate3d(0, ${((1 - e) * 36 * dir).toFixed(2)}px, 0)`;
      });
      const { e } = env(idx, u);
      ctx.globalAlpha = e;
      // 장면 안의 움직임은 머무는 구간(0.18~0.78)에 펼쳐져, 문장을 읽는 동안 도식이 천천히 완성된다
      SCENES[idx](reduce ? 1 : clamp((u - 0.18) / 0.6, 0, 1), t);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; }, { passive: true });
  canvas.addEventListener('pointerleave', () => { px = py = -999; });
  window.addEventListener('resize', layout);
  layout();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(frame));
})();
