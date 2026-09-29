(() => {
'use strict';

/* ================= утилиты ================= */
const D = window.DATA, SKY = window.SKY, A = window.Astronomy || null, SC = window.Scenes;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const D2R = Math.PI / 180, TAU = Math.PI * 2;
const MONO = '"IBM Plex Mono", ui-monospace, monospace', DISPLAY = 'Oranienbaum, "Times New Roman", serif';
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MSHORT = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const nf = n => Math.floor(n).toLocaleString('ru-RU');
const pad = n => String(Math.floor(n)).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));
const isPhone = () => innerWidth < 820;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
function plural(n, one, few, many){
  n = Math.abs(Math.floor(n)); const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
const store = {
  get(k, d){ try { const v = localStorage.getItem('sozv:' + k); return v == null ? d : JSON.parse(v); } catch (e){ return d; } },
  set(k, v){ try { localStorage.setItem('sozv:' + k, JSON.stringify(v)); } catch (e){ /* приватное окно */ } }
};

/* даты */
const ymd = s => s.split('-').map(Number);
const dObj = s => { const [y, m, d] = ymd(s); return new Date(y, m - 1, d); };
const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const dayDiff = (a, b) => Math.round((b - a) / 864e5);
const fmtDate = s => { const [y, m, d] = ymd(s); return `${d} ${MONTHS[m - 1]} ${y}`; };
const dots = s => { const [y, m, d] = ymd(s); return `${pad(d)}.${pad(m)}.${y}`; };
function fmtRange(m){
  if (!m.date) return 'когда-нибудь';
  if (!m.end) return fmtDate(m.date);
  const [y1, m1, d1] = ymd(m.date), [y2, m2, d2] = ymd(m.end);
  if (y1 === y2 && m1 === m2) return `${d1}–${d2} ${MONTHS[m1 - 1]} ${y1}`;
  if (y1 === y2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y1}`;
  return `${fmtDate(m.date)} – ${fmtDate(m.end)}`;
}
function ago(s){
  const days = dayDiff(dObj(s), today0());
  if (days === 0) return 'сегодня';
  if (days < 0) return `через ${nf(-days)} ${plural(-days, 'день', 'дня', 'дней')}`;
  const dd = `${nf(days)} ${plural(days, 'день', 'дня', 'дней')}`, y = Math.floor(days / 365.25);
  if (y >= 1) return `${y} ${plural(y, 'год', 'года', 'лет')} назад · ${dd}`;
  const mo = Math.floor(days / 30.44);
  return mo >= 1 ? `${mo} ${plural(mo, 'месяц', 'месяца', 'месяцев')} назад · ${dd}` : `${dd} назад`;
}

/* воспоминания */
const CL = new Map(D.clusters.map(c => [c.id, c]));
const MEM = D.memories, M = new Map(MEM.map(m => [m.id, m]));
const byDate = (a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || '');
const ORDER = D.clusters.flatMap(c => MEM.filter(m => m.c === c.id).sort(byDate));        // порядок полёта: созвездие за созвездием
const CHRONO = MEM.filter(m => m.date && !m.dream && !m.future).sort(byDate);
const thumb = m => SC.url(m.shots[0], 200, 200);
const SINCE = new Date(D.couple.since).getTime(), CAPSULE = new Date(D.couple.capsule).getTime();
const related = m => [...new Set([...(m.links || []), ...D.links.filter(l => l.includes(m.id)).map(l => l[0] === m.id ? l[1] : l[0])])].filter(id => M.has(id));

/* общее состояние камеры и «варпа» */
const cam = {x: 0, y: 0, z: .5};
const warp = {v: 0, dx: 0, dy: 1};

/* ================= звук ================= */
const Sound = (() => {
  let ctx = null, bus = null, on = false, loop = null, step = 0;
  const CH = [[174.61, 220, 261.63, 329.63], [146.83, 174.61, 220, 261.63], [116.54, 146.83, 174.61, 220], [130.81, 164.81, 196, 246.94]];
  function init(){
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); bus = ctx.createGain(); bus.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500;
    const dl = ctx.createDelay(2); dl.delayTime.value = .48; const fb = ctx.createGain(); fb.gain.value = .38; const wet = ctx.createGain(); wet.gain.value = .32;
    bus.connect(lp); lp.connect(ctx.destination); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(ctx.destination);
    return true;
  }
  function chord(){
    const now = ctx.currentTime, notes = CH[step++ % CH.length];
    notes.forEach((f, i) => [0, 6].forEach(det => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = det ? 'triangle' : 'sine'; o.frequency.value = i === 0 ? f / 2 : f; o.detune.value = det;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.03, now + 3); g.gain.linearRampToValueAtTime(.0001, now + 10);
      o.connect(g); g.connect(bus); o.start(now); o.stop(now + 10.2);
    }));
  }
  function chime(hi){
    if (!on) return;
    const now = ctx.currentTime, f = (hi ? [1567.98, 1760, 2093] : [1046.5, 1174.66, 1318.51, 1567.98, 1760])[Math.floor(Math.random() * (hi ? 3 : 5))];
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.05, now + .01); g.gain.exponentialRampToValueAtTime(.0001, now + 1.6);
    o.connect(g); g.connect(bus); o.start(now); o.stop(now + 1.7);
  }
  function whoosh(){
    if (!on) return;
    const now = ctx.currentTime, len = 1.2, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .5;
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, now); bp.frequency.exponentialRampToValueAtTime(2400, now + len * .5); bp.frequency.exponentialRampToValueAtTime(500, now + len);
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.05, now + len * .45); g.gain.linearRampToValueAtTime(0, now + len);
    src.connect(bp); bp.connect(g); g.connect(bus); src.start(now);
  }
  function toggle(){
    if (!ctx && !init()) return false;
    on = !on; const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now); bus.gain.setValueAtTime(bus.gain.value, now);
    if (on){ ctx.resume(); bus.gain.linearRampToValueAtTime(.9, now + 2); chord(); loop = setInterval(chord, 8000); }
    else { bus.gain.linearRampToValueAtTime(0, now + 1.2); clearInterval(loop); }
    document.body.classList.toggle('sound-on', on);
    $$('[data-sound]').forEach(x => { x.setAttribute('aria-pressed', on); x.textContent = x.closest('.intro') ? (on ? 'Звук включён' : 'Включить звук') : (on ? 'Звук вкл' : 'Звук'); });
    const sc = $('#songState'); if (sc) sc.textContent = on ? 'играет · нажми, чтобы выключить' : 'нажми, чтобы включить';
    return on;
  }
  return {toggle, chime, whoosh, get on(){ return on; }};
})();
document.addEventListener('click', e => { if (e.target.closest('[data-sound]')) Sound.toggle(); });

/* ================= небо: каталог и проекции ================= */
const STARS = [];
for (let i = 0; i < SKY.s.length; i += 4) STARS.push({ra: SKY.s[i], dec: SKY.s[i + 1], mag: SKY.s[i + 2], bv: SKY.s[i + 3]});
function starRGB(bv){
  if (bv < 0) return '200,214,255'; if (bv < .4) return '236,240,255'; if (bv < .8) return '255,245,228';
  if (bv < 1.2) return '255,226,190'; return '255,202,162';
}
const SPR = {};
function sprite(bv){
  const rgb = starRGB(bv); if (SPR[rgb]) return SPR[rgb];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.1, `rgba(${rgb},.95)`); gr.addColorStop(.32, `rgba(${rgb},.2)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (SPR[rgb] = c);
}
function softDot(rgb){
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return c;
}
const MWS = {cool: softDot('190,184,235'), warm: softDot('236,214,190')};
const MW = [];
(function(){
  const aG = 192.85948 * D2R, dG = 27.12825 * D2R, lN = 122.93192 * D2R; let seed = 11;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * rnd()); };
  for (let i = 0; i < 2600; i++){
    const l = rnd() * 360, width = 4.5 + 4 * Math.abs(Math.sin(l * D2R)), b = gauss() * width * (rnd() < .18 ? 2.2 : 1), L = l * D2R, B = b * D2R;
    const dec = Math.asin(Math.sin(B) * Math.sin(dG) + Math.cos(B) * Math.cos(dG) * Math.cos(lN - L));
    const ra = aG + Math.atan2(Math.cos(B) * Math.sin(lN - L), Math.sin(B) * Math.cos(dG) - Math.cos(B) * Math.sin(dG) * Math.cos(lN - L));
    const dl = Math.min(l, 360 - l);
    MW.push({ra: ((ra / D2R) % 360 + 360) % 360, dec: dec / D2R, w: .35 + .65 * Math.exp(-dl * dl / 9800), warm: rnd() < .35, s: .6 + rnd() * 1.2});
  }
})();
function toENU(ra, dec, lst, lat){
  const H = (lst - ra) * D2R, d = dec * D2R, f = lat * D2R, cd = Math.cos(d), sd = Math.sin(d), ch = Math.cos(H), sh = Math.sin(H), sf = Math.sin(f), cf = Math.cos(f);
  return [-cd * sh, sd * cf - cd * ch * sf, sd * sf + cd * ch * cf];
}
function gmstDeg(date){ const d = date.getTime() / 864e5 + 2440587.5 - 2451545; return ((280.46061837 + 360.98564736629 * d) % 360 + 360) % 360; }
function polar(ra, dec){ const cd = Math.cos(dec * D2R), sd = Math.sin(dec * D2R); return {rho: cd / (1 + sd), a: -ra * D2R}; }

/* ================= фон: живое небо с параллаксом и «варпом» ================= */
const Sky = (() => {
  const cvs = $('#sky'), ctx = cvs.getContext('2d'), PAR = 70;
  let W = 0, H = 0, DPR = 1, pole = {x: 0, y: 0}, K = 600, Rmax = 0, off = null, bright = [], rot = .9, shoot = null, nextShoot = performance.now() + 5000, last = 0;
  const streaks = Array.from({length: 90}, () => ({x: Math.random(), y: Math.random(), d: .25 + Math.random() * .75}));
  function build(){
    W = innerWidth; H = innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    pole = {x: W * .5, y: H * .06}; K = Math.max(W, H) * .72;
    Rmax = Math.hypot(Math.max(pole.x, W - pole.x), Math.max(pole.y, H - pole.y)) + 30 + PAR;
    const S = Rmax * 2, sc = Math.min(DPR, 1.5, 3800 / S);
    off = document.createElement('canvas'); off.width = off.height = Math.ceil(S * sc);
    const g = off.getContext('2d'); g.scale(sc, sc); g.translate(Rmax, Rmax);
    const P = (ra, dec) => { const q = polar(ra, dec), r = q.rho * K; return [r * Math.sin(q.a), r * Math.cos(q.a), r]; };
    g.globalCompositeOperation = 'lighter';
    for (const p of MW){ const [x, y, r] = P(p.ra, p.dec); if (r > Rmax + 60) continue; const s = 14 + p.s * 14; g.globalAlpha = .045 * p.w; g.drawImage(p.warm ? MWS.warm : MWS.cool, x - s, y - s, s * 2, s * 2); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(227,196,143,.075)'; g.lineWidth = 1;
    for (const id in SKY.l) for (const seg of SKY.l[id]){
      let ok = true; for (let i = 1; i < seg.length; i += 2) if (seg[i] < -50) ok = false; if (!ok) continue;
      g.beginPath(); for (let i = 0; i < seg.length; i += 2){ const [x, y] = P(seg[i], seg[i + 1]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    for (const s of STARS){
      if (s.mag <= 2.2) continue; const [x, y, r] = P(s.ra, s.dec); if (r > Rmax) continue;
      g.fillStyle = `rgba(${starRGB(s.bv)},${Math.min(1, .16 + (5.4 - s.mag) * .2)})`; g.beginPath(); g.arc(x, y, Math.max(.45, 1.9 - .3 * s.mag), 0, TAU); g.fill();
    }
    bright = STARS.filter(s => s.mag <= 2.2).map(s => ({...polar(s.ra, s.dec), mag: s.mag, spr: sprite(s.bv), ph: Math.random() * 6.28, sp: .6 + Math.random() * 1.6})).filter(b => b.rho * K < Rmax);
  }
  function frame(t){
    const dt = Math.min(.05, last ? (t - last) / 1000 : 0); last = t;
    if (!REDUCED) rot += dt * (.004 + warp.v * .06);
    const par = MapView.active ? 1 : 0, ox = clamp(-cam.x * .05 * par, -PAR, PAR), oy = clamp(-cam.y * .05 * par, -PAR, PAR), px = pole.x + ox, py = pole.y + oy;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(px, py); ctx.rotate(-rot); ctx.drawImage(off, -Rmax, -Rmax, Rmax * 2, Rmax * 2); ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of bright){
      const r = b.rho * K, an = b.a + rot, x = px + r * Math.sin(an), y = py + r * Math.cos(an);
      if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
      const tw = REDUCED ? 1 : .75 + .25 * Math.sin(t / 1000 * b.sp + b.ph), z = (2.4 - b.mag) * 5 + 9;
      ctx.globalAlpha = Math.min(1, .55 + (2.3 - b.mag) * .22) * tw; ctx.drawImage(b.spr, x - z / 2, y - z / 2, z, z);
    }
    ctx.globalAlpha = 1;
    if (warp.v > .02 && !REDUCED){
      ctx.lineCap = 'round';
      for (const s of streaks){
        s.x = (s.x + warp.dx * .018 * s.d * warp.v + 1) % 1; s.y = (s.y + warp.dy * .018 * s.d * warp.v + 1) % 1;
        const x = s.x * W, y = s.y * H, L = (20 + 150 * warp.v) * s.d;
        const gr = ctx.createLinearGradient(x - warp.dx * L, y - warp.dy * L, x, y);
        gr.addColorStop(0, 'rgba(255,240,220,0)'); gr.addColorStop(1, `rgba(255,244,228,${.4 * warp.v * s.d})`);
        ctx.strokeStyle = gr; ctx.lineWidth = .5 + s.d * .8; ctx.beginPath(); ctx.moveTo(x - warp.dx * L, y - warp.dy * L); ctx.lineTo(x, y); ctx.stroke();
      }
    }
    if (!REDUCED){
      if (!shoot && t > nextShoot) shoot = {x: W * (.1 + Math.random() * .6), y: H * Math.random() * .35, ang: (18 + Math.random() * 28) * D2R, len: 110 + Math.random() * 120, t0: t, dur: 950};
      if (shoot){
        const p = (t - shoot.t0) / shoot.dur;
        if (p >= 1){ shoot = null; nextShoot = t + 9000 + Math.random() * 10000; }
        else {
          const dist = p * shoot.len * 2.3, tail = shoot.len * Math.min(1, p * 3), c = Math.cos(shoot.ang), s = Math.sin(shoot.ang);
          const hx = shoot.x + c * dist, hy = shoot.y + s * dist, tx = hx - c * tail, ty = hy - s * tail, gr = ctx.createLinearGradient(tx, ty, hx, hy);
          gr.addColorStop(0, 'rgba(255,240,220,0)'); gr.addColorStop(1, `rgba(255,246,230,${.9 * Math.sin(p * Math.PI)})`);
          ctx.strokeStyle = gr; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  return {build, frame, cvs};
})();

/* ================= пыль: созвездия из тысяч треугольников ================= */
const Dust = (() => {
  const c = $('#dust'), g = c.getContext('2d');
  const COLS = ['227,196,143', '255,184,41', '243,236,223', '169,139,255', '255,122,168', '56,196,168', '126,166,255'];
  const WTS = [.3, .12, .16, .14, .11, .1, .07], ALPHA = [.13, .32, .62, .95];
  let P = [], sparks = [], w = 0, h = 0, dpr = 1, t0 = 0, mode = 'ambient', ptr = {x: -999, y: -999}, last = 0;
  const pick = () => { let r = Math.random(), a = 0; for (let i = 0; i < WTS.length; i++){ a += WTS[i]; if (r < a) return i; } return 0; };
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function resize(){ w = innerWidth; h = innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  function populate(){
    const n = w * h < 520000 ? 1400 : 2200;
    P = Array.from({length: n}, () => ({x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .14, vy: (Math.random() - .5) * .14,
      k: 0, s: 1.1 + Math.random() * 2.1, r: Math.random() * TAU, vr: (Math.random() - .5) * .012, c: pick(), c0: 0, d: 0, ph: Math.random() * TAU, sp: .5 + Math.random() * 1.5, arr: false}));
    P.forEach(p => { p.c0 = p.c; });
  }
  function assign(pts, spread, instant){
    t0 = performance.now(); const order = shuffle(P.map((_, i) => i));
    order.forEach((pi, k) => {
      const p = P[pi], q = pts[k]; p.arr = false; p.c = p.c0;
      if (!q){ p.k = 0; p.dim = false; return; }
      Object.assign(p, q); p.d = Math.random() * spread;
      if (q.col != null) p.c = q.col;
      if (instant){ const [x, y] = target(p); p.x = x; p.y = y; p.arr = true; }
    });
  }
  function target(p){
    if (p.k === 1) return [p.tx, p.ty];
    if (p.k === 2){ const s = p.n.s, sp = p.n.core ? 14 + 10 * Math.sqrt(cam.z) : p.n.key ? 6 + 9 * Math.sqrt(cam.z) : 4 + 6 * Math.sqrt(cam.z); return [s.x + p.ox * sp, s.y + p.oy * sp]; }
    const a = p.e.a.s, b = p.e.b.s, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    return [a.x + dx * p.u - dy / len * p.j * 1.7, a.y + dy * p.u + dx / len * p.j * 1.7];
  }
  function textPoints(text, size){
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const og = o.getContext('2d', {willReadFrequently: true}), [a, b] = text.split('·'), cy = h * .42;
    og.fillStyle = '#fff'; og.textAlign = 'center'; og.textBaseline = 'middle'; og.font = `${size}px ${DISPLAY}`;
    og.fillText(a, w / 2 - size * .5, cy); og.fillText(b, w / 2 + size * .5, cy);
    og.beginPath(); og.arc(w / 2, cy + size * .04, size * .055, 0, TAU); og.fill();
    const d = og.getImageData(0, 0, w, h).data, pts = [], step = Math.max(3, Math.round(size / 52));
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step)
      if (d[(y * w + x) * 4 + 3] > 140) pts.push({k: 1, tx: x + (Math.random() - .5) * step * .7, ty: y + (Math.random() - .5) * step * .7});
    return shuffle(pts);
  }
  function monogram(text){
    const size = Math.min(w * .46, h * .3, 280);
    const go = () => { mode = 'shape'; assign(textPoints(text, size).slice(0, Math.floor(P.length * .86)), 900); };
    (document.fonts && document.fonts.load ? document.fonts.load(`${Math.round(size)}px Oranienbaum`) : Promise.resolve()).then(go, go);
  }
  function graph(instant){
    const nodes = MapView.nodes, edges = MapView.edges, budget = Math.floor(P.length * .84), pts = [];
    nodes.forEach(n => {
      const k = n.core ? 80 : n.key ? 44 : (n.dream || n.future) ? 16 : 24;
      for (let i = 0; i < k; i++){ const r = Math.abs(gauss()), a = Math.random() * TAU; pts.push({k: 2, n, ox: Math.cos(a) * r, oy: Math.sin(a) * r, dim: !!(n.dream || n.future), col: n.dream ? 3 : null}); }
    });
    const wt = e => e.type === 'spoke' ? .3 : e.type === 'link' ? .55 : e.type === 'fut' ? .35 : 1;
    const total = edges.reduce((s, e) => s + e.len * wt(e), 0) || 1, rem = Math.max(0, budget - pts.length);
    edges.forEach(e => {
      const cnt = Math.round(rem * e.len * wt(e) / total);
      for (let i = 0; i < cnt; i++) pts.push({k: 3, e, u: Math.random(), j: gauss(), dim: e.type !== 'chain', col: e.type === 'link' ? 3 : null});
    });
    mode = 'graph'; assign(shuffle(pts).slice(0, budget), instant ? 0 : 1100, instant);
  }
  function burst(x, y){
    c.style.zIndex = 85; setTimeout(() => { c.style.zIndex = ''; }, 1700);
    for (let i = 0; i < 110; i++){ const a = Math.random() * TAU, v = 1.2 + Math.random() * 4.5; sparks.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2, r: Math.random() * TAU, s: 1.4 + Math.random() * 2.6, c: pick(), life: 1}); }
  }
  const tri = (p, s) => { for (let k = 0; k < 3; k++){ const an = p.r + k * 2.0944, x = p.x + Math.cos(an) * s, y = p.y + Math.sin(an) * s; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  function frame(t){
    const f = Math.min(4, last ? (t - last) / 16.67 : 1); last = t;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const buckets = Array.from({length: COLS.length * 4}, () => []);
    const kA = REDUCED ? 1 : 1 - Math.pow(1 - .052, f), kF = REDUCED ? 1 : 1 - Math.pow(1 - .3, f), wob = mode === 'graph' ? 1 : .7;
    for (const p of P){
      if (p.k){
        if (t - t0 > p.d){
          const [tx, ty] = target(p), gx = tx + (REDUCED ? 0 : Math.sin(t * .0011 * p.sp + p.ph) * wob), gy = ty + (REDUCED ? 0 : Math.cos(t * .0013 * p.sp + p.ph) * wob);
          const k = p.arr ? kF : kA; p.x += (gx - p.x) * k; p.y += (gy - p.y) * k;
          if (!p.arr && Math.abs(gx - p.x) + Math.abs(gy - p.y) < 3) p.arr = true;
        }
      } else if (!REDUCED){
        p.x += p.vx * f; p.y += p.vy * f;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }
      const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < 4900){ const d = Math.sqrt(d2) || 1, fo = (1 - d / 70) * 2.4; p.x += dx / d * fo; p.y += dy / d * fo; }
      if (!REDUCED) p.r += p.vr * f;
      if (p.x < -20 || p.y < -20 || p.x > w + 20 || p.y > h + 20) continue;
      let lvl = 0; if (p.k) lvl = p.dim ? 1 : (Math.sin(t * .002 * p.sp + p.ph) > .55 ? 3 : 2);
      buckets[p.c * 4 + lvl].push(p);
    }
    g.lineWidth = 1;
    buckets.forEach((arr, i) => { if (!arr.length) return; g.strokeStyle = `rgba(${COLS[Math.floor(i / 4)]},${ALPHA[i % 4]})`; g.beginPath(); for (const p of arr) tri(p, p.s); g.stroke(); });
    if (sparks.length){
      for (const sp of sparks){ sp.x += sp.vx; sp.y += sp.vy; sp.vx *= .965; sp.vy = sp.vy * .965 + .035; sp.r += .08; sp.life -= .011;
        if (sp.life <= 0) continue; g.strokeStyle = `rgba(${COLS[sp.c]},${sp.life})`; g.beginPath(); tri(sp, sp.s); g.stroke(); }
      sparks = sparks.filter(sp => sp.life > 0);
    }
  }
  addEventListener('pointermove', e => { ptr = {x: e.clientX, y: e.clientY}; }, {passive: true});
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ptr = {x: -999, y: -999}; });
  document.addEventListener('pointerleave', () => { ptr = {x: -999, y: -999}; });
  return {resize, populate, monogram, graph, burst, frame, get mode(){ return mode; }};
})();

/* ================= карта-граф ================= */
const MapView = (() => {
  const map = $('#map'), svg = $('#edges'), nodesEl = $('#nodes'), clEl = $('#clabels');
  const nodes = [], edges = [], clabels = [], byId = new Map();
  let portrait = false, bounds = null, anim = null, inertia = null, sel = null, lod = -1, lastKey = '', active = false;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function mkNode(n, i){
    const b = document.createElement('button');
    b.className = 'node' + (n.key ? ' key' : '') + (n.core ? ' core' : '') + (n.dream ? ' dream' : '') + (n.future ? ' future' : '');
    b.style.setProperty('--i', i); b.dataset.id = n.id; b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', n.core ? 'Мы. Открыть письмо' : `${n.m.title}, ${n.m.date ? fmtRange(n.m) : 'мечта'}`);
    b.innerHTML = `<span class="n-glow"></span><span class="n-core">${n.core ? 'Т·А' : ''}</span><span class="n-lbl"><span class="n-t"></span><span class="n-d"></span></span>`;
    $('.n-t', b).textContent = n.core ? 'Мы' : n.m.title;
    $('.n-d', b).textContent = n.core ? 'с 14.02.2023' : n.m.date ? dots(n.m.date) : 'мечта';
    nodesEl.appendChild(b); n.el = b;
  }
  function build(){
    const core = {id: 'core', core: true, key: true, wx0: 0, wy0: 0, s: {x: 0, y: 0}, c: null};
    nodes.push(core);
    ORDER.forEach(m => { const c = CL.get(m.c); nodes.push({id: m.id, m, c: m.c, key: !!m.key, dream: !!m.dream, future: !!m.future, wx0: c.x + m.pos[0], wy0: c.y + m.pos[1], s: {x: 0, y: 0}}); });
    nodes.forEach((n, i) => { byId.set(n.id, n); mkNode(n, i); });
    const add = (a, b, type) => { const e = {a: byId.get(a), b: byId.get(b), type, len: 0}; e.el = document.createElementNS(SVGNS, 'line'); e.el.setAttribute('class', type); svg.appendChild(e.el); edges.push(e); };
    D.clusters.forEach(c => {
      const list = MEM.filter(m => m.c === c.id).sort(byDate);
      add('core', list[0].id, 'spoke');
      for (let i = 1; i < list.length; i++) add(list[i - 1].id, list[i].id, c.id === 'future' ? 'fut' : 'chain');
    });
    D.links.forEach(([a, b]) => add(a, b, 'link'));
    D.clusters.forEach(c => {
      const b = document.createElement('button'); b.className = 'clabel'; b.dataset.c = c.id;
      const n = MEM.filter(m => m.c === c.id).length;
      b.innerHTML = `<small>созвездие</small><b>${esc(c.name)}</b><i>${n} ${plural(n, 'звезда', 'звезды', 'звёзд')}</i>`;
      clEl.appendChild(b); clabels.push({c, el: b, wx: 0, wy: 0});
    });
    $('#brandSub').textContent = `${CHRONO.length} ${plural(CHRONO.length, 'воспоминание', 'воспоминания', 'воспоминаний')} · ${D.clusters.length} созвездий`;
    bind();
  }
  function layout(){
    portrait = innerWidth < innerHeight * .95;
    nodes.forEach(n => { [n.wx, n.wy] = portrait ? [-n.wy0, n.wx0] : [n.wx0, n.wy0]; });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    nodes.forEach(n => { x0 = Math.min(x0, n.wx); y0 = Math.min(y0, n.wy); x1 = Math.max(x1, n.wx); y1 = Math.max(y1, n.wy); });
    bounds = {x0: x0 - 120, y0: y0 - 170, x1: x1 + 120, y1: y1 + 90};
    clabels.forEach(cl => {
      const ns = nodes.filter(n => n.c === cl.c.id), mx = ns.reduce((s, n) => s + n.wx, 0) / ns.length, my = Math.min(...ns.map(n => n.wy));
      cl.wx = mx; cl.wy = my - 95; cl.cx = mx; cl.cy = ns.reduce((s, n) => s + n.wy, 0) / ns.length;
    });
    edges.forEach(e => { e.len = Math.hypot(e.b.wx - e.a.wx, e.b.wy - e.a.wy); });
    lastKey = '';
  }
  const pads = () => isPhone() ? {top: 150, bottom: 190} : {top: 110, bottom: 150};
  function fitCam(){
    const {top, bottom} = pads(), bw = bounds.x1 - bounds.x0, bh = bounds.y1 - bounds.y0;
    const z = clamp(Math.min((innerWidth - 70) / bw, (innerHeight - top - bottom) / bh), .15, 1.2);
    return {x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2 - (top - bottom) / 2 / z, z};
  }
  function clusterCam(cid){
    const ns = nodes.filter(n => n.c === cid), {top, bottom} = pads();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    ns.forEach(n => { x0 = Math.min(x0, n.wx); y0 = Math.min(y0, n.wy); x1 = Math.max(x1, n.wx); y1 = Math.max(y1, n.wy); });
    const bw = x1 - x0 + 250, bh = y1 - y0 + 240, z = clamp(Math.min((innerWidth - 60) / bw, (innerHeight - top - bottom) / bh), .35, 1.4);
    return {x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 30 / z - (top - bottom) / 2 / z, z};
  }
  const zRange = () => [fitCam().z * .7, 2.4];

  function flyTo(tgt, dur, onDone, onProgress){
    const from = {x: cam.x, y: cam.y, z: cam.z}, zm = Math.min(from.z, tgt.z);
    const dsx = (tgt.x - from.x) * zm, dsy = (tgt.y - from.y) * zm, dist = Math.hypot(dsx, dsy);
    const arc = clamp(dist / (innerWidth * 1.1), 0, .6);
    dur = REDUCED ? 1 : (dur || clamp(750 + dist * .6, 800, 2000));
    inertia = null;
    anim = {from, tgt, dur, t0: performance.now(), arc, onDone, onProgress, dx: dist ? -dsx / dist : 0, dy: dist ? -dsy / dist : 1};
    if (arc > .15) Sound.whoosh();
  }
  function step(t){
    if (anim){
      const {from, tgt, dur, t0, arc} = anim, p = clamp((t - t0) / dur, 0, 1), e = ease(p);
      cam.x = lerp(from.x, tgt.x, e); cam.y = lerp(from.y, tgt.y, e);
      cam.z = Math.exp(lerp(Math.log(from.z), Math.log(tgt.z), e)) * (1 - arc * Math.sin(Math.PI * p));
      warp.v = arc > .08 ? Math.sin(Math.PI * p) * clamp(arc * 1.9, 0, 1) : 0; warp.dx = anim.dx; warp.dy = anim.dy;
      if (anim.onProgress) anim.onProgress(p);
      if (p >= 1){ const done = anim.onDone; anim = null; warp.v = 0; if (done) done(); }
    } else if (inertia){
      cam.x -= inertia.vx / cam.z; cam.y -= inertia.vy / cam.z; inertia.vx *= .92; inertia.vy *= .92;
      if (Math.abs(inertia.vx) + Math.abs(inertia.vy) < .3) inertia = null;
    }
    if (bounds && !anim){ cam.x = clamp(cam.x, bounds.x0 - 200, bounds.x1 + 200); cam.y = clamp(cam.y, bounds.y0 - 200, bounds.y1 + 200); }
  }
  function render(){
    const W = innerWidth, H = innerHeight, key = `${cam.x.toFixed(2)}|${cam.y.toFixed(2)}|${cam.z.toFixed(4)}|${W}|${H}`;
    for (const n of nodes){ n.s.x = (n.wx - cam.x) * cam.z + W / 2; n.s.y = (n.wy - cam.y) * cam.z + H / 2; }
    if (key === lastKey) return; lastKey = key;
    const l = cam.z < (portrait ? .45 : .72) ? 0 : cam.z < 1.15 ? 1 : 2;
    if (l !== lod){ map.dataset.lod = l; lod = l; }
    const cc = {}, placed = [], journey = document.body.classList.contains('journey');
    const hit = (x, y, w, h) => placed.some(b => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y);
    clabels.forEach(cl => {
      const sx = (cl.wx - cam.x) * cam.z + W / 2, sy = (cl.wy - cam.y) * cam.z + H / 2; cc[cl.c.id] = (cl.cx - cam.x) * cam.z + W / 2;
      cl.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%)`;
      if (cl.w == null){ cl.w = cl.el.offsetWidth || 140; cl.h = cl.el.offsetHeight || 60; }
      if (lod < 2 && !journey) placed.push({x: sx - cl.w / 2, y: sy - cl.h / 2, w: cl.w, h: cl.h});
    });
    for (const n of nodes){ n.el.style.transform = `translate3d(${n.s.x.toFixed(1)}px,${n.s.y.toFixed(1)}px,0)`; placed.push({x: n.s.x - 8, y: n.s.y - 8, w: 16, h: 16}); }
    // подписи: сначала выбранная, «Мы» и главные звёзды; каждая ищет свободную сторону, иначе прячется
    const pri = n => (n === sel ? 100 : 0) + (n.core ? 50 : 0) + (n.key ? 10 : 0) - (n.dream ? 1 : 0);
    const setSide = (n, sd) => { if (sd !== n.side){ n.el.classList.remove('side-' + n.side); n.el.classList.add('side-' + sd); n.side = sd; } };
    const showLbl = (n, v) => { if (n.lv !== v){ n.el.classList.toggle('nolbl', !v); n.lv = v; } };
    for (const n of [...nodes].sort((a, b) => pri(b) - pri(a))){
      if (n.lw == null){ const lb = $('.n-lbl', n.el); n.lw = lb.offsetWidth || 120; n.lh = lb.offsetHeight || 36; }
      if (n.core){ setSide(n, 'b'); placed.push({x: n.s.x - n.lw / 2, y: n.s.y + 34, w: n.lw, h: n.lh}); showLbl(n, true); continue; }
      if (lod === 0 && n !== sel){ showLbl(n, false); continue; }
      const pref = n.s.x >= cc[n.c] ? 'r' : 'l'; let ok = null;
      for (const sd of [pref, pref === 'r' ? 'l' : 'r']){
        const x = sd === 'r' ? n.s.x + 28 : n.s.x - 28 - n.lw, y = n.s.y - n.lh / 2;
        if (x < 4 || x + n.lw > W - 4) continue;
        if (!hit(x - 3, y - 2, n.lw + 6, n.lh + 4)){ ok = sd; placed.push({x, y, w: n.lw, h: n.lh}); break; }
      }
      if (ok) setSide(n, ok); else if (n === sel) setSide(n, pref);
      showLbl(n, !!ok || n === sel);
    }
    for (const e of edges){ e.el.setAttribute('x1', e.a.s.x.toFixed(1)); e.el.setAttribute('y1', e.a.s.y.toFixed(1)); e.el.setAttribute('x2', e.b.s.x.toFixed(1)); e.el.setAttribute('y2', e.b.s.y.toFixed(1)); }
  }
  function zoomAt(sx, sy, z){
    const [zmin, zmax] = zRange(); z = clamp(z, zmin, zmax);
    const wx = (sx - innerWidth / 2) / cam.z + cam.x, wy = (sy - innerHeight / 2) / cam.z + cam.y;
    cam.z = z; cam.x = wx - (sx - innerWidth / 2) / z; cam.y = wy - (sy - innerHeight / 2) / z;
  }
  function select(id){
    if (sel) sel.el.classList.remove('sel');
    sel = id ? byId.get(id) : null; if (sel) sel.el.classList.add('sel');
    lastKey = '';
  }
  function highlight(id){
    map.classList.toggle('hl', !!id);
    nodes.forEach(n => n.el.classList.remove('on')); edges.forEach(e => e.el.classList.remove('on'));
    if (!id) return;
    byId.get(id).el.classList.add('on');
    edges.forEach(e => { if (e.a.id === id || e.b.id === id){ e.el.classList.add('on'); e.a.el.classList.add('on'); e.b.el.classList.add('on'); } });
  }
  function bind(){
    const ptrs = new Map(); let drag = null, moved = false, suppress = false, pinch = null;
    map.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (!Journey.isOpen()) { inertia = null; if (anim && !anim.lock) anim = null; }
      if (ptrs.size === 1){ drag = {x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, lx: e.clientX, ly: e.clientY, vx: 0, vy: 0}; moved = false; }
      else if (ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), z: cam.z}; moved = true; }
    });
    map.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pinch && ptrs.size === 2 && !Journey.isOpen()){
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.z * d / pinch.d); return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) > 7){ moved = true; try { map.setPointerCapture(e.pointerId); } catch (err){ /* уже отпущен */ } map.classList.add('dragging'); }
      if (moved && !Journey.isOpen()){
        cam.x = drag.cx - dx / cam.z; cam.y = drag.cy - dy / cam.z;
        drag.vx = e.clientX - drag.lx; drag.vy = e.clientY - drag.ly; drag.lx = e.clientX; drag.ly = e.clientY;
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId); map.classList.remove('dragging');
      if (ptrs.size < 2) pinch = null;
      if (drag && moved){
        suppress = true; setTimeout(() => { suppress = false; }, 50);
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Journey.isOpen()){ if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) Journey.step(dx < 0 ? 1 : -1, true); else if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx)) Journey.step(dy < 0 ? 1 : -1, true); }
        else if (!REDUCED) inertia = {vx: drag.vx, vy: drag.vy};
      }
      if (!ptrs.size) drag = null;
    };
    map.addEventListener('pointerup', up); map.addEventListener('pointercancel', up);
    map.addEventListener('click', e => { if (suppress){ e.stopPropagation(); e.preventDefault(); } }, true);
    let wheelLock = 0;
    map.addEventListener('wheel', e => {
      e.preventDefault();
      if (Journey.isOpen()){
        const now = performance.now(), d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (Math.abs(d) > 24 && now > wheelLock){ wheelLock = now + 900; Journey.step(d > 0 ? 1 : -1, true); }
        return;
      }
      anim = null; inertia = null; zoomAt(e.clientX, e.clientY, cam.z * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016)));
    }, {passive: false});
    nodesEl.addEventListener('click', e => {
      const b = e.target.closest('.node'); if (!b) return;
      if (b.dataset.id === 'core') Letter.show(false); else Journey.show(b.dataset.id);
    });
    nodesEl.addEventListener('pointerover', e => { const b = e.target.closest('.node'); if (!b || e.pointerType !== 'mouse') return; highlight(b.dataset.id); Sound.chime(true); });
    nodesEl.addEventListener('pointerout', e => { const b = e.target.closest('.node'); if (b && !b.contains(e.relatedTarget)) highlight(null); });
    clEl.addEventListener('click', e => { const b = e.target.closest('.clabel'); if (b) flyTo(clusterCam(b.dataset.c)); });
    $('#zIn').addEventListener('click', () => flyTo({x: cam.x, y: cam.y, z: clamp(cam.z * 1.5, ...zRange())}, 450));
    $('#zOut').addEventListener('click', () => flyTo({x: cam.x, y: cam.y, z: clamp(cam.z / 1.5, ...zRange())}, 450));
    $('#zFit').addEventListener('click', () => flyTo(fitCam()));
    const chips = $('#cchips');
    chips.innerHTML = `<button class="chip" data-c="all" aria-pressed="true">Вся карта</button>` + D.clusters.map(c => `<button class="chip" data-c="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === b));
      flyTo(b.dataset.c === 'all' ? fitCam() : clusterCam(b.dataset.c));
    });
  }
  function show(){ active = true; map.hidden = false; }
  const remeasure = () => { nodes.forEach(n => { n.lw = null; }); clabels.forEach(cl => { cl.w = null; }); lastKey = ''; };
  return {build, layout, fitCam, clusterCam, flyTo, step, render, select, show, remeasure, nodes, edges, node: id => byId.get(id), el: map,
    get active(){ return active; }, get portrait(){ return portrait; }, get flying(){ return !!anim; }};
})();

/* ================= таймер ================= */
const Timer = (() => {
  let mode = 0; const el = $('#timer'), big = $('#tBig'), unit = $('#tUnit'), clk = $('#tClock');
  function ymdDiff(a, b){
    let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
    if (b.getHours() * 3600 + b.getMinutes() * 60 + b.getSeconds() < a.getHours() * 3600 + a.getMinutes() * 60 + a.getSeconds()) d--;
    if (d < 0){ m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0){ y--; m += 12; }
    return {y, m, d};
  }
  function tick(){
    const now = Date.now(), ms = Math.max(0, now - SINCE), days = Math.floor(ms / 864e5), rem = ms % 864e5;
    let b, u, c = `${pad(rem / 36e5)}:${pad(rem % 36e5 / 6e4)}:${pad(rem % 6e4 / 1e3)}`;
    if (mode === 0){ b = nf(days); u = `${plural(days, 'день', 'дня', 'дней')} вместе`; }
    else if (mode === 1){ const d = ymdDiff(new Date(SINCE), new Date(now)); b = String(d.y); u = `${plural(d.y, 'год', 'года', 'лет')}, ${d.m} мес. и ${d.d} ${plural(d.d, 'день', 'дня', 'дней')}`; }
    else if (mode === 2){ const h = Math.floor(ms / 36e5); b = nf(h); u = `${plural(h, 'час', 'часа', 'часов')} вместе`; c = `${pad(ms % 36e5 / 6e4)}:${pad(ms % 6e4 / 1e3)}`; }
    else { const beats = ms / 6e4 * 72; b = nf(beats); u = `${plural(beats, 'удар', 'удара', 'ударов')} сердца рядом`; }
    big.textContent = b; big.classList.toggle('long', b.length > 7); unit.textContent = u; clk.textContent = c;
    $$('[data-days]').forEach(x => { x.textContent = nf(days); });
    const cm = Math.max(0, CAPSULE - now), cd = Math.floor(cm / 864e5), cr = cm % 864e5;
    $$('[data-capdays]').forEach(x => { x.textContent = nf(cd); });
    $('#capUnit').textContent = plural(cd, 'день', 'дня', 'дней');
    $('#capClock').textContent = `${pad(cr / 36e5)}:${pad(cr % 36e5 / 6e4)}:${pad(cr % 6e4 / 1e3)}`;
  }
  const next = () => { el.classList.add('swap'); setTimeout(() => { mode = (mode + 1) % 4; tick(); el.classList.remove('swap'); }, REDUCED ? 0 : 250); };
  el.addEventListener('click', next);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); next(); } });
  return {tick};
})();

/* ================= переписка ================= */
function runChat(list, status, msgs, day){
  const run = {cancel: false};
  (async () => {
    list.innerHTML = `<div class="chat-day">${esc(day)}</div>`;
    if (status){ status.textContent = 'была недавно'; status.classList.remove('typing'); }
    await wait(500);
    for (const m of msgs){
      if (run.cancel) return;
      if (!m.me){
        if (status){ status.textContent = 'печатает…'; status.classList.add('typing'); }
        const tb = document.createElement('div'); tb.className = 'typing-b'; tb.innerHTML = '<i></i><i></i><i></i>'; list.appendChild(tb);
        await wait(600 + m.x.length * 24); tb.remove(); if (run.cancel) return;
        if (status){ status.textContent = 'в сети'; status.classList.remove('typing'); }
      } else await wait(850);
      if (run.cancel) return;
      const el = document.createElement('div'); el.className = 'msg ' + (m.me ? 'from-him' : 'from-her'); el.textContent = m.x;
      const tm = document.createElement('time'); tm.textContent = m.t; el.appendChild(tm); list.appendChild(el);
      if (!m.me) Sound.chime();
    }
    if (status) status.textContent = 'была недавно';
  })();
  return run;
}

/* ================= стирание ================= */
function initScratch(box, onReveal){
  const foil = $('.foil', box), r = box.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  foil.width = Math.round(r.width * dpr); foil.height = Math.round(r.height * dpr);
  const fg = foil.getContext('2d', {willReadFrequently: true}); fg.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = r.width, h = r.height;
  const paint = () => {
    const gr = fg.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#a8895b'); gr.addColorStop(.25, '#ead6ab'); gr.addColorStop(.5, '#b39163'); gr.addColorStop(.74, '#f2e3c1'); gr.addColorStop(1, '#9a7b4e');
    fg.fillStyle = gr; fg.fillRect(0, 0, w, h); fg.globalAlpha = .07;
    for (let i = 0; i < 260; i++){ fg.strokeStyle = i % 2 ? '#fff' : '#5a4424'; fg.lineWidth = Math.random() * 1.3; const y = Math.random() * h; fg.beginPath(); fg.moveTo(0, y); fg.lineTo(w, y + (Math.random() - .5) * 34); fg.stroke(); }
    fg.globalAlpha = 1; fg.fillStyle = 'rgba(92,68,36,.26)'; fg.font = `13px ${DISPLAY}`; fg.textAlign = 'center'; fg.textBaseline = 'middle';
    for (let y = 22, row = 0; y < h; y += 44, row++) for (let x = (row % 2) * 22 + 14; x < w; x += 44) fg.fillText('✦', x, y);
    fg.font = `46px ${DISPLAY}`; fg.fillStyle = 'rgba(255,248,230,.75)'; fg.fillText('сотри', w / 2 + 1, h / 2 + 1); fg.fillStyle = 'rgba(86,62,30,.8)'; fg.fillText('сотри', w / 2, h / 2);
    fg.font = `10px ${MONO}`; fg.fillStyle = 'rgba(86,62,30,.75)'; fg.fillText('ЗДЕСЬ СПРЯТАНО МЕСТО, ГДЕ ВСЁ НАЧАЛОСЬ', w / 2, h / 2 + 40);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(paint);
  let down = false, lastP = null, moves = 0, done = false;
  const pt = e => { const b = foil.getBoundingClientRect(); return {x: (e.clientX - b.left) * (w / b.width), y: (e.clientY - b.top) * (h / b.height)}; };
  const line = (a, b) => { fg.globalCompositeOperation = 'destination-out'; fg.lineCap = 'round'; fg.lineWidth = 48; fg.beginPath(); fg.moveTo(a.x, a.y); fg.lineTo(b.x + .01, b.y); fg.stroke(); };
  const reveal = () => { if (done) return; done = true; foil.classList.add('gone'); box.classList.add('revealed'); Sound.chime(); if (onReveal) onReveal(); };
  const check = () => { if (done) return; const d = fg.getImageData(0, 0, foil.width, foil.height).data; let c = 0, n = 0; for (let i = 3; i < d.length; i += 4 * 61){ n++; if (d[i] < 40) c++; } if (c / n > .5) reveal(); };
  foil.addEventListener('pointerdown', e => { e.stopPropagation(); down = true; foil.setPointerCapture(e.pointerId); lastP = pt(e); line(lastP, lastP); });
  foil.addEventListener('pointermove', e => { if (!down) return; e.stopPropagation(); const p = pt(e); line(lastP, p); lastP = p; if (++moves % 12 === 0) check(); });
  ['pointerup', 'pointercancel'].forEach(t => foil.addEventListener(t, e => { e.stopPropagation(); if (down){ down = false; check(); } }));
  return {reveal};
}

/* ================= карта неба ================= */
function tzOffsetMin(ms, tz){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 6e4;
}
function zonedToUtc(y, mo, d, h, mi, tz){
  const guess = Date.UTC(y, mo - 1, d, h, mi); let off = tzOffsetMin(guess, tz), utc = guess - off * 6e4;
  const off2 = tzOffsetMin(utc, tz); if (off2 !== off){ off = off2; utc = guess - off * 6e4; }
  return {date: new Date(utc), off};
}
function skyState(y, m, d, hh, mi, cityKey){
  const city = D.cities[cityKey] || D.cities.almaty, z = zonedToUtc(y, m, d, hh, mi, city.tz);
  const gst = A ? A.SiderealTime(z.date) * 15 : gmstDeg(z.date);
  return {date: z.date, off: z.off, city, lat: city.lat, lon: city.lon, lst: ((gst + city.lon) % 360 + 360) % 360, y, m, d, hh, mi};
}
const stateFromAt = (at, city) => { const [ds, ts] = at.split('T'), [y, m, d] = ymd(ds), [hh, mi] = ts.split(':').map(Number); return skyState(y, m, d, hh, mi, city); };
const PLANETS = {Mercury: ['Меркурий', '#d9d2c5'], Venus: ['Венера', '#fff6d8'], Mars: ['Марс', '#ff9a76'], Jupiter: ['Юпитер', '#ffe7c2'], Saturn: ['Сатурн', '#f2dca0']};
const DIRS = ['на севере', 'на северо-востоке', 'на востоке', 'на юго-востоке', 'на юге', 'на юго-западе', 'на западе', 'на северо-западе'];
const dirOf = az => DIRS[Math.round(((az % 360) + 360) % 360 / 45) % 8];
const fmtTime = (date, tz) => new Intl.DateTimeFormat('ru-RU', {timeZone: tz, hour: '2-digit', minute: '2-digit'}).format(date);
function bodies(st){
  if (!A) return null;
  try {
    const obs = new A.Observer(st.lat, st.lon, 0);
    const hz = name => { const eq = A.Equator(name, st.date, obs, true, true); const h = A.Horizon(st.date, obs, eq.ra, eq.dec, 'normal'); return {alt: h.altitude, az: h.azimuth}; };
    const planets = Object.keys(PLANETS).map(n => ({name: n, ...hz(n)})), moon = hz('Moon'), sun = hz('Sun');
    moon.ill = A.Illumination('Moon', st.date).phase_fraction; moon.ph = A.MoonPhase(st.date);
    if (moon.alt < 0){ const r = A.SearchRiseSet('Moon', obs, +1, st.date, 1); moon.rise = r ? r.date : null; }
    return {planets, moon, sun};
  } catch (e){ console.warn(e); return null; }
}
function phaseName(p){
  if (p < 8 || p > 352) return 'новолуние'; if (p < 82) return 'растущий серп'; if (p < 98) return 'первая четверть';
  if (p < 172) return 'растущая'; if (p < 188) return 'полнолуние'; if (p < 262) return 'убывающая';
  if (p < 278) return 'последняя четверть'; return 'убывающий серп';
}
const altAzVec = (alt, az) => { const ca = Math.cos(alt * D2R); return [ca * Math.sin(az * D2R), ca * Math.cos(az * D2R), Math.sin(alt * D2R)]; };
function drawMoon(g, x, y, r, k, ang){
  g.save(); g.translate(x, y);
  const gl = g.createRadialGradient(0, 0, r, 0, 0, r * 3.4); gl.addColorStop(0, 'rgba(255,244,220,.28)'); gl.addColorStop(1, 'rgba(255,244,220,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 3.4, 0, TAU); g.fill();
  g.rotate(ang); g.fillStyle = 'rgba(58,62,84,.95)'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = '#f6ecd6'; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  g.ellipse(0, 0, Math.max(.01, r * Math.abs(2 * k - 1)), r, 0, Math.PI / 2, -Math.PI / 2, k < .5); g.fill(); g.restore();
}
function drawSky(c, st, maxSize, mini){
  const avail = c.parentElement.getBoundingClientRect().width, size = Math.floor(Math.min(maxSize, avail || 320)), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.style.width = size + 'px'; c.style.height = size + 'px'; c.width = size * dpr; c.height = size * dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, R = size / 2 - 30, sc = R / 250, bd = bodies(st);
  const PV = v => ({x: cx - v[0] / (1 + v[2]) * R, y: cy - v[1] / (1 + v[2]) * R, u: v[2]});
  const P = (ra, dec) => PV(toENU(ra, dec, st.lst, st.lat));
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
  const bg = g.createRadialGradient(cx, cy, 0, cx, cy, R); bg.addColorStop(0, '#17214b'); bg.addColorStop(1, '#0a0e22'); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.globalCompositeOperation = 'lighter';
  for (const p of MW){ const q = P(p.ra, p.dec); if (q.u < -.05) continue; const s = (8 + p.s * 8) * sc; g.globalAlpha = .026 * p.w; g.drawImage(p.warm ? MWS.warm : MWS.cool, q.x - s, q.y - s, s * 2, s * 2); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  g.strokeStyle = 'rgba(156,163,189,.16)'; g.lineWidth = .8; g.setLineDash([2, 4]);
  [30, 60].forEach(a => { g.beginPath(); g.arc(cx, cy, Math.tan((90 - a) / 2 * D2R) * R, 0, TAU); g.stroke(); }); g.setLineDash([]);
  g.strokeStyle = 'rgba(227,196,143,.36)'; g.lineWidth = .9;
  for (const id in SKY.l) for (const seg of SKY.l[id]){
    let on = false; g.beginPath();
    for (let i = 0; i < seg.length; i += 2){ const q = P(seg[i], seg[i + 1]); if (q.u < -.08){ on = false; continue; } if (!on){ g.moveTo(q.x, q.y); on = true; } else g.lineTo(q.x, q.y); }
    g.stroke();
  }
  for (const s of STARS){
    const q = P(s.ra, s.dec); if (q.u < 0) continue;
    g.fillStyle = `rgba(${starRGB(s.bv)},${Math.min(1, .35 + (5.4 - s.mag) * .17)})`; g.beginPath(); g.arc(q.x, q.y, Math.max(.45, 2.9 - .5 * s.mag) * sc, 0, TAU); g.fill();
    if (s.mag < 1.6){ const z = (15 - 4 * s.mag) * sc; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .6; g.drawImage(sprite(s.bv), q.x - z, q.y - z, z * 2, z * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  }
  if (mini){ g.restore(); g.strokeStyle = 'rgba(227,196,143,.85)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke(); return null; }
  g.font = `500 ${Math.max(8, 8.6 * sc)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(174,180,204,.72)';
  if ('letterSpacing' in g) g.letterSpacing = '1.5px';
  for (const [, ru, ra, dec, rank] of SKY.c){ if (rank > 1) continue; const q = P(ra, dec); if (q.u < .12) continue; g.fillText(ru.toUpperCase(), q.x, q.y); }
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.font = `${Math.max(11, 12 * sc)}px ${DISPLAY}`; g.textAlign = 'left'; g.fillStyle = 'rgba(243,236,223,.88)';
  const placed = [], fits = (x, y, w, h) => { if (placed.some(b => x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y)) return false; placed.push({x, y, w, h}); return true; };
  for (const [ra, dec, name] of SKY.n.slice(0, 16)){
    const q = P(ra, dec); if (q.u < .06) continue; const w = g.measureText(name).width, h = 13 * sc;
    let x = q.x + 7 * sc; if (x + w > cx + R * .96) x = q.x - 7 * sc - w;
    if (fits(x, q.y - 6 * sc - h / 2, w, h)) g.fillText(name, x, q.y - 6 * sc);
  }
  if (bd){
    for (const p of bd.planets){
      if (p.alt < 0) continue; const q = PV(altAzVec(p.alt, p.az)), [ru, col] = PLANETS[p.name];
      g.fillStyle = col; g.beginPath(); g.arc(q.x, q.y, 3.4 * sc, 0, TAU); g.fill();
      g.strokeStyle = col; g.globalAlpha = .5; g.lineWidth = 1; g.beginPath(); g.arc(q.x, q.y, 7 * sc, 0, TAU); g.stroke(); g.globalAlpha = 1;
      g.font = `italic ${Math.max(11, 12 * sc)}px ${DISPLAY}`; g.fillStyle = col; const w = g.measureText(ru).width, hh = 13 * sc;
      const opts = [[q.x + 10 * sc, q.y + 1], [q.x - 10 * sc - w, q.y + 1], [q.x - w / 2, q.y + 14 * sc], [q.x - w / 2, q.y - 12 * sc]].filter(([x]) => x > cx - R * .96 && x + w < cx + R * .96);
      const spot = opts.find(([x, y]) => fits(x, y - hh / 2, w, hh)) || opts[0]; if (spot) g.fillText(ru, spot[0], spot[1]);
    }
    if (bd.moon.alt > 0){
      const mv = altAzVec(bd.moon.alt, bd.moon.az), sv = altAzVec(bd.sun.alt, bd.sun.az), q = PV(mv);
      const t = mv.map((v, i) => v + .06 * (sv[i] - v)), n = Math.hypot(...t), q2 = PV(t.map(v => v / n));
      drawMoon(g, q.x, q.y, 9 * sc, bd.moon.ill, Math.atan2(q2.y - q.y, q2.x - q.x));
      g.font = `italic ${Math.max(11, 12 * sc)}px ${DISPLAY}`; g.fillStyle = '#f6ecd6'; g.fillText('Луна', q.x + 14 * sc, q.y + 1);
    }
  }
  g.restore();
  g.strokeStyle = 'rgba(227,196,143,.85)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(227,196,143,.5)';
  for (let a = 0; a < 360; a += 5){ const long = a % 30 === 0, s = Math.sin(a * D2R), co = Math.cos(a * D2R), r1 = R + 4, r2 = R + (long ? 12 : 7); g.beginPath(); g.moveTo(cx - s * r1, cy - co * r1); g.lineTo(cx - s * r2, cy - co * r2); g.stroke(); }
  g.font = `500 11px ${MONO}`; g.fillStyle = '#e3c48f'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['С', 0], ['В', 90], ['Ю', 180], ['З', 270]].forEach(([t, a]) => g.fillText(t, cx - Math.sin(a * D2R) * (R + 22), cy - Math.cos(a * D2R) * (R + 22)));

  const facts = [];
  let best = null; for (const [ra, dec, name] of SKY.n){ const u = toENU(ra, dec, st.lst, st.lat)[2]; if (!best || u > best.u) best = {u, name}; }
  if (best && best.u > 0) facts.push(['Выше всех', `${best.name}, ${Math.round(Math.asin(best.u) / D2R)}° над горизонтом`]);
  facts.push(['Высоко в небе', SKY.c.filter(c => c[4] <= 1).map(c => ({n: c[1], u: toENU(c[2], c[3], st.lst, st.lat)[2]})).sort((a, b) => b.u - a.u).slice(0, 3).map(c => c.n).join(', ')]);
  if (bd){
    const m = bd.moon, pct = Math.round(m.ill * 100), ph = phaseName(m.ph);
    facts.push(['Луна', m.alt > 0 ? `${Math.round(m.alt)}° над горизонтом ${dirOf(m.az)}; ${ph}, освещена на ${pct}%` : `под горизонтом${m.rise ? `, взойдёт в ${fmtTime(m.rise, st.city.tz)}` : ''}; ${ph}, освещена на ${pct}%`]);
    const vis = bd.planets.filter(p => p.alt > 0).sort((a, b) => b.alt - a.alt).map(p => `${PLANETS[p.name][0]}: ${Math.round(p.alt)}° ${dirOf(p.az)}${p.alt < 8 ? ', у самого горизонта' : ''}`);
    facts.push(['Планеты', vis.length ? vis.join('; ') : 'ни одной над горизонтом']);
  } else facts.push(['Луна и планеты', 'не загрузились эфемериды, звёзды посчитаны без них']);
  const off = st.off / 60, offS = (off >= 0 ? '+' : '−') + Math.abs(off);
  const cap = [`${st.city.name} · ${Math.abs(st.lat).toFixed(4)}° ${st.lat >= 0 ? 'с.ш.' : 'ю.ш.'} · ${Math.abs(st.lon).toFixed(4)}° ${st.lon >= 0 ? 'в.д.' : 'з.д.'}`, `${st.d} ${MONTHS[st.m - 1]} ${st.y} · ${pad(st.hh)}:${pad(st.mi)} · UTC${offS}`];
  c.setAttribute('aria-label', `Карта неба: ${cap.join(', ')}. ` + facts.map(f => f.join(': ')).join('. '));
  return {facts, cap};
}
function fillSkyText(capEl, factsEl, res){
  capEl.innerHTML = res.cap.map(esc).join('<br>');
  factsEl.innerHTML = res.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
}

/* ================= карточка воспоминания и полёт ================= */
const Journey = (() => {
  const card = $('#card'), inner = $('#cardInner'), body = $('#cardBody'), rail = $('#rail'), where = $('#cardWhere');
  const prevB = $('#cardPrev'), nextB = $('#cardNext'), autoB = $('#cardAuto'), inter = $('#inter'), hint = $('#hint');
  let cur = null, open = false, before = null, auto = null, chat = null, interT = [];
  rail.innerHTML = D.clusters.map(c => { const list = ORDER.filter(m => m.c === c.id);
    return `<button class="rail-seg" style="--n:${list.length}" data-c="${c.id}" aria-label="Созвездие ${esc(c.name)}">${list.map(m => `<i class="rail-dot" data-id="${m.id}"></i>`).join('')}</button>`; }).join('');
  rail.addEventListener('click', e => { const b = e.target.closest('.rail-seg'); if (!b) return; stopAuto(); const first = ORDER.find(m => m.c === b.dataset.c); if (first && first !== cur) show(first.id, 1); });

  function camFor(m){
    const n = MapView.node(m.id), W = innerWidth, H = innerHeight;
    if (isPhone()){ const z = MapView.portrait ? .95 : .8, top = H * .38; return {x: n.wx, y: n.wy + (H / 2 - top / 2) / z, z}; }
    const cw = Math.min(460, W), z = 1.1; return {x: n.wx + cw / 2 / z, y: n.wy, z};
  }
  function showInter(cid){
    const c = CL.get(cid), list = ORDER.filter(m => m.c === cid), yrs = [...new Set(list.filter(m => m.date).map(m => m.date.slice(0, 4)))];
    $('h2', inter).textContent = c.name;
    $('span', inter).textContent = `${list.length} ${plural(list.length, 'звезда', 'звезды', 'звёзд')}${yrs.length ? ' · ' + (yrs.length > 1 ? `${yrs[0]}–${yrs[yrs.length - 1]}` : yrs[0]) : ''}`;
    inter.style.right = isPhone() ? '0' : Math.min(460, innerWidth) + 'px';
    inter.classList.add('show');
  }
  function show(id, dir = 0){
    const m = M.get(id); if (!m) return;
    const prev = cur; cur = m;
    if (!open){
      open = true; before = {x: cam.x, y: cam.y, z: cam.z}; document.body.classList.add('journey'); card.hidden = false; MapView.remeasure();
      render(m); requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('in')));
      if (!store.get('hinted', false)){ store.set('hinted', true); setTimeout(() => hint.classList.add('show'), 900); setTimeout(() => hint.classList.remove('show'), 3800); }
    } else swap(m, dir || 1);
    MapView.select(id);
    interT.forEach(clearTimeout); interT = []; inter.classList.remove('show');
    const crossing = prev && prev.c !== m.c;
    MapView.flyTo(camFor(m), 0, null, crossing ? (p => { if (p > .18 && p < .8) showInter(m.c); else inter.classList.remove('show'); }) : null);
    if (crossing) interT.push(setTimeout(() => inter.classList.remove('show'), 2200));
    const idx = ORDER.indexOf(m);
    $$('.rail-dot', rail).forEach(d => { const i = ORDER.findIndex(x => x.id === d.dataset.id); d.classList.toggle('on', i === idx); d.classList.toggle('done', i < idx); });
    const c = CL.get(m.c), inC = ORDER.filter(x => x.c === m.c), k = inC.indexOf(m) + 1;
    where.innerHTML = `Созвездие <b>${esc(c.name)}</b> · ${k} / ${inC.length}`;
    const p = ORDER[idx - 1], n = ORDER[(idx + 1) % ORDER.length];
    prevB.disabled = !p; $('span', prevB).textContent = p ? p.title : '';
    $('span', nextB).textContent = idx === ORDER.length - 1 ? 'Снова к началу' : n.title;
    Sound.chime();
  }
  function step(d, user){ if (!cur) return; if (user) stopAuto(); const idx = ORDER.indexOf(cur), n = ORDER[idx + d]; if (n) show(n.id, d); else if (d > 0) show(ORDER[0].id, 1); }
  function swap(m, dir){
    if (chat) chat.cancel = true;
    if (REDUCED){ render(m); return; }
    inner.classList.add(dir > 0 ? 'out-l' : 'out-r');
    setTimeout(() => {
      render(m); inner.classList.remove('out-l', 'out-r'); inner.classList.add(dir > 0 ? 'from-r' : 'from-l'); body.scrollTop = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => inner.classList.remove('from-r', 'from-l')));
    }, 260);
  }
  function close(silent){
    if (!open) return; open = false; stopAuto(); if (chat) chat.cancel = true;
    card.classList.remove('in'); document.body.classList.remove('journey'); inter.classList.remove('show');
    setTimeout(() => { if (!open) card.hidden = true; }, 750);
    MapView.select(null);
    if (!silent) MapView.flyTo(before || MapView.fitCam());
    cur = null;
  }
  function stopAuto(){ if (auto){ clearInterval(auto); auto = null; } autoB.setAttribute('aria-pressed', 'false'); }
  autoB.addEventListener('click', () => { if (auto) stopAuto(); else { auto = setInterval(() => step(1), 6500); autoB.setAttribute('aria-pressed', 'true'); step(1); } });
  $('#cardClose').addEventListener('click', () => close());
  $('#flyBtn').addEventListener('click', () => show(ORDER[0].id));
  prevB.addEventListener('click', () => step(-1, true));
  nextB.addEventListener('click', () => step(1, true));

  // свайп по карточке
  let sw = null;
  body.addEventListener('pointerdown', e => { if (e.target.closest('.car,.scratch,.chat,canvas,input,.seg')) return; sw = {x: e.clientX, y: e.clientY, id: e.pointerId, h: false}; });
  body.addEventListener('pointermove', e => {
    if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (!sw.h && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3){ sw.h = true; inner.style.transition = 'none'; }
    if (sw.h){ inner.style.transform = `translateX(${dx * .6}px)`; inner.style.opacity = String(1 - Math.min(.6, Math.abs(dx) / 400)); }
  });
  const swEnd = e => {
    if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, was = sw.h; sw = null;
    inner.style.transition = ''; inner.style.transform = ''; inner.style.opacity = '';
    if (was && Math.abs(dx) > 70) step(dx < 0 ? 1 : -1, true);
  };
  body.addEventListener('pointerup', swEnd); body.addEventListener('pointercancel', swEnd);

  function media(m){
    const clip = m.clips && m.clips[0];
    return `<div class="c-media"><div class="car">${m.shots.map((sh, i) => `<figure data-i="${i}"><img src="${SC.url(sh, 720, 540)}" alt="${esc(m.title)}, кадр ${i + 1} из ${m.shots.length}"></figure>`).join('')}</div>` +
      (m.shots.length > 1 ? `<div class="car-dots">${m.shots.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>` : '') +
      `<span class="c-tag">демо-кадр</span>` + (clip ? `<button class="c-play" data-clip><i>▶</i>${esc(clip.d)} · видео</button>` : (m.story ? `<button class="c-play" data-story><i>▶</i>история</button>` : '')) + `</div>`;
  }
  function embed(m){
    const e = m.embed; if (!e) return '';
    if (e.type === 'scratch') return `<div class="c-embed"><p class="c-sec">Сотри, чтобы увидеть</p><div class="scratch" id="cScratch"><img src="${SC.url({s: 'cafe', k: 1}, 600, 750)}" alt="Кофейня на Панфилова"><div class="photo-cap"><b>Кофейня на Панфилова</b><span>10.02.2023 · 18:05 · здесь будет ваше фото</span></div><canvas class="foil" aria-label="Золотой слой. Проведи пальцем, чтобы стереть"></canvas></div><p style="text-align:center;margin:6px 0 0"><button class="btn-ghost" id="cReveal">Открыть без стирания</button></p></div>`;
    if (e.type === 'chat' || e.type === 'love') return `<div class="c-embed"><p class="c-sec">${e.type === 'chat' ? 'Те самые семь сообщений' : '23:41'}</p><div class="chat"><div class="chat-top"><span class="ava" aria-hidden="true">А</span><div><div class="chat-name">Алина</div><div class="chat-status" id="cChatStatus">была недавно</div></div></div><div class="chat-body${e.type === 'chat' ? ' tall' : ''}" id="cChat" aria-live="polite"></div></div><button class="btn-ghost" data-sub="chat">Вся переписка в цифрах →</button></div>`;
    if (e.type === 'sky') return `<div class="c-embed"><p class="c-sec">Небо в эту минуту</p><div class="skychart"><canvas id="cSky" role="img"></canvas></div><p class="sky-cap" id="cSkyCap"></p><dl class="sky-facts" id="cSkyFacts"></dl><button class="btn-ghost" data-sub="sky" data-preset="${m.id}">Открыть небо целиком →</button></div>`;
    if (e.type === 'capsule') return `<div class="c-embed"><p class="c-sec">До открытия</p><div class="stats"><div class="stat"><b data-capdays>0</b><span>дней осталось</span></div></div><button class="btn-ghost" data-sub="capsule">Попробовать открыть →</button></div>`;
    return '';
  }
  function render(m){
    const c = CL.get(m.c), rel = related(m);
    inner.innerHTML = media(m) +
      `<p class="c-eyebrow">${esc(m.dream ? 'Мечта' : (m.label || c.name))} · ${esc(fmtRange(m))}</p>` +
      `<h2 class="c-title">${esc(m.title)}</h2>` +
      `<p class="c-meta">${m.date ? esc(ago(m.date)) + '<br>' : ''}${esc(m.place || '')}${m.geo ? ` · ${Math.abs(m.geo[0]).toFixed(2)}° ${m.geo[0] >= 0 ? 'с.ш.' : 'ю.ш.'}` : ''}</p>` +
      (m.hers ? `<div class="c-versions"><div class="seg" role="group" aria-label="Чья версия"><button aria-pressed="true" data-ver="his">Его версия</button><button aria-pressed="false" data-ver="hers">Её версия</button></div></div>` : '') +
      `<p class="c-text" id="cText">${esc(m.text)}</p>` +
      (m.stats ? `<div class="c-stats">${m.stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>` : '') +
      embed(m) +
      (m.tags ? `<div class="c-tags">${m.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : '') +
      (rel.length ? `<p class="c-sec">Связано</p><div class="c-links">${rel.map(id => { const r = M.get(id); return `<button class="c-link" data-go="${id}"><img src="${thumb(r)}" alt=""><span><b>${esc(r.title)}</b><small>${esc(r.date ? dots(r.date) : 'мечта')} · ${esc(CL.get(r.c).name)}</small></span><em>→</em></button>`; }).join('')}</div>` : '');
    // карусель
    const car = $('.car', inner), dotsEl = $$('.car-dots i', inner);
    if (car && dotsEl.length) car.addEventListener('scroll', () => { const i = Math.round(car.scrollLeft / car.clientWidth); dotsEl.forEach((d, k) => d.classList.toggle('on', k === i)); }, {passive: true});
    $$('.car figure', inner).forEach(f => f.addEventListener('click', () => Lightbox.open(m.shots.map((sh, i) => ({m, sh, i, w: 4, h: 3})), +f.dataset.i, f)));
    const play = $('[data-clip]', inner); if (play) play.addEventListener('click', () => Viewer.clip(m, m.clips[0]));
    const st = $('[data-story]', inner); if (st) st.addEventListener('click', () => Viewer.story(m));
    $$('[data-ver]', inner).forEach(b => b.addEventListener('click', () => {
      $$('[data-ver]', inner).forEach(x => x.setAttribute('aria-pressed', x === b));
      const t = $('#cText', inner); t.style.opacity = 0; setTimeout(() => { t.textContent = b.dataset.ver === 'hers' ? m.hers : m.text; t.style.opacity = 1; }, 250);
    }));
    $$('[data-go]', inner).forEach(b => b.addEventListener('click', () => { stopAuto(); show(b.dataset.go, 1); }));
    const e = m.embed;
    if (e && e.type === 'scratch'){ requestAnimationFrame(() => { const box = $('#cScratch', inner); if (!box) return; const s = initScratch(box, () => { const rb = $('#cReveal', inner); if (rb) rb.hidden = true; }); $('#cReveal', inner).addEventListener('click', s.reveal); }); }
    if (e && (e.type === 'chat' || e.type === 'love')){ if (chat) chat.cancel = true; chat = runChat($('#cChat', inner), $('#cChatStatus', inner), e.type === 'chat' ? D.chat : D.loveChat, e.type === 'chat' ? '10 февраля 2023' : '18 марта 2023'); }
    if (e && e.type === 'sky'){ requestAnimationFrame(() => { const cv = $('#cSky', inner); if (!cv) return; const res = drawSky(cv, stateFromAt(e.at, e.city), 380); fillSkyText($('#cSkyCap', inner), $('#cSkyFacts', inner), res); }); }
    Timer.tick();
  }
  document.addEventListener('keydown', e => {
    if (!open || Overlays.top()) return;
    if (e.key === 'ArrowRight') step(1, true); else if (e.key === 'ArrowLeft') step(-1, true); else if (e.key === 'Escape') close();
  });
  return {show, step, close, isOpen: () => open, reflow(){ if (open && cur) MapView.flyTo(camFor(cur), 400); }};
})();

/* ================= фото: просмотрщик ================= */
const Lightbox = (() => {
  const lb = $('#lightbox'), img = $('#lbImg'), stage = $('#lbStage');
  let items = [], idx = 0;
  function big(it){ const w = 1200, h = Math.round(w * it.h / it.w); return SC.url(it.sh, w, h); }
  function paint(){
    const it = items[idx]; img.src = big(it); img.alt = `${it.m.title}, ${it.m.date ? dots(it.m.date) : ''}`;
    $('#lbTitle').textContent = it.m.title; $('#lbMeta').textContent = [it.m.date ? fmtRange(it.m) : 'мечта', it.m.place].filter(Boolean).join(' · ');
    $('#lbCount').textContent = `${idx + 1} / ${items.length}`;
  }
  function open(list, i, from){
    items = list; idx = i; lb.hidden = false; paint();
    if (from && !REDUCED){
      const fr = from.getBoundingClientRect();
      requestAnimationFrame(() => {
        const to = img.getBoundingClientRect(); if (!to.width) return;
        img.style.transition = 'none';
        img.style.transform = `translate(${fr.left + fr.width / 2 - (to.left + to.width / 2)}px,${fr.top + fr.height / 2 - (to.top + to.height / 2)}px) scale(${fr.width / to.width})`;
        requestAnimationFrame(() => { img.style.transition = ''; img.style.transform = ''; });
      });
    }
    requestAnimationFrame(() => lb.classList.add('in'));
    Overlays.push('lightbox', close);
  }
  function go(d){ if (items.length < 2) return; idx = (idx + d + items.length) % items.length; img.style.opacity = 0; img.style.transform = `translateX(${d * 30}px)`; setTimeout(() => { paint(); img.style.transition = 'none'; img.style.transform = `translateX(${-d * 30}px)`; requestAnimationFrame(() => { img.style.transition = ''; img.style.opacity = 1; img.style.transform = ''; }); }, 180); }
  function close(){ lb.classList.remove('in'); Overlays.pop('lightbox'); setTimeout(() => { lb.hidden = true; }, 400); }
  $('#lbClose').addEventListener('click', close); $('#lbPrev').addEventListener('click', () => go(-1)); $('#lbNext').addEventListener('click', () => go(1));
  $('#lbOpen').addEventListener('click', () => { const m = items[idx].m; close(); goMemory(m.id); });
  let sx = null; stage.addEventListener('pointerdown', e => { sx = e.clientX; });
  stage.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
  document.addEventListener('keydown', e => { if (Overlays.top() !== 'lightbox') return; if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  return {open};
})();

/* ================= видео: истории, клипы, фильм ================= */
const Viewer = (() => {
  const vw = $('#viewer'), stage = $('#vStage'), cv = $('#vCanvas'), g = cv.getContext('2d'), barsEl = $('#vBars'), title = $('#vTitle');
  let slides = [], idx = 0, t = 0, playing = false, paused = false, last = 0, base = null, bars = [], hold = null, held = false, mode = 'story', seenKey = null;
  function size(){ const r = stage.getBoundingClientRect(), dpr = Math.min(1.5, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  function baseDims(){ const w = cv.width, h = cv.height, s = 960 / Math.max(w, h); return [Math.round(w * s), Math.round(h * s)]; }
  function load(i){
    idx = i; t = 0; const s = slides[i], [bw, bh] = baseDims();
    base = new Image(); base.src = SC.url(s.spec, bw, bh, false);
    bars.forEach((b, k) => { b.style.width = k < i ? '100%' : '0%'; });
    $('#vName').textContent = s.m ? s.m.title : 'Наш фильм'; $('#vDate').textContent = s.m && s.m.date ? fmtRange(s.m) : (s.sub || '');
    $('#vCap').textContent = s.cap || ''; $('#vOpen').hidden = !s.m;
    if (mode === 'film'){ $('small', title).textContent = s.m && s.m.date ? fmtDate(s.m.date) : (s.sub || ''); $('b', title).textContent = s.title || (s.m ? s.m.title : ''); title.classList.add('show'); setTimeout(() => title.classList.remove('show'), 2300); }
    cv.style.opacity = .2; requestAnimationFrame(() => { cv.style.opacity = 1; });
  }
  function loop(now){
    if (!playing) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now; if (!paused) t += dt;
    const s = slides[idx];
    if (base && base.complete) SC.frame(g, cv.width, cv.height, s.spec, base, t, s.dur);
    if (bars[idx]) bars[idx].style.width = Math.min(100, t / s.dur * 100) + '%';
    if (t >= s.dur){ if (idx < slides.length - 1) load(idx + 1); else { close(); return; } }
    requestAnimationFrame(loop);
  }
  function open(list, opts = {}){
    slides = list; mode = opts.mode || 'story'; seenKey = opts.seen || null;
    vw.classList.toggle('mode-film', mode === 'film'); vw.hidden = false; size();
    barsEl.innerHTML = slides.map(() => '<i><b></b></i>').join(''); bars = $$('b', barsEl);
    load(opts.start || 0); playing = true; paused = false; last = performance.now(); requestAnimationFrame(loop);
    requestAnimationFrame(() => vw.classList.add('in'));
    Overlays.push('viewer', close);
  }
  function close(){
    playing = false; vw.classList.remove('in', 'paused'); Overlays.pop('viewer'); setTimeout(() => { vw.hidden = true; }, 350);
    if (seenKey){ const seen = store.get('seen', []); if (!seen.includes(seenKey)){ seen.push(seenKey); store.set('seen', seen); } const el = $(`.story[data-id="${seenKey}"]`); if (el) el.classList.add('seen'); }
  }
  function nav(d){ if (d > 0){ if (idx < slides.length - 1) load(idx + 1); else close(); } else { if (t > 1.2 || idx === 0) load(idx); else load(idx - 1); } }
  [['#vPrev', -1], ['#vNext', 1]].forEach(([sel, d]) => {
    const z = $(sel);
    z.addEventListener('pointerdown', () => { held = false; hold = setTimeout(() => { held = true; paused = true; vw.classList.add('paused'); }, 240); });
    z.addEventListener('pointerup', () => { clearTimeout(hold); if (held){ paused = false; vw.classList.remove('paused'); } else nav(d); });
    z.addEventListener('pointerleave', () => { clearTimeout(hold); if (held){ paused = false; vw.classList.remove('paused'); held = false; } });
  });
  $('#vClose').addEventListener('click', close);
  $('#vOpen').addEventListener('click', () => { const m = slides[idx].m; close(); if (m) goMemory(m.id); });
  document.addEventListener('keydown', e => {
    if (Overlays.top() !== 'viewer') return;
    if (e.key === 'ArrowRight') nav(1); else if (e.key === 'ArrowLeft') nav(-1); else if (e.key === ' '){ e.preventDefault(); paused = !paused; vw.classList.toggle('paused', paused); }
  });
  addEventListener('resize', () => { if (playing){ size(); load(idx); } });
  const secs = d => { const [a, b] = d.split(':').map(Number); return a * 60 + b; };
  return {
    story(m){ open(m.shots.map(sh => ({spec: sh, m, cap: sh.cap || m.text, dur: 5})), {seen: m.id}); },
    clip(m, c){ open([{spec: {s: c.s, k: c.k}, m, cap: c.cap, dur: Math.min(12, secs(c.d))}]); },
    film(){
      const list = CHRONO.map(m => ({spec: m.shots[0], m, dur: 3.6, cap: ''}));
      list.push({spec: {s: 'stars', k: 6}, dur: 4.5, title: 'Продолжение следует…', sub: `${nf((Date.now() - SINCE) / 864e5)} дней и дальше`, cap: ''});
      open(list, {mode: 'film'});
    }
  };
})();

/* ================= стек оверлеев (Esc закрывает верхний) ================= */
const Overlays = (() => {
  const stack = [];
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length){ e.stopImmediatePropagation(); stack[stack.length - 1].close(); } }, true);
  return {push(name, close){ stack.push({name, close}); }, pop(name){ const i = stack.map(s => s.name).lastIndexOf(name); if (i >= 0) stack.splice(i, 1); }, top(){ return stack.length ? stack[stack.length - 1].name : null; }};
})();

/* ================= вкладки и страницы ================= */
const Tabs = (() => {
  const nav = $('#tabs'), ind = $('#tabInd'); let active = 'map';
  function place(){ const b = $(`.tab[data-tab="${active}"]`, nav); if (!b || nav.hidden) return; ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px'; }
  function go(name){
    if (name === active){ if (name !== 'map') $('#page-' + name + ' .page-scroll').scrollTo({top: 0, behavior: 'smooth'}); return; }
    const prev = active; active = name;
    $$('.tab', nav).forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name)); place();
    Subs.closeAll();
    if (prev !== 'map') Pages.close(prev);
    if (name === 'map'){ document.body.classList.remove('page-open'); MapView.el.inert = false; }
    else { if (Journey.isOpen()) Journey.close(true); document.body.classList.add('page-open'); MapView.el.inert = true; Pages.open(name); }
  }
  nav.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) go(b.dataset.tab); });
  addEventListener('resize', place);
  return {go, place, get active(){ return active; }};
})();
function goMemory(id){
  Subs.closeAll();
  if (Tabs.active !== 'map'){ Tabs.go('map'); setTimeout(() => Journey.show(id), REDUCED ? 0 : 420); }
  else Journey.show(id);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !Overlays.top() && !Journey.isOpen() && Tabs.active !== 'map') Tabs.go('map'); });
document.addEventListener('click', e => {
  const s = e.target.closest('[data-sub]'); if (s){ Subs.open(s.dataset.sub, s.dataset.preset); return; }
  if (e.target.closest('[data-subback]')) Subs.back();
});

const Pages = (() => {
  const built = {};
  function open(name){
    const el = $('#page-' + name); if (!built[name]){ BUILD[name](); built[name] = true; }
    el.hidden = false; $('.page-scroll', el).scrollTop = 0;
    $$('.rise', el).forEach(x => { x.style.animation = 'none'; void x.offsetWidth; x.style.animation = ''; });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  }
  function close(name){ const el = $('#page-' + name); el.classList.remove('in'); setTimeout(() => { if (Tabs.active !== name) el.hidden = true; }, 520); }
  return {open, close};
})();

const Subs = (() => {
  const built = {}; let cur = null, chat = null;
  function open(name, preset){
    if (name === 'letter'){ Letter.show(false); return; }
    if (Tabs.active !== 'us'){ if (Journey.isOpen()) Journey.close(true); Tabs.go('us'); }
    if (cur) hide(cur);
    const el = $('#sub-' + name); if (!el) return;
    if (!built[name]){ SUB[name](); built[name] = true; }
    cur = name; el.hidden = false; $('.page-scroll', el).scrollTop = 0;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); if (ON[name]) ON[name](preset); }));
    Overlays.push('sub', back);
  }
  function hide(name){ const el = $('#sub-' + name); el.classList.remove('in'); if (name === 'chat' && chat) chat.cancel = true; setTimeout(() => { if (cur !== name) el.hidden = true; }, 500); }
  function back(){ if (!cur) return; const n = cur; cur = null; hide(n); Overlays.pop('sub'); }
  function closeAll(){ if (cur){ const n = cur; cur = null; hide(n); Overlays.pop('sub'); } }
  const ON = {
    chat(){ if (chat) chat.cancel = true; chat = runChat($('#subChatList'), $('#subChatStatus'), D.chat, '10 февраля 2023'); },
    sky(preset){ const p = SKY_PRESETS.find(x => x.id === preset) || SKY_PRESETS[0]; applyPreset(p); },
    worlds(){ paintSwirl(); }
  };
  $('#subChatReplay').addEventListener('click', () => ON.chat());
  return {open, back, closeAll};
})();

/* ---------- Даты ---------- */
function upcoming(){
  const t = today0(), out = [];
  const nextMD = md => { const [m, d] = md.split('-').map(Number); let x = new Date(t.getFullYear(), m - 1, d); if (x < t) x = new Date(t.getFullYear() + 1, m - 1, d); return x; };
  const an = nextMD('02-14'), n = an.getFullYear() - 2023; out.push({date: an, title: `${n}-я годовщина`, sub: 'вместе с 14.02.2023', go: 'date1'});
  const wd = nextMD(D.couple.wedding.slice(5)), wy = wd.getFullYear() - 2025; out.push({date: wd, title: `${wy} ${plural(wy, 'год', 'года', 'лет')} браку`, sub: 'свадьба 13.09.2025', go: 'wedding'});
  D.couple.birthdays.forEach(b => out.push({date: nextMD(b.md), title: `День рождения ${b.who}`, sub: 'подарок уже придуман?', go: null}));
  const days = Math.floor((Date.now() - SINCE) / 864e5), ms = [Math.ceil((days + 1) / 100) * 100, 1500, 2000].filter(v => v > days)[0];
  out.push({date: new Date(t.getTime() + (ms - days) * 864e5), title: `${nf(ms)} дней вместе`, sub: 'круглая дата', go: 'date1'});
  out.push({date: new Date(CAPSULE), title: 'Откроется капсула', sub: 'письмо из дня свадьбы', go: 'capsule'});
  return out.map(o => ({...o, left: dayDiff(t, new Date(o.date.getFullYear(), o.date.getMonth(), o.date.getDate()))})).sort((a, b) => a.left - b.left);
}
function onThisDay(){
  const t = today0(), md = (t.getMonth() + 1) * 100 + t.getDate();
  let best = null;
  for (const m of CHRONO){
    const [y, mo, d] = ymd(m.date); if (y >= t.getFullYear()) continue;
    const s = mo * 100 + d, e = m.end ? ymd(m.end)[1] * 100 + ymd(m.end)[2] : s;
    if (md >= s && md <= e) best = {m, y, day: dayDiff(new Date(t.getFullYear(), mo - 1, d), t) + 1, len: m.end ? dayDiff(dObj(m.date), dObj(m.end)) + 1 : 1};
  }
  if (best) return best;
  let near = null;
  for (const m of CHRONO){ const [y, mo, d] = ymd(m.date); if (y >= t.getFullYear()) continue; const dd = Math.abs(dayDiff(new Date(t.getFullYear(), mo - 1, d), t)); if (dd <= 12 && (!near || dd < near.dd)) near = {m, y, dd}; }
  return near;
}
const BUILD = {
  dates(){
    const o = onThisDay(), otd = $('#otd');
    if (o){
      const yrs = today0().getFullYear() - o.y, m = o.m;
      const sub = o.len > 1 ? `День ${o.day} из ${o.len}. ${m.text.split('. ')[0]}.` : o.dd ? `Почти в эти дни, ${o.dd} ${plural(o.dd, 'день', 'дня', 'дней')} разницы. ${m.text.split('. ')[0]}.` : m.text.split('. ')[0] + '.';
      otd.innerHTML = `<button class="otd rise" style="--i:2" data-go="${m.id}"><img src="${SC.url(m.shots[0], 1200, 600)}" alt=""><span class="otd-in"><span class="eyebrow">${o.dd ? 'Около этого дня' : 'В этот день'} · ${yrs} ${plural(yrs, 'год', 'года', 'лет')} назад</span><h3>${esc(m.title)}</h3><p>${esc(sub)}</p><span class="btn-primary"><span class="spark">✦</span> Вспомнить</span></span></button>`;
    }
    $('#soon').innerHTML = upcoming().map(u => `<button class="soon-card" ${u.go ? `data-go="${u.go}"` : ''}><small>через</small><b>${nf(u.left)}</b><small>${plural(u.left, 'день', 'дня', 'дней')} · ${pad(u.date.getDate())}.${pad(u.date.getMonth() + 1)}.${u.date.getFullYear()}</small><span>${esc(u.title)}</span><i>${esc(u.sub)}</i></button>`).join('');
    const F = [['all', 'Все'], ['key', 'Главные'], ['first', 'Первые разы'], ['trip', 'Поездки'], ['home', 'Дом'], ['fest', 'Праздники']];
    const chips = $('#dateChips'); chips.innerHTML = F.map(([k, l], i) => `<button class="chip" data-f="${k}" aria-pressed="${!i}">${l}</button>`).join('');
    chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === b)); timeline(b.dataset.f); });
    timeline('all');
    $('#page-dates').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goMemory(b.dataset.go); });
  },
  photos(){
    $('#cmpA').src = SC.url({s: 'cafe', k: 1}, 1200, 675); $('#cmpB').src = SC.url({s: 'cafe', k: 4}, 1200, 675);
    const r = $('#cmpRange'), box = $('#compare'); r.addEventListener('input', () => box.style.setProperty('--p', r.value + '%'));
    const years = [...new Set(CHRONO.map(m => m.date.slice(0, 4)))];
    const F = [['all', 'Все'], ...years.map(y => [y, y]), ['roads', 'Дороги'], ['home', 'Дом'], ['fest', 'Праздники']];
    const chips = $('#photoChips'); chips.innerHTML = F.map(([k, l], i) => `<button class="chip" data-f="${k}" aria-pressed="${!i}">${l}</button>`).join('');
    chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === b)); grid(b.dataset.f); });
    grid('all');
  },
  videos(){
    const keys = CHRONO.filter(m => m.key).slice(0, 5);
    $('#filmBtn').innerHTML = keys.map(m => `<img src="${SC.url(m.shots[0], 1200, 675)}" alt="">`).join('') +
      `<span class="film-shade"></span><span class="film-play"></span><span class="film-meta"><i>${CHRONO.length} сцен · ${Math.floor(CHRONO.length * 3.6 / 60)}:${pad(CHRONO.length * 3.6 % 60)}</i><b>Наш фильм</b></span>`;
    $('#filmBtn').addEventListener('click', () => Viewer.film());
    const seen = store.get('seen', []);
    $('#stories').innerHTML = CHRONO.filter(m => m.story).map(m => `<button class="story${seen.includes(m.id) ? ' seen' : ''}" data-id="${m.id}"><span class="story-ring"><img src="${SC.url(m.shots[0], 200, 200)}" alt=""></span><span>${esc(m.title)}</span></button>`).join('');
    $('#stories').addEventListener('click', e => { const b = e.target.closest('.story'); if (b) Viewer.story(M.get(b.dataset.id)); });
    const clips = CHRONO.flatMap(m => (m.clips || []).map((c, i) => ({m, c, i})));
    $('#clips').innerHTML = clips.map((x, k) => `<button class="clip rise" style="--i:${Math.min(k, 10)}" data-k="${k}"><img src="${SC.url({s: x.c.s, k: x.c.k}, 360, 640)}" alt=""><span class="clip-d">${esc(x.c.d)}</span><span class="clip-play"></span><span class="clip-cap">${esc(x.c.cap)}</span></button>`).join('');
    $('#clips').addEventListener('click', e => { const b = e.target.closest('.clip'); if (!b) return; const x = clips[+b.dataset.k]; Viewer.clip(x.m, x.c); });
  },
  us(){
    const trips = MEM.filter(m => m.kind === 'trip').length;
    $('#usStats').innerHTML = `<div><b data-days>0</b><span>дней вместе</span></div><div><b>${CHRONO.length}</b><span>воспоминаний на карте</span></div><div><b>${trips}</b><span>поездок и 4 страны</span></div><div><b>1</b><span>рыжий кот</span></div>`;
    const done = D.dreams.filter(d => d.done).length, total = D.dreams.length, C = 2 * Math.PI * 36;
    $('#bento').innerHTML = [
      `<button class="b-card b-wide rise" style="--i:3" data-sub="letter"><div class="b-vis"><div class="env mini b-env" aria-hidden="true"><div class="env-back"></div><div class="env-paper"></div><div class="env-front"></div><div class="env-flap"></div><div class="seal"><span>Т·А</span></div></div></div><div><h3>Письмо</h3><p>прочитать ещё раз</p></div></button>`,
      `<button class="b-card rise" style="--i:4" data-sub="chat"><div class="b-vis b-bubbles"><i></i><i></i><i></i><i></i></div><div><h3>Переписка в цифрах</h3><p>48 213 сообщений</p></div></button>`,
      `<button class="b-card rise" style="--i:5" data-sub="dreams"><div class="b-vis"><svg class="ring" viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / total)}"/><text x="42" y="49" text-anchor="middle">${done}/${total}</text></svg></div><div><h3>Мечты</h3><p>${done} из ${total} сбылось</p></div></button>`,
      `<button class="b-card b-wide rise" style="--i:6" data-sub="sky"><div class="b-vis"><canvas class="b-sky" id="bSky" aria-hidden="true"></canvas></div><div><h3>Небо наших ночей</h3><p>4 ночи · настоящие звёзды</p></div></button>`,
      `<button class="b-card rise" style="--i:7" data-sub="when"><div class="b-vis b-mini-envs"><i></i><i></i><i></i><i></i></div><div><h3>Открой, когда…</h3><p>4 письма на особый случай</p></div></button>`,
      `<button class="b-card rise" style="--i:8" data-sub="capsule"><div class="b-vis"><span class="b-count" data-capdays>0</span></div><div><h3>Капсула времени</h3><p>дней до 14.02.2027</p></div></button>`,
      `<button class="b-card b-wide rise" style="--i:9" data-sub="worlds"><div class="b-vis"><span class="b-stack"><img src="${SC.url({s: 'blossom', k: 1}, 240, 320)}" alt=""><img src="${SC.url({s: 'aurora', k: 1}, 240, 320)}" alt=""><img src="${SC.url({s: 'tropics', k: 1}, 240, 320)}" alt=""></span></div><div><h3>Наши миры</h3><p>AI-кадры по вашим фото</p></div></button>`,
      `<button class="b-card b-wide rise" style="--i:10" data-sound id="songCard"><div class="b-vis"><span class="vinyl"></span></div><div><h3>Наша песня</h3><p id="songState">${Sound.on ? 'играет · нажми, чтобы выключить' : 'нажми, чтобы включить'}</p></div></button>`
    ].join('');
    requestAnimationFrame(() => { const c = $('#bSky'); const st = stateFromAt('2023-02-14T21:40', 'almaty'); drawSky(c, st, 170, true); });
    Timer.tick();
  }
};
function timeline(f){
  const list = MEM.filter(m => m.date && !m.dream).sort(byDate).filter(m => f === 'all' ? true : f === 'key' ? m.key : m.kind === f);
  let year = '', html = '', k = 0;
  list.forEach(m => {
    const y = m.date.slice(0, 4); if (y !== year){ year = y; html += `<li class="t-year rise" style="--i:${Math.min(k++, 14)}">${y}</li>`; }
    const [, mo, d] = ymd(m.date);
    html += `<li class="t-row${m.key ? ' key' : ''} rise" style="--i:${Math.min(k++, 14)}" data-go="${m.id}" tabindex="0" role="button" aria-label="${esc(m.title)}, ${esc(fmtDate(m.date))}">
      <span class="t-date"><b>${d}</b><span>${MSHORT[mo - 1]}</span></span><span class="t-dot"></span>
      <span class="t-main">${m.label ? `<span class="t-label">${esc(m.label)}</span>` : ''}<span class="t-title">${esc(m.title)}</span><span class="t-ago">${esc(ago(m.date))}</span></span>
      <img class="t-thumb" src="${thumb(m)}" alt=""></li>`;
  });
  const tl = $('#timeline'); tl.innerHTML = html || '<li class="note">Здесь пока пусто</li>';
  $$('.t-row', tl).forEach(r => r.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); goMemory(r.dataset.go); } }));
}
const ASPECTS = [[4, 5], [1, 1], [3, 4], [4, 5], [2, 3], [5, 4]];
let gridJob = 0;
function grid(f){
  const all = CHRONO.flatMap(m => m.shots.map((sh, i) => ({m, sh, i})));
  const items = all.filter(x => f === 'all' ? true : /^\d{4}$/.test(f) ? x.m.date.startsWith(f) : x.m.c === f);
  items.forEach((x, k) => { const [w, h] = ASPECTS[(k + x.i) % ASPECTS.length]; x.w = w; x.h = h; });
  const box = $('#masonry');
  box.innerHTML = items.map((x, k) => `<button class="tile rise" style="--i:${Math.min(k, 12)}" data-k="${k}"><img alt="${esc(x.m.title)}" width="480" height="${Math.round(480 * x.h / x.w)}" style="aspect-ratio:${x.w}/${x.h}"><span class="tile-cap"><b>${esc(x.m.title)}</b><i>${dots(x.m.date)}</i></span></button>`).join('');
  const tiles = $$('.tile', box), job = ++gridJob; let k = 0;
  const step = () => {
    if (job !== gridJob) return; const t0 = performance.now();
    while (k < items.length && performance.now() - t0 < 14){ const img = $('img', tiles[k]), x = items[k]; img.onload = () => img.classList.add('ok'); img.src = SC.url(x.sh, 480, Math.round(480 * x.h / x.w)); k++; }
    if (k < items.length) requestAnimationFrame(step);
  };
  step();
  box.onclick = e => { const b = e.target.closest('.tile'); if (b) Lightbox.open(items, +b.dataset.k, b); };
}

/* ---------- подстраницы «Мы» ---------- */
const SKY_PRESETS = [
  {id: 'date1', label: 'Первое свидание', at: '2023-02-14T21:40', city: 'almaty'},
  {id: 'perseids', label: 'Звездопад', at: '2023-08-13T01:10', city: 'bao'},
  {id: 'proposal', label: 'Предложение', at: '2025-02-14T21:40', city: 'almaty'},
  {id: 'wedding', label: 'Свадьба', at: '2025-09-13T20:30', city: 'almaty'}
];
function renderSubSky(){
  let [y, m, d] = ($('#skyDate').value || '2023-02-14').split('-').map(Number), [hh, mi] = ($('#skyTime').value || '21:40').split(':').map(Number);
  if (!y || !m || !d){ y = 2023; m = 2; d = 14; } if (isNaN(hh) || isNaN(mi)){ hh = 21; mi = 40; }
  const st = skyState(y, m, d, hh, mi, $('#skyCity').value), res = drawSky($('#chart'), st, 560);
  fillSkyText($('#skyCap'), $('#skyFacts'), res);
  const dt = Date.UTC(y, m - 1, d), apod = $('#apodLink'); apod.hidden = dt < Date.UTC(1995, 5, 16) || dt > Date.now();
  apod.href = `https://apod.nasa.gov/apod/ap${String(y).slice(2)}${pad(m)}${pad(d)}.html`;
  $('#hubbleLink').textContent = `Что снимал Хаббл ${d} ${MONTHS[m - 1]} ↗`;
}
function applyPreset(p){
  const [ds, ts] = p.at.split('T'); $('#skyDate').value = ds; $('#skyTime').value = ts; $('#skyCity').value = p.city;
  $$('#skyPresets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === p.id));
  renderSubSky();
}
let swirlDone = false;
function paintSwirl(){
  if (swirlDone) return; swirlDone = true;
  const c = $('#swirl'), r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), w = r.width, h = r.height;
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#14285e'; g.fillRect(0, 0, w, h);
  const centers = [[w * .72, h * .18, 1], [w * .3, h * .4, -1], [w * .64, h * .55, 1]];
  const ang = (x, y) => { let ax = 1, ay = .25 * Math.sin(x * .03); for (const [cx, cy, s] of centers){ const dx = x - cx, dy = y - cy, k = s * 2600 / (dx * dx + dy * dy + 500); ax += -dy * k; ay += dx * k; } return Math.atan2(ay, ax); };
  const cols = ['#1f3f8f', '#2c57b0', '#4a7fd0', '#86aee6', '#cfe0f5']; g.lineCap = 'round';
  for (let i = 0; i < 1900; i++){
    let x = Math.random() * w, y = Math.random() * h * .8; const near = Math.hypot(x - w * .72, y - h * .18) < w * .13;
    g.strokeStyle = near ? (Math.random() < .7 ? '#f2c84b' : '#fff1b8') : cols[Math.floor(Math.random() * cols.length)];
    g.globalAlpha = .55 + Math.random() * .4; g.lineWidth = 1.6 + Math.random() * 2.3; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++){ const a = ang(x, y); x += Math.cos(a) * 4; y += Math.sin(a) * 4; g.lineTo(x, y); } g.stroke();
  }
  g.globalAlpha = 1;
  [[.12, .12], [.45, .1], [.9, .4], [.2, .62], [.52, .3]].forEach(([sx, sy]) => { for (let k = 4; k > 0; k--){ g.strokeStyle = k % 2 ? '#f2c84b' : '#fff4c8'; g.lineWidth = 2; g.beginPath(); g.arc(w * sx, h * sy, k * 4.2, 0, TAU); g.stroke(); } });
  g.fillStyle = '#0b1430'; g.beginPath(); g.moveTo(0, h * .82); g.quadraticCurveTo(w * .3, h * .73, w * .56, h * .8); g.quadraticCurveTo(w * .8, h * .86, w, h * .77); g.lineTo(w, h); g.lineTo(0, h); g.fill();
  g.fillStyle = '#081511'; g.beginPath(); g.moveTo(w * .13, h); g.bezierCurveTo(w * .08, h * .7, w * .19, h * .44, w * .21, h * .28); g.bezierCurveTo(w * .25, h * .5, w * .3, h * .76, w * .28, h); g.fill();
}
const SUB = {
  chat(){
    const bars = $('#bars'), tip = $('#barTip'), max = Math.max(...D.hours), fig = $('#hours');
    D.hours.forEach((v, h) => {
      const b = document.createElement('button'); b.className = 'hb' + (v === max ? ' peak' : ''); b.style.setProperty('--h', (v / max * 100).toFixed(1) + '%');
      b.setAttribute('aria-label', `${pad(h)}:00, ${nf(v)} ${plural(v, 'сообщение', 'сообщения', 'сообщений')}`); b.innerHTML = '<span class="bar"></span>';
      const show = () => { const fr = fig.getBoundingClientRect(), br = $('.bar', b).getBoundingClientRect();
        tip.textContent = `${pad(h)}:00–${pad((h + 1) % 24)}:00 · ${nf(v)} ${plural(v, 'сообщение', 'сообщения', 'сообщений')}`; tip.hidden = false;
        const half = tip.offsetWidth / 2 + 2; tip.style.left = Math.min(Math.max(br.left + br.width / 2 - fr.left, half), fr.width - half) + 'px'; tip.style.top = (br.top - fr.top - 8) + 'px'; };
      b.addEventListener('pointerenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
      b.addEventListener('pointerleave', () => { tip.hidden = true; }); b.addEventListener('blur', () => { tip.hidden = true; });
      bars.appendChild(b);
    });
    $('#words').innerHTML = D.words.map(([w, n]) => `<span class="word">${esc(w)}<small>${nf(n)}</small></span>`).join('');
  },
  sky(){
    const sel = $('#skyCity'); Object.entries(D.cities).forEach(([k, c]) => { const o = document.createElement('option'); o.value = k; o.textContent = c.name; sel.appendChild(o); });
    $('#skyPresets').innerHTML = SKY_PRESETS.map(p => `<button data-p="${p.id}" aria-pressed="false">${esc(p.label)}</button>`).join('');
    $('#skyPresets').addEventListener('click', e => { const b = e.target.closest('button'); if (b) applyPreset(SKY_PRESETS.find(p => p.id === b.dataset.p)); });
    ['skyDate', 'skyTime', 'skyCity'].forEach(id => $('#' + id).addEventListener('change', () => { $$('#skyPresets button').forEach(b => b.setAttribute('aria-pressed', 'false')); renderSubSky(); }));
  },
  worlds(){},
  when(){
    const read = store.get('read', []);
    $('#whenGrid').innerHTML = D.whenLetters.map(l => `<button class="when${read.includes(l.id) ? ' read' : ''}" data-w="${l.id}"><span class="env mini" aria-hidden="true"><span class="env-back"></span><span class="env-paper"></span><span class="env-front"></span><span class="env-flap"></span><span class="seal"><span>Т·А</span></span></span><span>${esc(l.when)}</span></button>`).join('');
    $('#whenGrid').addEventListener('click', e => {
      const b = e.target.closest('.when'); if (!b) return; const l = D.whenLetters.find(x => x.id === b.dataset.w), env = $('.env', b);
      env.classList.add('open'); Sound.chime();
      setTimeout(() => {
        $('#noteWhen').textContent = 'Открой, ' + l.when; $('#noteText').textContent = l.text;
        const nm = $('#noteModal'); nm.hidden = false; requestAnimationFrame(() => nm.classList.add('in')); Overlays.push('note', closeNote);
        b.classList.add('read'); const r = store.get('read', []); if (!r.includes(l.id)){ r.push(l.id); store.set('read', r); }
        setTimeout(() => env.classList.remove('open'), 900);
      }, REDUCED ? 0 : 1200);
    });
  },
  dreams(){
    const saved = store.get('dreams', {});
    const list = $('#dreamList');
    list.innerHTML = D.dreams.map((d, i) => {
      const m = d.done ? M.get(d.done) : d.dream ? M.get(d.dream) : null, checked = d.done ? true : !!saved[i];
      const sub = d.done ? `сбылось ${dots(m.date)} · ${m.title}` : d.dream ? 'звезда в созвездии «Будущее»' : 'ещё впереди';
      return `<li><label class="dream"><input type="checkbox" data-i="${i}" ${checked ? 'checked' : ''} ${d.done ? 'disabled' : ''}><span class="box"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.8"/></svg></span><span class="dream-t"><b>${esc(d.t)}</b><small class="${d.done ? '' : 'idea'}">${esc(sub)}</small></span>${m ? `<button class="dream-go" data-go="${m.id}" aria-label="Открыть «${esc(m.title)}» на карте">→</button>` : ''}</label></li>`;
    }).join('');
    const upd = () => { const n = $$('input:checked', list).length, t = D.dreams.length, C = 2 * Math.PI * 52;
      $('#dreamsHead').innerHTML = `<svg class="ring" viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - n / t)}"/><text x="60" y="68" text-anchor="middle" style="font-size:28px">${n}/${t}</text></svg><p class="lede">Сбылось ${n} из ${t}. Галочки на своих мечтах можно ставить самим.</p>`; };
    list.addEventListener('change', e => { const c = e.target.closest('input'); if (!c) return; const s = store.get('dreams', {}); s[c.dataset.i] = c.checked; store.set('dreams', s); upd(); if (c.checked) Sound.chime(); });
    list.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b){ e.preventDefault(); goMemory(b.dataset.go); } });
    upd();
  },
  capsule(){}
};
function closeNote(){ const nm = $('#noteModal'); nm.classList.remove('in'); Overlays.pop('note'); setTimeout(() => { nm.hidden = true; }, 500); }
$('#noteClose').addEventListener('click', closeNote);
const capEnv = $('#capEnv');
const knock = () => { capEnv.classList.remove('shake'); void capEnv.offsetWidth; capEnv.classList.add('shake'); $('#capMsg').textContent = 'Печать не поддаётся. Ещё рано.'; Sound.chime(); };
capEnv.addEventListener('click', knock);
capEnv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); knock(); } });

/* ================= конверт и письмо ================= */
const Letter = (() => {
  const intro = $('#intro'), env = $('#env'), letter = $('#letter'), lBody = $('#lBody'), lEnd = $('#lEnd'), btn = $('#toStars');
  let first = true, timer = null;
  $('#lDate').textContent = 'Алматы · ' + new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'}).format(new Date()).replace(/\s*г\.$/, '');
  function build(){
    let t = .15; lBody.innerHTML = '';
    const add = (text, cls) => {
      const p = document.createElement('p'); if (cls) p.className = cls;
      text.split(' ').forEach((w, i) => { if (i) p.appendChild(document.createTextNode(' ')); const s = document.createElement('span'); s.className = 'wd'; s.textContent = w; s.style.setProperty('--t', t.toFixed(2) + 's'); t += .075; p.appendChild(s); });
      t += .45; lBody.appendChild(p);
    };
    D.letter.forEach(x => add(x)); add(D.sign, 'sig'); return t;
  }
  const finish = () => { lBody.classList.add('done'); lEnd.classList.add('show'); clearTimeout(timer); };
  function show(isFirst){
    first = isFirst; letter.hidden = false; btn.textContent = isFirst ? 'Войти в нашу вселенную ✦' : 'Вернуться к звёздам ✦';
    if (isFirst && !REDUCED){ const total = build(); lBody.classList.remove('done'); lEnd.classList.remove('show'); timer = setTimeout(finish, total * 1000 + 300); }
    else { if (!lBody.childElementCount) build(); finish(); }
    $('#paper').scrollTop = 0; requestAnimationFrame(() => requestAnimationFrame(() => letter.classList.add('in')));
    if (!isFirst) Overlays.push('letter', hide);
  }
  function hide(){
    letter.classList.remove('in'); setTimeout(() => { letter.hidden = true; }, 800);
    if (first){ first = false; enterApp(false); } else Overlays.pop('letter');
  }
  $('#paper').addEventListener('click', e => { if (!lEnd.classList.contains('show') && !e.target.closest('button')) finish(); });
  btn.addEventListener('click', hide);
  function openEnvelope(){
    if (env.classList.contains('open')) return;
    env.classList.add('open'); intro.classList.add('opening'); Sound.chime();
    const sr = $('.seal', env).getBoundingClientRect(); Dust.burst(sr.left + sr.width / 2, sr.top + sr.height / 2);
    setTimeout(() => { intro.classList.add('out'); show(true); }, REDUCED ? 0 : 1500);
    setTimeout(() => { intro.hidden = true; }, REDUCED ? 0 : 2400);
  }
  env.addEventListener('click', openEnvelope);
  env.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openEnvelope(); } });
  return {show};
})();

/* ================= вход во вселенную ================= */
function enterApp(instant){
  $('#intro').hidden = true; Sky.cvs.classList.remove('veil');
  MapView.show(); $('#hud').hidden = false; $('#mapUi').hidden = false; $('#tabs').hidden = false;
  MapView.layout(); Object.assign(cam, MapView.fitCam()); MapView.render(); Tabs.place();
  if (instant || REDUCED){ MapView.el.classList.add('in'); Dust.graph(true); return; }
  document.body.classList.add('pre');
  Dust.monogram('Т·А');
  setTimeout(() => { Dust.graph(false); MapView.el.classList.add('in'); }, 3300);
  setTimeout(() => { document.body.classList.remove('pre'); Tabs.place(); }, 3900);
}

/* ================= цикл и запуск ================= */
function frame(t){
  if (MapView.active){ MapView.step(t); MapView.render(); }
  Sky.frame(t); Dust.frame(t);
  requestAnimationFrame(frame);
}
let wasPortrait = null, rsz = 0;
function resize(){
  Sky.build(); Dust.resize();
  if (MapView.active){
    const pr = innerWidth < innerHeight * .95;
    MapView.layout(); if (pr !== wasPortrait && !Journey.isOpen()) Object.assign(cam, MapView.fitCam());
    wasPortrait = pr; Journey.reflow();
  }
  Tabs.place();
}
addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(resize, 150); });

MapView.build();
Sky.build(); Dust.resize(); Dust.populate(); wasPortrait = innerWidth < innerHeight * .95;
Timer.tick(); setInterval(Timer.tick, 1000);
if (document.fonts) document.fonts.ready.then(() => { Tabs.place(); MapView.remeasure(); });
requestAnimationFrame(frame);

const hash = location.hash.slice(1);
if (hash){
  enterApp(true);
  if (['dates', 'photos', 'videos', 'us'].includes(hash)) Tabs.go(hash);
  else if (hash.startsWith('m-') && M.has(hash.slice(2))) setTimeout(() => Journey.show(hash.slice(2)), 60);
  else if (hash === 'film') Viewer.film();
  else if (hash.startsWith('sub-')) Subs.open(hash.slice(4));
}
})();
