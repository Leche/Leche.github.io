// 경력 타임라인 점을 날짜 글자의 실제 잉크 가운데에 맞춘다.
// 줄 높이 가운데가 아니라 눈에 보이는 글자 가운데 기준이고, 보는 사람 브라우저가 실제로 쓴 폰트로 잰다.
(() => {
  const DOT = 10;
  function align() {
    const ctx = document.createElement('canvas').getContext('2d');
    document.querySelectorAll('.timeline li').forEach(li => {
      const label = li.querySelector('small');
      if (!label) return;
      const st = getComputedStyle(label);
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      label.appendChild(probe);
      const baseline = probe.getBoundingClientRect().top - li.getBoundingClientRect().top;
      probe.remove();
      ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      const m = ctx.measureText(label.textContent);
      const center = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      li.style.setProperty('--dot-y', (center - DOT / 2).toFixed(2) + 'px');
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(align);
  window.addEventListener('resize', align);
})();
