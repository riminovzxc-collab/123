/* Процедурные «фото» и «видео»-заглушки в духе слоистых постеров.
   В продукте на их месте фотографии и ролики пары; кадры собираются детерминированно из (сцена, вариант). */
window.Scenes = (() => {
  'use strict';
  const TAU = Math.PI * 2;
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const seedOf = (s, k) => { let h = 2166136261; for (const ch of s + ':' + k) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

  function vgrad(g, x, y0, w, y1, stops){
    const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = gr; g.fillRect(x, y0, w, y1 - y0);
  }
  function glow(g, x, y, r, rgb, a){
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function ridge(g, w, h, rnd, base, amp, rough, color){
    const n = 128, p = new Float32Array(n + 1); p[0] = rnd() * amp; p[n] = rnd() * amp;
    const div = (a, b, d) => { if (b - a < 2) return; const m = (a + b) >> 1; p[m] = (p[a] + p[b]) / 2 + (rnd() - .5) * d; div(a, m, d * rough); div(m, b, d * rough); };
    div(0, n, amp);
    g.fillStyle = color; g.beginPath(); g.moveTo(0, h);
    for (let i = 0; i <= n; i++) g.lineTo(i / n * w, base - Math.abs(p[i]));
    g.lineTo(w, h); g.closePath(); g.fill();
    return x => base - Math.abs(p[Math.max(0, Math.min(n, Math.round(x / w * n)))]);
  }
  function starfield(g, w, h, rnd, n, maxY, a = 1){
    for (let i = 0; i < n; i++){
      const s = rnd(), x = rnd() * w, y = rnd() * maxY;
      g.fillStyle = `rgba(255,${240 + Math.round(rnd() * 15)},${220 + Math.round(rnd() * 35)},${(.25 + s * .75) * a})`;
      const z = s > .97 ? 2 : s > .85 ? 1.4 : 1; g.fillRect(x, y, z, z);
    }
  }
  function couple(g, x, y, s, col){
    g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round';
    g.beginPath(); g.arc(x - s * .15, y - s * .9, s * .075, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x - s * .26, y - s * .79); g.lineTo(x - s * .05, y - s * .79); g.lineTo(x - s * .08, y - s * .4);
    g.lineTo(x - s * .09, y); g.lineTo(x - s * .15, y); g.lineTo(x - s * .16, y - s * .38); g.lineTo(x - s * .19, y); g.lineTo(x - s * .25, y); g.lineTo(x - s * .24, y - s * .4); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(x + s * .16, y - s * .78, s * .065, s * .12, .15, 0, TAU); g.fill();
    g.beginPath(); g.arc(x + s * .14, y - s * .84, s * .066, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(x + s * .07, y - s * .74); g.lineTo(x + s * .2, y - s * .74); g.lineTo(x + s * .29, y - s * .26);
    g.lineTo(x + s * .19, y - s * .26); g.lineTo(x + s * .18, y); g.lineTo(x + s * .14, y); g.lineTo(x + s * .13, y - s * .26); g.lineTo(x + s * .01, y - s * .26); g.closePath(); g.fill();
    g.lineWidth = s * .04; g.beginPath(); g.moveTo(x - s * .07, y - s * .7); g.quadraticCurveTo(x, y - s * .5, x + s * .07, y - s * .66); g.stroke();
  }
  function palm(g, x, y, s, col, lean){
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineWidth = s * .045;
    const tx = x + lean * s * .5, ty = y - s;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * s * .1, y - s * .5, tx, ty); g.stroke();
    for (let i = 0; i < 7; i++){
      const a = -Math.PI / 2 + (i - 3) * .5 + lean * .3, L = s * (.42 + (i % 2) * .1);
      const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * .6 + L * .35;
      g.lineWidth = s * .03; g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * L * .5, ty + Math.sin(a) * L * .5 - s * .08, ex, ey); g.stroke();
    }
  }
  function fir(g, x, y, s, col){
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s);
    for (let i = 1; i <= 4; i++){ const yy = y - s + s * i / 4, ww = s * .12 * i + s * .05; g.lineTo(x + ww, yy); g.lineTo(x + ww * .45, yy); }
    for (let i = 4; i >= 1; i--){ const yy = y - s + s * i / 4, ww = s * .12 * i + s * .05; g.lineTo(x - ww * .45, yy); g.lineTo(x - ww, yy); }
    g.closePath(); g.fill();
  }
  function bokeh(g, w, h, rnd, n, cols, maxR, yMax = .9){
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++){
      const x = rnd() * w, y = rnd() * h * yMax, r = (4 + rnd() * rnd() * maxR) * (w / 400), a = .05 + rnd() * .28, c = cols[Math.floor(rnd() * cols.length)];
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},${a * .6})`); gr.addColorStop(.8, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  function windowFrame(g, x, y, w, h, frame){
    g.fillStyle = frame; g.fillRect(x - 8, y - 8, w + 16, 8); g.fillRect(x - 8, y + h, w + 16, 12); g.fillRect(x - 8, y, 8, h); g.fillRect(x + w, y, 8, h);
    g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h * .42, w, 6);
  }
  function vignette(g, w, h, a = .5){
    const gr = g.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .8);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }
  let noise = null;
  function grain(g, w, h){
    if (!noise){
      noise = document.createElement('canvas'); noise.width = noise.height = 160; const n = noise.getContext('2d'), d = n.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4){ const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; }
      n.putImageData(d, 0, 0);
    }
    g.save(); g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(noise, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
  }

  /* ---------------- сцены ---------------- */
  const SKIES = {
    sunset: ['#1c1d4a', '#5b2f6b', '#c9575c', '#f39a62', '#ffd08a'],
    dusk:   ['#101a3c', '#2f2c66', '#7b4a86', '#d9798a', '#f5b48f'],
    dawn:   ['#1f2d5c', '#5a5f96', '#b98aa6', '#f0c2a6', '#fbe3c4'],
    night:  ['#03050d', '#0a1230', '#16244f', '#253a6e'],
    day:    ['#3f7fc0', '#77aee0', '#b4d6f0', '#e6f1f8'],
    tropic: ['#23163f', '#7b2f63', '#d8505e', '#f68c4c', '#ffd17a']
  };
  const P = {};

  P.mountains = (g, w, h, rnd, k) => {
    const sky = [null, 'sunset', 'dusk', 'dawn', 'night', 'day'][k] || 'sunset', stops = SKIES[sky];
    vgrad(g, 0, 0, w, h * .75, stops);
    const hz = stops[stops.length - 1], dark = sky === 'night' ? '#05070f' : sky === 'day' ? '#1f3b2c' : '#140f24';
    if (sky === 'night') starfield(g, w, h, rnd, 420, h * .6);
    const sx = w * (.28 + rnd() * .44), sy = h * (.44 + rnd() * .06);
    if (sky !== 'night') { glow(g, sx, sy, w * .45, '255,214,160', .35); g.fillStyle = sky === 'day' ? '#fff8e6' : '#ffe2b0'; g.beginPath(); g.arc(sx, sy, w * .06, 0, TAU); g.fill(); }
    else { glow(g, sx, sy - h * .2, w * .2, '220,230,255', .25); g.fillStyle = '#eef0ff'; g.beginPath(); g.arc(sx, sy - h * .2, w * .035, 0, TAU); g.fill(); }
    const layers = 5; let yAt = null;
    for (let i = 0; i < layers; i++){
      const t = i / (layers - 1);
      yAt = ridge(g, w, h, rnd, h * (.52 + t * .34), h * (.22 - t * .12), .56, mix(hz.startsWith('#') ? hz : '#f0c0a0', dark, .25 + t * .75));
    }
    if (k !== 4) couple(g, w * .66, yAt(w * .66) + 2, h * .085, dark);
    if (k === 5){ g.fillStyle = dark; g.fillRect(w * .18, yAt(w * .2) - h * .07, w * .16, h * .07); g.beginPath(); g.moveTo(w * .16, yAt(w * .2) - h * .07); g.lineTo(w * .26, yAt(w * .2) - h * .13); g.lineTo(w * .36, yAt(w * .2) - h * .07); g.fill(); glow(g, w * .23, yAt(w * .2) - h * .04, w * .05, '255,200,120', .8); }
  };

  P.lake = (g, w, h, rnd, k) => {
    const sky = {1: 'day', 2: 'sunset', 4: 'night', 5: 'sunset', 6: 'tropic'}[k] || 'dusk', stops = SKIES[sky], hzY = h * .56;
    vgrad(g, 0, 0, w, hzY, stops);
    if (sky === 'night') starfield(g, w, h, rnd, 500, hzY);
    const sx = w * (.35 + rnd() * .3), sy = sky === 'day' ? h * .18 : hzY - h * .05;
    const sunCol = sky === 'day' ? '255,250,235' : sky === 'night' ? '230,235,255' : '255,208,150';
    glow(g, sx, sy, w * .5, sunCol, sky === 'night' ? .12 : .35);
    g.fillStyle = `rgb(${sunCol})`; g.beginPath(); g.arc(sx, sy, w * (sky === 'night' ? .03 : .055), 0, TAU); g.fill();
    const hzc = stops[stops.length - 1];
    if (k === 5){
      g.fillStyle = mix('#2a1832', '#000000', .2);
      for (let i = 0; i < 26; i++){ const x = i / 26 * w, bw = w / 26 * (.6 + rnd() * .6), bh = h * (.02 + rnd() * .05); g.fillRect(x, hzY - bh, bw, bh); }
      [[.3, .07], [.62, .09]].forEach(([dx, r]) => { const cx = w * dx; g.beginPath(); g.arc(cx, hzY - h * .05, w * r, Math.PI, 0); g.fill(); g.fillRect(cx - w * r, hzY - h * .05, w * r * 2, h * .05);
        [-1.4, 1.4].forEach(o => { const mx = cx + o * w * r; g.fillRect(mx - 2, hzY - h * .2, 4, h * .2); g.beginPath(); g.moveTo(mx - 3, hzY - h * .2); g.lineTo(mx, hzY - h * .24); g.lineTo(mx + 3, hzY - h * .2); g.fill(); }); });
    } else if (k !== 6){
      ridge(g, w, h, rnd, hzY, h * .1, .55, mix(hzc, '#1a1e3a', .45));
    }
    vgrad(g, 0, hzY, w, h, [mix(hzc, '#0b1026', .35), mix(stops[1], '#05070f', .55), '#04060c']);
    g.globalCompositeOperation = 'lighter';
    for (let y = hzY + 2, i = 0; y < h; y += 3, i++){
      const d = (y - hzY) / (h - hzY), ww = w * (.03 + d * .22) * (.4 + rnd() * .8);
      g.fillStyle = `rgba(${sunCol},${(sky === 'night' ? .12 : .32) * (1 - d * .7)})`; g.fillRect(sx - ww / 2 + (rnd() - .5) * 10, y, ww, 1.4);
    }
    g.globalCompositeOperation = 'source-over';
    if (k === 1 || k === 2 || k === 6){
      const shore = h * .9; g.fillStyle = '#07080f'; g.beginPath(); g.moveTo(0, shore); g.quadraticCurveTo(w * .4, shore - h * .03, w, shore + h * .02); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      couple(g, w * .3, shore - h * .01, h * .1, '#07080f');
      if (k === 6){ palm(g, w * .86, h, h * .5, '#07080f', -.35); palm(g, w * .08, h, h * .38, '#07080f', .3); }
    }
  };

  P.city = (g, w, h, rnd, k) => {
    const sky = {1: 'dusk', 2: 'night', 3: 'night', 4: 'dusk', 5: 'sunset', 6: 'dusk'}[k] || 'dusk', stops = SKIES[sky];
    vgrad(g, 0, 0, w, h, stops.concat(['#05060d']));
    if (sky === 'night') starfield(g, w, h, rnd, 260, h * .4);
    if (k === 3 || k === 6){
      ridge(g, w, h, rnd, h * .36, h * .12, .55, mix(stops[stops.length - 1], '#0a0c1a', .55));
      vgrad(g, 0, h * .38, w, h, ['rgba(10,12,26,0)', '#07080f']);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2600; i++){
        const d = rnd(), y = h * .42 + Math.pow(d, 1.6) * h * .5, x = rnd() * w, s = .6 + d * 1.6;
        const c = rnd() < .75 ? '255,196,120' : rnd() < .5 ? '255,240,220' : '170,200,255';
        g.fillStyle = `rgba(${c},${.35 + rnd() * .5})`; g.fillRect(x, y, s, s);
      }
      g.globalCompositeOperation = 'source-over';
      const tx = w * .82, base = h * .5; g.strokeStyle = '#07080f'; g.lineWidth = 3; g.beginPath(); g.moveTo(tx, base); g.lineTo(tx, base - h * .34); g.stroke();
      g.lineWidth = 1.2; for (let i = 0; i < 9; i++){ const y = base - i * h * .036; g.beginPath(); g.moveTo(tx - 10 + i, y); g.lineTo(tx + 10 - i, y - h * .036); g.moveTo(tx + 10 - i, y); g.lineTo(tx - 10 + i, y - h * .036); g.stroke(); }
      g.fillStyle = '#ff5a4a'; g.beginPath(); g.arc(tx, base - h * .34, 2.4, 0, TAU); g.fill(); glow(g, tx, base - h * .34, 12, '255,90,74', .6);
      g.fillStyle = '#07080f'; g.beginPath(); g.moveTo(0, h * .92); g.quadraticCurveTo(w * .5, h * .86, w, h * .95); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      couple(g, w * .4, h * .9, h * .12, '#07080f');
      return;
    }
    const hz = h * .62;
    if (k === 5){
      const col = '#1e1027'; g.fillStyle = col;
      [[.22, .1], [.5, .14], [.78, .08]].forEach(([dx, r]) => { const cx = w * dx; g.beginPath(); g.arc(cx, hz - h * .08, w * r, Math.PI, 0); g.fill(); g.fillRect(cx - w * r, hz - h * .08, w * r * 2, h * .09);
        [-1.3, 1.3].forEach(o => { const mx = cx + o * w * r; g.fillRect(mx - 3, hz - h * .3, 6, h * .3); g.beginPath(); g.moveTo(mx - 4, hz - h * .3); g.lineTo(mx, hz - h * .36); g.lineTo(mx + 4, hz - h * .3); g.fill(); }); });
      g.fillRect(0, hz, w, h - hz);
    }
    for (let layer = 0; layer < 3; layer++){
      const col = mix(stops[1], '#05060d', .45 + layer * .25); let x = -10;
      while (x < w){
        const bw = w * (.05 + rnd() * .09), bh = h * (.12 + rnd() * (.28 - layer * .06)) , by = hz + layer * h * .06 - bh;
        g.fillStyle = col; g.fillRect(x, by, bw, h - by);
        for (let wy = by + 6; wy < h - 6; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7)
          if (rnd() < .28) { g.fillStyle = `rgba(255,${200 + Math.round(rnd() * 40)},${120 + Math.round(rnd() * 60)},${.35 + rnd() * .5})`; g.fillRect(wx, wy, 3, 4); }
        x += bw + 2;
      }
    }
    bokeh(g, w, h, rnd, 30, ['255,180,100', '255,120,110', '160,190,255'], 40, 1);
    if (k === 2 || k === 4){
      g.fillStyle = 'rgba(5,6,13,.55)'; g.fillRect(0, 0, w, h);
      const px = w * .5, py = h * .58, pw = w * .36, ph = pw * 2;
      glow(g, px, py, w * .5, k === 4 ? '255,120,160' : '120,170,255', .35);
      g.fillStyle = '#0a0b12'; g.beginPath(); g.roundRect ? g.roundRect(px - pw / 2, py - ph / 2, pw, ph, 18) : g.rect(px - pw / 2, py - ph / 2, pw, ph); g.fill();
      g.fillStyle = k === 4 ? '#3a1b33' : '#17212b'; g.fillRect(px - pw / 2 + 8, py - ph / 2 + 18, pw - 16, ph - 36);
      const bub = (y, right, len, col) => { g.fillStyle = col; const bw = (pw - 30) * len; g.beginPath(); g.roundRect ? g.roundRect(right ? px + pw / 2 - 14 - bw : px - pw / 2 + 14, y, bw, 16, 7) : g.rect(0, 0, 0, 0); g.fill(); };
      [[.2, 1, .7], [.3, 0, .6], [.4, 1, .8], [.5, 0, .5], [.6, 1, .75]].forEach(([yy, r, l]) => bub(py - ph / 2 + ph * yy, r, l, r ? (k === 4 ? '#b0436f' : '#2b5278') : '#243343'));
    }
  };

  P.stars = (g, w, h, rnd, k) => {
    vgrad(g, 0, 0, w, h, k === 6 ? ['#070514', '#1a0f35', '#2a1440', '#0c0a1d'] : ['#02030a', '#070d24', '#101c42', '#1d2c58']);
    g.save(); g.translate(w / 2, h * .45); g.rotate(-.5); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 260; i++){ const x = (rnd() - .5) * w * 1.8, y = (rnd() + rnd() + rnd() - 1.5) * h * .08, r = 8 + rnd() * 26; glow(g, x, y, r, rnd() < .3 ? '255,220,200' : '190,180,255', .045); }
    g.restore(); g.globalCompositeOperation = 'source-over';
    starfield(g, w, h, rnd, 900, h * .85);
    if (k === 6){ glow(g, w * .6, h * .4, w * .5, '160,90,255', .18); glow(g, w * .35, h * .55, w * .4, '255,110,170', .12); return; }
    if (k === 2) for (let i = 0; i < 6; i++){ const x = rnd() * w, y = rnd() * h * .5, L = 60 + rnd() * 90, a = .5 + rnd() * .3;
      const gr = g.createLinearGradient(x, y, x + L, y + L * .45); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,250,235,${a})`); g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + L * .45); g.stroke(); }
    const dark = '#03040a';
    if (k === 1 || k === 5){
      glow(g, w * .5, h * 1.02, w * .9, '255,170,110', .35);
      const yAt = ridge(g, w, h, rnd, h * .9, h * .08, .5, dark);
      couple(g, w * .42, yAt(w * .42) + 2, h * .12, dark);
      if (k === 5){ g.fillStyle = dark; const bx = w * .6, by = yAt(w * .6); g.fillRect(bx, by - h * .05, w * .18, 4); g.fillRect(bx + 4, by - h * .05, 3, h * .05); g.fillRect(bx + w * .18 - 7, by - h * .05, 3, h * .05); g.fillRect(bx, by - h * .09, w * .18, 3); }
    } else if (k === 3){
      const hz = h * .78; vgrad(g, 0, hz, w, h, ['#0b1430', '#03050c']);
      g.globalCompositeOperation = 'lighter'; starfield(g, w, h, rnd, 120, h, .4); g.globalCompositeOperation = 'source-over';
      vgrad(g, 0, hz, w, h, ['rgba(3,5,12,.2)', 'rgba(3,5,12,.9)']);
      ridge(g, w, h, rnd, hz, h * .05, .5, dark);
    } else if (k === 4){
      const yAt = ridge(g, w, h, rnd, h * .88, h * .1, .5, dark);
      const tx = w * .64, ty = yAt(tx); glow(g, tx, ty - h * .03, w * .18, '255,170,90', .55);
      g.fillStyle = '#ffb36b'; g.beginPath(); g.moveTo(tx - w * .09, ty); g.lineTo(tx, ty - h * .09); g.lineTo(tx + w * .09, ty); g.fill();
      g.fillStyle = '#6b3a17'; g.beginPath(); g.moveTo(tx - w * .02, ty); g.lineTo(tx, ty - h * .05); g.lineTo(tx + w * .02, ty); g.fill();
    } else {
      ridge(g, w, h, rnd, h * .86, h * .14, .55, dark);
    }
  };

  P.snow = (g, w, h, rnd, k) => {
    if (k === 1){
      vgrad(g, 0, 0, w, h, ['#040716', '#0d1c44', '#28427a', '#6a86b8']);
      starfield(g, w, h, rnd, 300, h * .45);
      ridge(g, w, h, rnd, h * .55, h * .2, .55, '#c8d6ee'); ridge(g, w, h, rnd, h * .72, h * .12, .5, '#8ea5cc');
      g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) glow(g, w * (.2 + rnd() * .6), h * (.68 + rnd() * .08), 10, '255,200,130', .6); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#e8eef9'; g.fillRect(0, h * .84, w, h * .16);
      for (let i = 0; i < 9; i++) fir(g, rnd() * w, h * (.86 + rnd() * .1), h * (.12 + rnd() * .12), '#0b1428');
      couple(g, w * .5, h * .95, h * .1, '#0b1428');
    } else {
      vgrad(g, 0, 0, w, h, ['#3a2a28', '#231818']);
      const wx = w * .14, wy = h * .12, ww = w * .72, wh = h * .56;
      vgrad(g, wx, wy, ww, wy + wh, ['#8fa8cf', '#c7d5ea', '#eef3fa']);
      ridge(g, ww, wy + wh, rnd, wy + wh * .7, wh * .1, .5, '#dfe7f3');
      for (let i = 0; i < 6; i++) fir(g, wx + rnd() * ww, wy + wh, wh * (.2 + rnd() * .25), '#6d7f9c');
      windowFrame(g, wx, wy, ww, wh, '#1a1111');
      glow(g, w * .12, h * .78, w * .5, '255,170,90', .35);
      g.fillStyle = '#1a1111'; g.fillRect(0, h * .82, w, h * .18);
      const cx = w * .7, cy = h * .8; g.fillStyle = '#e9ded0'; g.beginPath(); g.moveTo(cx - 14, cy - 30); g.lineTo(cx + 14, cy - 30); g.lineTo(cx + 11, cy); g.lineTo(cx - 11, cy); g.fill();
      g.fillStyle = '#8c2a2a'; g.fillRect(cx - 12, cy - 26, 24, 8);
    }
  };

  P.fireworks = (g, w, h, rnd, k) => {
    vgrad(g, 0, 0, w, h, ['#02030a', '#0a0f28', '#1a1838']);
    starfield(g, w, h, rnd, 200, h * .6, .6);
    burstField(g, w, h, rnd, 1.25, k);
    if (k === 2){ ridge(g, w, h, rnd, h * .8, h * .1, .5, '#dfe7f3'); g.fillStyle = '#0b1428'; for (let i = 0; i < 6; i++) fir(g, rnd() * w, h, h * .2, '#0b1428'); }
    else { const col = '#05060d'; let x = 0; while (x < w){ const bw = w * (.06 + rnd() * .08), bh = h * (.1 + rnd() * .2); g.fillStyle = col; g.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 6; wy < h - 4; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) if (rnd() < .25){ g.fillStyle = 'rgba(255,210,140,.6)'; g.fillRect(wx, wy, 3, 4); } g.fillStyle = col; x += bw + 2; } }
    if (k === 3) couple(g, w * .5, h * .97, h * .16, '#05060d');
  };
  function burstField(g, w, h, rnd, t, k){
    const cols = ['255,196,90', '255,110,150', '140,120,255', '120,230,200', '255,245,230'];
    g.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 5; b++){
      const bx = w * (.15 + rnd() * .7), by = h * (.12 + rnd() * .35), col = cols[Math.floor(rnd() * cols.length)], period = 2.6 + rnd() * 1.4, off = rnd() * period;
      const p = .12 + .88 * (((t + off) % period) / period), R = w * (.12 + rnd() * .12) * Math.sqrt(p), fade = Math.max(0, 1 - p * 1.1);
      glow(g, bx, by + p * 18, R * 1.4, col, .12 * fade);
      g.lineWidth = 1.2;
      for (let i = 0; i < 46; i++){ const a = i / 46 * TAU, rr = R * (.85 + rnd() * .3), x = bx + Math.cos(a) * rr, y = by + Math.sin(a) * rr + p * p * 30;
        const tx = bx + Math.cos(a) * rr * .55, ty = by + Math.sin(a) * rr * .55 + p * p * 16, gr = g.createLinearGradient(tx, ty, x, y);
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${fade * .8})`); g.strokeStyle = gr; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
        g.fillStyle = `rgba(255,250,235,${fade})`; g.fillRect(x - 1, y - 1, 2.4, 2.4); }
    }
    g.globalCompositeOperation = 'source-over';
  }

  P.home = (g, w, h, rnd, k) => {
    const warm = {1: '#1a1422', 2: '#3b2418', 3: '#d8c9b4', 4: '#2a1d18', 5: '#e9d6bb', 6: '#2a1c1c'}[k] || '#241a1a';
    const day = k === 3 || k === 5;
    vgrad(g, 0, 0, w, h, [warm, mix(warm, '#000000', .35)]);
    const wx = w * (k === 1 ? .52 : .12), wy = h * .1, ww = w * (k === 1 ? .38 : .5), wh = h * .45;
    if (day) vgrad(g, wx, wy, ww, wy + wh, ['#8cc0ea', '#cfe6f6']);
    else { vgrad(g, wx, wy, ww, wy + wh, ['#050817', '#142150']); starfield(g, wx + ww, wy + wh, rnd, 60, wy + wh);
      g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 140; i++){ g.fillStyle = `rgba(255,200,120,${.3 + rnd() * .6})`; g.fillRect(wx + rnd() * ww, wy + wh * (.6 + rnd() * .4), 1.6, 1.6); } g.globalCompositeOperation = 'source-over'; }
    if (k === 6){ vgrad(g, wx, wy, ww, wy + wh, ['#9fb3d4', '#e8eef7']); for (let i = 0; i < 80; i++){ g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(wx + rnd() * ww, wy + rnd() * wh, 1 + rnd() * 1.6, 0, TAU); g.fill(); } }
    windowFrame(g, wx, wy, ww, wh, mix(warm, '#000000', .55));
    if (day){ g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,200,.12)'; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + ww, wy); g.lineTo(wx + ww + w * .3, h); g.lineTo(wx + w * .1, h); g.fill(); g.globalCompositeOperation = 'source-over'; }
    const lx = w * (k === 1 ? .2 : .8), ly = h * .4;
    if (!day){ glow(g, lx, ly, w * .55, '255,170,90', .5); g.fillStyle = '#ffcf8a'; g.beginPath(); g.moveTo(lx - 22, ly - 10); g.lineTo(lx + 22, ly - 10); g.lineTo(lx + 14, ly - 34); g.lineTo(lx - 14, ly - 34); g.fill(); g.fillStyle = mix(warm, '#000000', .6); g.fillRect(lx - 2, ly - 10, 4, h * .35); }
    const floor = h * .8, dk = mix(warm, '#000000', .7);
    g.fillStyle = dk; g.fillRect(0, floor, w, h - floor);
    if (k === 1){ [[.08, .16, .14], [.26, .12, .1], [.14, .1, .08], [.7, .14, .12], [.84, .1, .09]].forEach(([x, bw, bh]) => { g.fillStyle = mix('#8a6a48', '#000000', .45 + rnd() * .2); g.fillRect(w * x, floor - h * bh, w * bw, h * bh); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(w * x, floor - h * bh + h * bh * .45, w * bw, 3); });
      g.fillStyle = mix('#d8cfc4', '#000000', .45); g.fillRect(w * .3, floor - h * .05, w * .4, h * .05); couple(g, w * .5, floor - h * .05, h * .14, dk); }
    if (k === 2 || k === 5){ g.fillStyle = mix(warm, '#000000', .5); g.fillRect(w * .1, floor - h * .12, w * .8, h * .025); g.fillRect(w * .15, floor - h * .1, 6, h * .1); g.fillRect(w * .85 - 6, floor - h * .1, 6, h * .1);
      for (let i = 0; i < 3; i++){ const px = w * (.3 + i * .2), py = floor - h * .12; g.fillStyle = '#efe6d6'; g.beginPath(); g.ellipse(px, py - 4, 26, 7, 0, 0, TAU); g.fill(); if (k === 5){ g.fillStyle = '#d9a55a'; g.beginPath(); g.ellipse(px, py - 8, 18, 5, 0, 0, TAU); g.fill(); } } }
    if (k === 3 || k === 4){ g.fillStyle = mix(warm, '#000000', .45); g.fillRect(w * .62, h * .3, w * .3, floor - h * .3); g.fillStyle = mix(warm, '#000000', .6); g.fillRect(w * .77 - 1, h * .3, 2, floor - h * .3); g.fillRect(w * .66, h * .55, 5, 16); g.fillRect(w * .86, h * .55, 5, 16); }
    if (k === 3 || k === 6){ const px = w * .2, py = floor; g.fillStyle = '#1f3b2c'; for (let i = 0; i < 9; i++){ g.beginPath(); g.ellipse(px + (rnd() - .5) * 40, py - 30 - rnd() * 50, 7, 22, (rnd() - .5) * 1.4, 0, TAU); g.fill(); } g.fillStyle = '#b86b45'; g.fillRect(px - 16, py - 26, 32, 26); }
    vignette(g, w, h, .45);
  };

  P.cafe = (g, w, h, rnd, k) => {
    const bg = {1: ['#1d1422', '#2c1b24', '#0f0c14'], 2: ['#221410', '#35211a', '#120c0a'], 3: ['#1a1520', '#3a2130', '#140d14'], 4: ['#15141f', '#2a1c2a', '#0e0c14']}[k] || ['#1d1422', '#2c1b24', '#0f0c14'];
    vgrad(g, 0, 0, w, h, bg);
    glow(g, w * .68, h * .34, w * .7, '255,170,90', .3);
    bokeh(g, w, h, rnd, 70, ['255,179,92', '255,140,90', '255,214,150', '255,214,150', '140,200,255', '255,120,140'], 52, .85);
    if (k !== 1){
      const cx = w * .5, cy = h * .8, cw = w * .2;
      g.fillStyle = '#efe6d8'; g.beginPath(); g.ellipse(cx, cy + cw * .55, cw * 1.25, cw * .22, 0, 0, TAU); g.fill();
      g.fillStyle = '#f5ede1'; g.beginPath(); g.moveTo(cx - cw * .7, cy - cw * .3); g.lineTo(cx + cw * .7, cy - cw * .3); g.quadraticCurveTo(cx + cw * .65, cy + cw * .55, cx, cy + cw * .55); g.quadraticCurveTo(cx - cw * .65, cy + cw * .55, cx - cw * .7, cy - cw * .3); g.fill();
      g.strokeStyle = '#f5ede1'; g.lineWidth = cw * .12; g.beginPath(); g.arc(cx + cw * .72, cy, cw * .22, -1.2, 1.3); g.stroke();
      g.fillStyle = '#5a3620'; g.beginPath(); g.ellipse(cx, cy - cw * .3, cw * .66, cw * .12, 0, 0, TAU); g.fill();
      g.strokeStyle = '#f1dcc0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - cw * .2, cy - cw * .3); g.quadraticCurveTo(cx - cw * .05, cy - cw * .33, cx + cw * .15, cy - cw * .27); g.stroke();
    }
    vignette(g, w, h, .55);
  };

  P.cat = (g, w, h, rnd, k) => {
    if (k === 1){
      vgrad(g, 0, 0, w, h, ['#0a0d1c', '#141a33']);
      const wx = w * .14, wy = h * .1, ww = w * .72, wh = h * .6;
      vgrad(g, wx, wy, ww, wy + wh, ['#050817', '#1a2a5c', '#3a4f86']); starfield(g, wx + ww, wy + wh * .7, rnd, 90, wy + wh * .7);
      glow(g, wx + ww * .7, wy + wh * .25, ww * .45, '230,235,255', .35); g.fillStyle = '#f1f3ff'; g.beginPath(); g.arc(wx + ww * .7, wy + wh * .25, ww * .09, 0, TAU); g.fill();
      windowFrame(g, wx, wy, ww, wh, '#070912');
      g.fillStyle = '#070912'; g.fillRect(0, wy + wh + 8, w, h);
      const cx = w * .42, cy = wy + wh + 8, s = h * .2; g.fillStyle = '#070912';
      g.beginPath(); g.ellipse(cx, cy - s * .38, s * .3, s * .42, 0, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx, cy - s * .9, s * .2, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx - s * .19, cy - s * .98); g.lineTo(cx - s * .14, cy - s * 1.22); g.lineTo(cx - s * .02, cy - s * 1.06); g.fill();
      g.beginPath(); g.moveTo(cx + s * .19, cy - s * .98); g.lineTo(cx + s * .14, cy - s * 1.22); g.lineTo(cx + s * .02, cy - s * 1.06); g.fill();
      g.strokeStyle = '#070912'; g.lineWidth = s * .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + s * .22, cy - s * .08); g.quadraticCurveTo(cx + s * .7, cy - s * .02, cx + s * .62, cy - s * .4); g.stroke();
    } else {
      vgrad(g, 0, 0, w, h, ['#3a2418', '#1f130e']);
      glow(g, w * .78, h * .28, w * .6, '255,170,90', .45);
      g.fillStyle = '#efe4d2'; g.beginPath(); g.ellipse(w * .5, h * .72, w * .52, h * .18, -.05, 0, TAU); g.fill();
      g.fillStyle = '#e2d4bf'; g.beginPath(); g.ellipse(w * .45, h * .62, w * .3, h * .08, -.08, 0, TAU); g.fill();
      const cx = w * .47, cy = h * .6, s = w * .18;
      g.fillStyle = '#d9812f'; g.beginPath(); g.ellipse(cx, cy, s, s * .6, -.1, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx - s * .85, cy - s * .1, s * .42, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx - s * 1.15, cy - s * .35); g.lineTo(cx - s * 1.08, cy - s * .75); g.lineTo(cx - s * .88, cy - s * .45); g.fill();
      g.beginPath(); g.moveTo(cx - s * .8, cy - s * .45); g.lineTo(cx - s * .6, cy - s * .78); g.lineTo(cx - s * .52, cy - s * .38); g.fill();
      g.strokeStyle = '#b8651f'; g.lineWidth = 3; for (let i = 0; i < 5; i++){ g.beginPath(); g.arc(cx + s * (-.3 + i * .18), cy - s * .1, s * .5, -1.9, -1.3); g.stroke(); }
      g.strokeStyle = '#d9812f'; g.lineWidth = s * .22; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + s * .9, cy + s * .1); g.quadraticCurveTo(cx + s * .9, cy + s * .75, cx - s * .2, cy + s * .55); g.stroke();
      g.strokeStyle = '#3a2418'; g.lineWidth = 2; g.beginPath(); g.arc(cx - s * .98, cy - s * .08, s * .07, .2, 2.9); g.stroke(); g.beginPath(); g.arc(cx - s * .72, cy - s * .08, s * .07, .2, 2.9); g.stroke();
      vignette(g, w, h, .5);
    }
  };

  P.wedding = (g, w, h, rnd, k) => {
    if (k === 1){ vgrad(g, 0, 0, w, h, ['#2a1f1a', '#4a362a', '#1a1310']); bokeh(g, w, h, rnd, 60, ['255,226,180', '255,200,150', '255,240,220'], 60, 1); }
    else { vgrad(g, 0, 0, w, h, ['#03050d', '#0e1636', '#1a2350']); starfield(g, w, h, rnd, 500, h); bokeh(g, w, h, rnd, 30, ['255,196,120', '255,240,220'], 30, 1); }
    const cx = w * .5, cy = h * .52, R = w * .16;
    [[-R * .55, 0], [R * .55, 0]].forEach(([dx], i) => {
      const x = cx + dx, y = cy + (i ? R * .1 : 0);
      g.lineWidth = R * .22; const gr = g.createLinearGradient(x - R, y - R, x + R, y + R);
      gr.addColorStop(0, '#fff2c8'); gr.addColorStop(.35, '#d9a948'); gr.addColorStop(.6, '#fff0c0'); gr.addColorStop(1, '#9c6f22');
      g.strokeStyle = gr; g.beginPath(); g.ellipse(x, y, R, R * .92, i ? .3 : -.3, 0, TAU); g.stroke();
    });
    if (k === 2){ g.fillStyle = '#eaf2ff'; g.beginPath(); g.moveTo(cx - R * .55, cy - R * 1.02); g.lineTo(cx - R * .35, cy - R * 1.3); g.lineTo(cx - R * .75, cy - R * 1.3); g.fill(); glow(g, cx - R * .55, cy - R * 1.15, R * .6, '220,235,255', .6); }
    glow(g, cx, cy, w * .5, '255,220,160', .15);
    vignette(g, w, h, .5);
  };

  P.tropics = (g, w, h, rnd, k) => {
    const hz = h * .6, stops = SKIES.tropic; vgrad(g, 0, 0, w, hz, stops);
    const sx = w * .56, sy = hz - h * .02; glow(g, sx, sy, w * .7, '255,180,110', .45);
    g.save(); g.beginPath(); g.rect(0, 0, w, hz); g.clip(); g.fillStyle = '#ffe1a0'; g.beginPath(); g.arc(sx, sy, w * .1, 0, TAU); g.fill(); g.restore();
    vgrad(g, 0, hz, w, h, ['#c9574f', '#4b1f45', '#12081c']);
    g.globalCompositeOperation = 'lighter';
    for (let y = hz + 2; y < h; y += 3){ const d = (y - hz) / (h - hz), ww = w * (.05 + d * .3) * (.5 + rnd() * .7); g.fillStyle = `rgba(255,200,130,${.35 * (1 - d * .6)})`; g.fillRect(sx - ww / 2 + (rnd() - .5) * 14, y, ww, 1.4); }
    g.globalCompositeOperation = 'source-over';
    if (k === 2){ g.strokeStyle = 'rgba(255,230,210,.55)'; g.lineWidth = 2; for (let i = 0; i < 5; i++){ const y = hz + h * (.08 + i * .06); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 20) g.lineTo(x, y + Math.sin(x * .03 + i) * 4); g.stroke(); }
      const bx = w * .42, by = hz + h * .16; g.fillStyle = '#12081c'; g.save(); g.translate(bx, by); g.rotate(-.12); g.fillRect(-26, 0, 52, 5); couple(g, 0, 0, h * .07, '#12081c'); g.restore(); }
    palm(g, w * .9, h, h * .55, '#0c0612', -.35); palm(g, w * .06, h * 1.02, h * .42, '#0c0612', .32);
    if (k === 1){ g.fillStyle = '#0c0612'; g.beginPath(); g.moveTo(0, h * .92); g.quadraticCurveTo(w * .5, h * .88, w, h * .94); g.lineTo(w, h); g.lineTo(0, h); g.fill(); couple(g, w * .46, h * .91, h * .11, '#0c0612'); }
  };

  P.canyon = (g, w, h, rnd) => {
    vgrad(g, 0, 0, w, h * .5, ['#3e7cc0', '#8fc1e8', '#e7d4b8']);
    const cols = ['#e8a063', '#cf7443', '#b4552f', '#8e3b22', '#5e2415', '#3a150c'];
    cols.forEach((c, i) => { const base = h * (.36 + i * .11); ridge(g, w, h, rnd, base, h * (.12 - i * .01), .45, c);
      g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1; for (let j = 0; j < 30; j++){ const x = rnd() * w, y = base + rnd() * h * .1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 6, y + h * .05); g.stroke(); } });
    g.fillStyle = '#3f8f8a'; g.beginPath(); g.moveTo(0, h * .95); g.quadraticCurveTo(w * .4, h * .9, w * .6, h * .96); g.quadraticCurveTo(w * .8, h, w, h * .97); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    vignette(g, w, h, .35);
  };

  P.cake = (g, w, h, rnd, k) => {
    vgrad(g, 0, 0, w, h, ['#140c10', '#241319', '#0b0709']);
    bokeh(g, w, h, rnd, 40, ['255,170,90', '255,120,140', '255,220,170'], 40, .6);
    const cx = w * .5, top = h * .56, cw = w * (k === 2 ? .26 : .34), ch = h * .16;
    glow(g, cx, top - h * .06, w * .6, '255,170,90', .4);
    g.fillStyle = '#3a2016'; g.fillRect(0, top + ch, w, h - top - ch);
    g.fillStyle = k === 2 ? '#c98a5a' : '#f2d9d0'; g.fillRect(cx - cw, top, cw * 2, ch);
    g.beginPath(); g.ellipse(cx, top + ch, cw, cw * .18, 0, 0, Math.PI); g.fill();
    g.fillStyle = k === 2 ? '#e6b98e' : '#fff3ee'; g.beginPath(); g.ellipse(cx, top, cw, cw * .18, 0, 0, TAU); g.fill();
    g.fillStyle = k === 2 ? '#8a4b2a' : '#d9a6b5'; for (let i = 0; i < 12; i++){ const x = cx - cw + i * cw / 6; g.beginPath(); g.ellipse(x + 6, top + 6, 5, 8 + rnd() * 8, 0, 0, TAU); g.fill(); }
    if (k !== 2) for (let i = 0; i < 7; i++){ const x = cx - cw * .75 + i * cw * .25, y = top - 6 - rnd() * 4; g.fillStyle = ['#8fb3ff', '#ffb3c8', '#fff0a8'][i % 3]; g.fillRect(x - 2, y - 26, 4, 26);
      glow(g, x, y - 34, 18, '255,190,100', .7); g.fillStyle = '#ffe6a8'; g.beginPath(); g.ellipse(x, y - 33, 3, 6, 0, 0, TAU); g.fill(); }
    else { g.fillStyle = '#efe6d8'; g.beginPath(); g.ellipse(w * .2, top + ch + 8, 34, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#6b3a1f'; g.beginPath(); g.ellipse(w * .2, top + ch + 2, 22, 6, 0, 0, TAU); g.fill(); }
    vignette(g, w, h, .5);
  };

  P.fest = (g, w, h, rnd, k) => {
    const bg = {1: ['#1f0d0c', '#3a1714', '#12080a'], 2: ['#0c1410', '#16241c', '#070c09'], 3: ['#101a3c', '#2f2c66', '#7b4a86']}[k] || ['#1f0d0c', '#3a1714', '#12080a'];
    vgrad(g, 0, 0, w, h, bg);
    if (k === 3){ starfield(g, w, h, rnd, 200, h * .4); ridge(g, w, h, rnd, h * .7, h * .12, .55, '#0a0c1a'); for (let i = 0; i < 5; i++){ g.fillStyle = '#070912'; g.beginPath(); g.arc(rnd() * w, h * (.62 + rnd() * .06), w * (.08 + rnd() * .06), 0, TAU); g.fill(); } }
    bokeh(g, w, h, rnd, 40, k === 2 ? ['255,210,120', '160,230,190'] : ['255,170,90', '255,120,90', '255,220,160'], 44, 1);
    for (let s = 0; s < 3; s++){
      const y0 = h * (.12 + s * .16), sag = h * (.08 + rnd() * .06); g.strokeStyle = 'rgba(20,12,10,.9)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-10, y0); g.quadraticCurveTo(w / 2, y0 + sag * 2, w + 10, y0); g.stroke();
      for (let i = 0; i <= 16; i++){ const t = i / 16, x = -10 + (w + 20) * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0;
        glow(g, x, y + 5, 18, k === 2 ? '255,220,140' : '255,190,110', .55); g.fillStyle = '#fff1cc'; g.beginPath(); g.arc(x, y + 5, 2.6, 0, TAU); g.fill(); }
    }
    if (k === 1){ g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * .78, w, h * .22); g.fillStyle = '#d98a3a'; for (let i = 0; i < 9; i++){ g.beginPath(); g.arc(w * (.25 + rnd() * .5), h * (.84 + rnd() * .05), 9 + rnd() * 5, 0, TAU); g.fill(); } }
    if (k === 3) couple(g, w * .5, h * .95, h * .16, '#05060d');
    vignette(g, w, h, .45);
  };

  P.blossom = (g, w, h, rnd) => {
    vgrad(g, 0, 0, w, h, ['#f7d9e3', '#f1c1d3', '#d9a6c6', '#9b8bbf']);
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(w * .7, h * .28, w * .08, 0, TAU); g.fill();
    g.fillStyle = '#b79cc6'; g.beginPath(); g.moveTo(w * .1, h * .7); g.lineTo(w * .45, h * .38); g.lineTo(w * .52, h * .4); g.lineTo(w * .9, h * .7); g.fill();
    g.fillStyle = '#f3e8f2'; g.beginPath(); g.moveTo(w * .4, h * .43); g.lineTo(w * .45, h * .38); g.lineTo(w * .52, h * .4); g.lineTo(w * .56, h * .44); g.lineTo(w * .5, h * .43); g.lineTo(w * .46, h * .45); g.fill();
    const px = w * .72, pb = h * .78; g.fillStyle = '#5b3a55';
    for (let i = 0; i < 4; i++){ const y = pb - i * h * .07, ww = w * (.14 - i * .025); g.fillRect(px - ww * .4, y - h * .05, ww * .8, h * .05); g.beginPath(); g.moveTo(px - ww, y - h * .045); g.quadraticCurveTo(px, y - h * .075, px + ww, y - h * .045); g.lineTo(px + ww * .6, y - h * .06); g.lineTo(px - ww * .6, y - h * .06); g.fill(); }
    g.fillStyle = '#6d4a60'; g.fillRect(0, h * .78, w, h * .22);
    g.strokeStyle = '#3a2233'; g.lineCap = 'round';
    const branch = (x, y, a, L, d) => { if (d > 5 || L < 6) return; const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; g.lineWidth = Math.max(1, 7 - d * 1.3); g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
      if (d >= 2) for (let i = 0; i < 4; i++){ g.fillStyle = rnd() < .5 ? '#ffd1e0' : '#ffb3cb'; g.beginPath(); g.arc(ex + (rnd() - .5) * 18, ey + (rnd() - .5) * 18, 3 + rnd() * 4, 0, TAU); g.fill(); }
      branch(ex, ey, a - .45 + rnd() * .2, L * .72, d + 1); branch(ex, ey, a + .35 + rnd() * .2, L * .68, d + 1); };
    branch(-10, h * .12, .35, w * .32, 0);
  };

  P.aurora = (g, w, h, rnd) => {
    vgrad(g, 0, 0, w, h, ['#020412', '#061230', '#0b1f3c']);
    starfield(g, w, h, rnd, 500, h * .7);
    auroraBands(g, w, h, 0);
    ridge(g, w, h, rnd, h * .72, h * .16, .55, '#03060e');
    vgrad(g, 0, h * .76, w, h, ['#061a2a', '#02050c']);
  };
  function auroraBands(g, w, h, t){
    g.globalCompositeOperation = 'lighter';
    [['80,255,170', .0, .38], ['120,180,255', 1.7, .3], ['190,110,255', 3.1, .24]].forEach(([col, ph, y0]) => {
      for (let x = 0; x < w; x += 3){
        const y = h * (y0 + .08 * Math.sin(x * .012 + ph + t * .4) + .03 * Math.sin(x * .035 + t * .9)), L = h * (.18 + .08 * Math.sin(x * .02 + ph + t * .6));
        const gr = g.createLinearGradient(0, y - L, 0, y); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},.16)`); g.fillStyle = gr; g.fillRect(x, y - L, 3, L);
      }
    });
    g.globalCompositeOperation = 'source-over';
  }

  /* ---------------- анимация поверх кадра (для «видео») ---------------- */
  function fx(g, w, h, spec, t){
    const r = mulberry(seedOf(spec.s, spec.k) ^ 77), s = spec.s;
    if (s === 'snow' || (s === 'home' && spec.k === 6)){
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 140; i++){ const x0 = r() * w, sp = 20 + r() * 50, sz = .8 + r() * 2.2, y = (r() * h + t * sp) % h, x = x0 + Math.sin(t * .8 + i) * 12; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); }
    } else if (s === 'stars' || s === 'aurora' || (s === 'lake' && spec.k === 4)){
      if (s === 'aurora') auroraBands(g, w, h, t);
      for (let i = 0; i < 90; i++){ const x = r() * w, y = r() * h * .7, a = Math.max(0, Math.sin(t * (1 + r() * 2) + r() * 6)); g.fillStyle = `rgba(255,250,235,${a * .9})`; g.fillRect(x, y, 1.6, 1.6); }
      const per = spec.k === 2 ? 1.3 : 3.2, n = Math.floor(t / per), p = (t % per) / per, mr = mulberry(n * 97 + 3), mx = mr() * w * .8, my = mr() * h * .4, L = 120 + mr() * 80;
      if (p < .35){ const q = p / .35, hx = mx + q * L * 1.5, hy = my + q * L * .7, gr = g.createLinearGradient(hx - L * .6, hy - L * .28, hx, hy); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,250,235,${Math.sin(q * Math.PI)})`); g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx - L * .6, hy - L * .28); g.lineTo(hx, hy); g.stroke(); }
    } else if (s === 'fireworks'){
      burstField(g, w, h, mulberry(seedOf(s, spec.k)), t, spec.k);
    } else if (s === 'lake' || s === 'tropics'){
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++){ const x = w * (.3 + r() * .4) + Math.sin(t * 1.4 + i) * 8, y = h * (.6 + r() * .38), a = Math.max(0, Math.sin(t * 3 + i * 1.7)); g.fillStyle = `rgba(255,236,200,${a * .5})`; g.fillRect(x, y, 6 + r() * 10, 1.2); }
      g.globalCompositeOperation = 'source-over';
    } else if (s === 'cafe' || s === 'wedding' || s === 'fest' || s === 'cake' || s === 'city'){
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++){ const x = (r() * w + t * (6 + r() * 10)) % w, y = r() * h * .8 + Math.sin(t * .6 + i) * 10, rr = (6 + r() * 30) * (w / 400), a = (.04 + r() * .1) * (.6 + .4 * Math.sin(t * 1.2 + i));
        const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,206,140,${a})`); gr.addColorStop(1, 'rgba(255,206,140,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      g.globalCompositeOperation = 'source-over';
      if (s === 'cafe' && spec.k !== 1){ g.strokeStyle = 'rgba(255,245,230,.25)'; g.lineWidth = 2; for (let i = 0; i < 3; i++){ const bx = w * (.46 + i * .04), by = h * .72; g.beginPath(); g.moveTo(bx, by); for (let j = 1; j < 12; j++) g.lineTo(bx + Math.sin(t * 1.5 + j * .6 + i) * 6, by - j * 6); g.stroke(); } }
    } else if (s === 'blossom'){
      for (let i = 0; i < 40; i++){ const x = (r() * w + t * (10 + r() * 20)) % w, y = (r() * h + t * (18 + r() * 24)) % h; g.fillStyle = 'rgba(255,190,210,.9)'; g.save(); g.translate(x, y); g.rotate(t + i); g.beginPath(); g.ellipse(0, 0, 4, 2.2, 0, 0, TAU); g.fill(); g.restore(); }
    } else if (s === 'cat'){
      if (spec.k === 1){ g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 30; i++){ const a = Math.max(0, Math.sin(t * 2 + i)); g.globalAlpha = a; g.fillRect(w * (.18 + r() * .64), h * (.12 + r() * .4), 1.5, 1.5); } g.globalAlpha = 1; }
    }
  }

  /* ---------------- публичное API ---------------- */
  const cache = new Map();
  function paint(g, w, h, spec){
    const fn = P[spec.s] || P.cafe; g.save(); fn(g, w, h, mulberry(seedOf(spec.s, spec.k)), spec.k || 1); g.restore();
  }
  // настоящие фото пары: spec.p — ключ в DATA.photos; иначе рисуем процедурную сцену
  const photo = spec => spec && spec.p && window.DATA && window.DATA.photos ? window.DATA.photos[spec.p] : null;
  function url(spec, w, h, withFx = true){
    const ph = photo(spec); if (ph) return ph.src;
    const key = `${spec.s}:${spec.k}:${w}x${h}:${withFx ? 1 : 0}`; if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    paint(g, w, h, spec); if (withFx) fx(g, w, h, spec, 1.3); grain(g, w, h);
    const u = c.toDataURL('image/jpeg', .84); cache.set(key, u); return u;
  }
  function frame(g, w, h, spec, img, t, dur){
    const p = Math.min(1, t / (dur || 6)), sc = 1.04 + p * .08, dx = ((spec.k || 1) % 2 ? -1 : 1) * p * w * .03;
    const iw = img.naturalWidth || w, ih = img.naturalHeight || h, cover = Math.max(w / iw, h / ih), dw = iw * cover, dh = ih * cover;
    const ph = photo(spec), fy = ph && ph.pos ? parseFloat(ph.pos.split(' ')[1]) / 100 : .5, oy = (h - dh) * (fy - .5);
    g.save(); g.translate(w / 2 + dx, h / 2 + oy); g.scale(sc, sc); g.drawImage(img, -dw / 2, -dh / 2, dw, dh); g.restore();
    if (ph) { if (spec.fx) fx(g, w, h, spec.fx, t); } else fx(g, w, h, spec, t);
  }
  return {url, paint, fx, frame, mulberry, seedOf, photo};
})();
