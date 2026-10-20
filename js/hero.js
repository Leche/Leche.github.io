// Hero — 선으로만 그린 흑백 정육면체.
// 진입: 모서리가 하나씩 그려지며 나타난다 → 천천히 회전한다.
// 포인터: 커서 쪽으로 살짝 기운다. 드래그: 관성을 가지고 돌다가 원래 회전으로 돌아온다.
// 면에는 3×3 격자, 안쪽에는 반대로 도는 작은 정육면체. 뒤쪽 선일수록 옅게 그려 깊이를 만든다.
(() => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 단위 정육면체(-1..1)의 모서리와 면 격자 선
  const V = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]);
  const EDGES = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
    const diff = V[i].reduce((s, v, k) => s + (v !== V[j][k] ? 1 : 0), 0);
    if (diff === 1) EDGES.push([V[i], V[j]]);
  }
  const GRID = [];
  for (let axis = 0; axis < 3; axis++) for (const side of [-1, 1]) for (const t of [-1 / 3, 1 / 3]) {
    const a = (axis + 1) % 3, b = (axis + 2) % 3;
    const p = (u, v) => { const q = [0, 0, 0]; q[axis] = side; q[a] = u; q[b] = v; return q; };
    GRID.push([p(t, -1), p(t, 1)], [p(-1, t), p(1, t)]);
  }

  let W, H, dpr, size, cx, cy;
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    // 메타 줄(하단 약 120px) 위 공간의 가운데에 놓고, 회전해도 그 공간을 넘지 않게 크기를 잡는다
    if (W < 820) {
      // 모바일 — 헤더 아래부터 메타 표 위 경계선까지의 공간 정가운데에 놓는다(메타 높이가 Role 두 줄로 달라져도 따라간다)
      const meta = canvas.parentElement.querySelector('.meta');
      const free = meta ? meta.getBoundingClientRect().top - canvas.getBoundingClientRect().top : H - 170;
      size = Math.min(W * 0.13, free * 0.23); cx = W / 2; cy = free / 2;
    } else {
      // 데스크톱 — 헤더 아래부터 안내 문구(드래그해서 돌려보세요) 위까지의 공간 정가운데. 화면이 커져도 위아래 여백이 같다
      const lim = canvas.parentElement.querySelector('.hint') || canvas.parentElement.querySelector('.meta');
      const free = lim ? lim.getBoundingClientRect().top - canvas.getBoundingClientRect().top : H - 150;
      size = Math.min(W * 0.14, free * 0.24); cx = W / 2; cy = free / 2 - size * 0.20;   // 기울어진 정육면체는 그림 중심이 아래로 쏠려 위로 보정
    }
  }

  // 회전 상태
  const BASE_X = -0.52;
  let rx = BASE_X, ry = 0.72;           // 현재 각도
  let vx = 0, vy = 0;                   // 드래그 관성
  let tiltX = 0, tiltY = 0, tx = 0, ty = 0;
  const AUTO = 0.0032;                  // 기본 회전 속도(rad/frame)
  let dragging = false, lastX = 0, lastY = 0, inner = 0;

  const rot = (p, ax, ay) => {
    let [x, y, z] = p;
    let c = Math.cos(ay), s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c];
    c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c];
    return [x, y, z];
  };
  const proj = (p, scale) => { const d = 4.2, k = d / (d - p[2]); return [cx + p[0] * size * scale * k, cy + p[1] * size * scale * k]; };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const depthAlpha = (z, front, back) => back + (front - back) * ((z + 1) / 2);   // z: -1 뒤 ~ 1 앞

  function drawSet(seg, ax, ay, scale, o, t) {
    seg.forEach((e, i) => {
      const a = rot(e[0], ax, ay), b = rot(e[1], ax, ay);
      const p = reduce ? 1 : Math.min(1, Math.max(0, (t - i * o.stagger) / o.dur));
      if (p <= 0) return;
      const pa = proj(a, scale), pb = proj(b, scale), k = easeOut(p);
      ctx.strokeStyle = `rgba(25,25,25,${depthAlpha((a[2] + b[2]) / 2, o.front, o.back)})`;
      ctx.lineWidth = o.width * dpr;
      ctx.beginPath();
      ctx.moveTo(pa[0] * dpr, pa[1] * dpr);
      ctx.lineTo((pa[0] + (pb[0] - pa[0]) * k) * dpr, (pa[1] + (pb[1] - pa[1]) * k) * dpr);
      ctx.stroke();
    });
  }

  const start = performance.now();
  function frame(now) {
    const t = (now - start) / 1000;
    if (!dragging && !reduce) {
      vx *= 0.94; vy *= 0.94;
      ry += AUTO + vy; rx += vx;
      rx += (BASE_X - rx) * 0.01;         // 세로 기울기는 천천히 기본값으로 복귀
      inner -= AUTO * 1.6;
    }
    tiltX += (tx - tiltX) * 0.06; tiltY += (ty - tiltY) * 0.06;
    const ax = rx + tiltX, ay = ry + tiltY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    drawSet(GRID, ax, ay, 1, { front: 0.22, back: 0.06, width: 1, stagger: 0.02, dur: 0.6 }, t - 0.5);
    drawSet(EDGES, ax, inner, 0.42, { front: 0.55, back: 0.15, width: 1, stagger: 0.05, dur: 0.5 }, t - 0.9);
    drawSet(EDGES, ax, ay, 1, { front: 1, back: 0.28, width: 1.5, stagger: 0.07, dur: 0.6 }, t);

    if (!reduce) requestAnimationFrame(frame);
  }

  // 포인터: 커서 쪽으로 기울기
  window.addEventListener('pointermove', e => {
    if (dragging || reduce) return;
    const r = canvas.getBoundingClientRect();
    if (e.clientY > r.bottom || e.clientY < r.top) return;
    tx = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
    ty = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
  }, { passive: true });
  // 드래그: 직접 돌리기 + 관성
  canvas.addEventListener('pointerdown', e => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vx = vy = 0;
    canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    vy = dx * 0.006; vx = -dy * 0.006; ry += vy; rx += vx;
    if (reduce) frame(performance.now());
  });
  const end = () => { dragging = false; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  window.addEventListener('resize', () => { layout(); if (reduce) frame(performance.now()); });
  layout();
  requestAnimationFrame(frame);
})();
