// 룸메랑 같이 사는 방 — 기록으로 방 상태를 계산하고 SVG로 그린다
const ITEMS = [
  { id: 'plant', emoji: '🪴', name: '화분', pts: 5 },
  { id: 'rug', emoji: '🧶', name: '러그', pts: 15 },
  { id: 'frame', emoji: '🖼️', name: '액자', pts: 30 },
  { id: 'lamp', emoji: '💡', name: '무드등', pts: 50 },
  { id: 'lights', emoji: '✨', name: '가랜드 조명', pts: 75 },
  { id: 'guitar', emoji: '🎸', name: '기타', pts: 100 },
  { id: 'cat', emoji: '🐱', name: '고양이', pts: 140 },
  { id: 'trophy', emoji: '🏆', name: '트로피', pts: 200 },
];
const MESS_KIND = { dish: 'dish', tidy: 'tidy', laundry: 'laundry', trash: 'trash', wake: 'wake', workout: 'workout', sleep: 'sleep' };
const MESS_LABEL = {
  dish: '싱크대에 쌓인 그릇', tidy: '바닥에 널린 물건', laundry: '넘치는 빨래 바구니', trash: '쌓여가는 쓰레기',
  wake: '닫힌 커튼이랑 엉망인 이불', workout: '먼지 쌓인 아령', sleep: '침대 옆 에너지 음료 캔', misc: '쌓인 박스',
};

const LINES = {
  done: {
    dish: ['오 싱크대 반짝반짝 ✨', '이제 컵 꺼내 쓸 수 있겠다', '설거지한 사람 멋있다 진짜'],
    tidy: ['바닥이 보인다!', '방이 넓어진 기분이야', '발 디딜 데가 생겼네 ㅋㅋ'],
    laundry: ['뽀송한 냄새 벌써 난다', '빨래 바구니가 숨 쉰대'],
    trash: ['냄새가 사라졌어… 고마워', '현관이 깔끔해졌다'],
    wake: ['일어났구나! 커튼 연다~ ☀️', '굿모닝. 오늘도 해보자'],
    workout: ['오 아령 먼지 털렸다 💪', '땀 흘리는 거 보기 좋다'],
    sleep: ['잘 자. 내일 보자 🌙', '일찍 자는 거 칭찬해'],
    misc: ['좋아 잘했어 👏', '오늘 좀 하는데?', '이 기세 그대로 가자', '역시 할 땐 하네'],
  },
  pass: ['알았어… 근데 내일은 꼭이다', '핑계 접수 완료 📝', '흠. 방은 계속 더러워진다?'],
  snooze: ['10분이다? 진짜 10분이다?', '타이머 맞췄다 ⏰', '10분 뒤에 또 온다'],
  tap: {
    happy: ['요즘 너랑 사는 거 좋다 ㅎㅎ', '방 깨끗하니까 기분 최고', '오늘 저녁 뭐 먹을래?', '너 요즘 좀 멋있다?'],
    chill: ['나쁘지 않아. 근데 더 잘할 수 있잖아', '오늘 할 거 남았나 볼까', '심심하다~ 뭐 하나 같이 치울래?'],
    meh: ['...', '방 꼴이 이게 뭐야', '나 요즘 좀 피곤해. 너 때문에', '냄새 나는 거 나만 느껴?'],
    angry: ['말 걸지 마. 설거지나 해', '나 진짜 짐 쌀까 고민 중이야', '이 방에서 숨 쉬기 힘들다'],
  },
  hold: ['꾹 눌러야 돼. 양심 걸고 했을 때만', '진짜 했어? 그럼 꾹 눌러', '살짝 누르는 건 안 쳐줘'],
  poke: ['아 그만 찔러!!', '간지러워 ㅋㅋㅋ 그만', '나 장난감 아니거든?', '한 번만 더 찌르면 설거지 시킨다', '찌를 시간에 할 일 하나 하자'],
  pet: {
    good: ['헤헤 좋아 💕', '쓰담쓰담 더 해줘', '너 손 따뜻하다', '이런 룸메 어디 없지~'],
    bad: ['쓰다듬는다고 방이 치워지진 않아', '…흥. 조금은 풀렸어', '이걸로 넘어갈 생각이지?'],
  },
  grab: ['으앗 어디 데려가!', '내려줘~ 무서워', '오 하늘 난다 ✈️', '살살 들어!'],
  move: ['오 배치 바꾸니까 새집 같다', '거기 괜찮네', '인테리어 감각 있는데?', '이사 온 기분이야'],
};
// 물건 근처에 룸메를 내려놓았을 때 / 물건을 눌렀을 때
const DROP = {
  bed: (r) => r.mess.wake || r.mess.sleep ? '이불 좀 개고 눕자…' : '여기서 낮잠 자도 돼? 😴',
  sink: (r) => r.mess.dish ? '으 설거지 냄새! 저리 데려가' : '배고프다. 뭐 해 먹을까?',
  basket: (r) => r.mess.laundry ? '빨래 냄새 난다고!!' : '뽀송한 냄새 좋다',
  dumbbell: (r) => r.mess.workout ? '먼지 쌓였어. 같이 운동할래?' : '나도 근육 생길까 💪',
  plant: () => '초록초록 기분 좋다 🌱',
  lamp: () => '여기 아늑하다…',
  rug: () => '러그 폭신폭신 ☁️',
  guitar: () => '한 곡 쳐줘 🎸',
};
const OBJ_LINES = {
  bed: ['침대 보니까 졸리다', '이불 개는 게 하루의 시작이래'],
  sink: ['컵 하나 쓰면 바로 씻기. 약속', '싱크대는 방의 얼굴이야'],
  window: ['환기 좀 하자~', '오늘 날씨 어때?', '창밖 구경 중'],
  frame: ['우리 여행 가고 싶다', '저 그림 내가 고른 거야'],
  clock: () => `지금 ${new Date().getHours()}시 ${new Date().getMinutes()}분. 할 거 있지?`,
  shelf: ['트로피 반짝반짝 ✨', '이거 우리 노력의 결과야'],
  lamp: ['무드등 켜면 분위기 좋아', '밤엔 이거 하나면 충분'],
  plant: ['물 줬어?', '얘도 너 보고 자라'],
  guitar: ['♪ 띵가띵가', '기타 칠 줄 알아?'],
  rug: ['맨발로 밟으면 최고'],
  basket: ['빨래는 쌓이기 전에!', '바구니 반 차면 돌리기'],
  dumbbell: ['딱 10개만 들어볼까?', '근손실 온다~'],
  cat: ['냐아옹 🐾', '골골골…', '(꼬리 살랑)'],
  cathide: ['(고양이가 침대 밑에 숨었다. 방이 너무 지저분해서…)'],
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const kindOf = (t) => MESS_KIND[t.id] || 'misc';

// ---------- 상태 계산 ----------
function computeRoom(st) {
  const days = [{ date: st.now.date, log: st.log, nag: st.nag, today: true }, ...(st.hist || [])];
  const since = st.since || st.now.date;
  const cur = nowMin();
  const dowOf = (d) => new Date(d + 'T00:00:00').getDay();
  const mess = {};
  let score = 0;
  for (const t of st.tasks) {
    let lvl = 0;
    for (const d of days) {
      if (d.date < since) break;
      if (!t.days.includes(dowOf(d.date))) continue;
      if (d.today && toMin(t.time) > cur && d.log[t.id]?.st !== 'done') continue;
      if (d.log[t.id]?.st === 'done') break;
      if (++lvl >= 3) break;
    }
    const k = kindOf(t);
    mess[k] = Math.max(mess[k] || 0, lvl);
  }
  days.forEach((d, i) => {
    if (d.date < since) return;
    const w = i <= 1 ? 1 : i <= 3 ? 0.6 : 0.3;
    for (const t of st.tasks) {
      if (!t.days.includes(dowOf(d.date))) continue;
      const e = d.log[t.id];
      if (e?.st === 'done') score += 3 * w;
      else if (e?.st === 'pass') score -= 1.5 * w;
      else if (!d.today) score -= 3 * w;
      else if (toMin(t.time) <= cur) score -= (d.nag[t.id]?.n || 0) >= MAX_NAG ? 3 : 1;
    }
  });
  const mood = Math.max(0, Math.min(100, Math.round(55 + score)));
  const total = Object.values(mess).reduce((a, b) => a + b, 0);
  const pts = st.pts || 0;
  return {
    mood, mess, total, pts, kinds: new Set(st.tasks.map(kindOf)),
    face: mood >= 80 ? 'happy' : mood >= 60 ? 'chill' : mood >= 40 ? 'meh' : 'angry',
    moodName: mood >= 80 ? '신남' : mood >= 60 ? '좋음' : mood >= 40 ? '시큰둥' : mood >= 20 ? '삐짐' : '가출',
    gone: mood < 20,
    items: new Set(ITEMS.filter((it) => pts >= it.pts).map((it) => it.id)),
    next: ITEMS.find((it) => pts < it.pts),
  };
}

// ---------- 미니룸 (싸이월드 미니홈피식 쿼터뷰) ----------
// 바닥 마름모: 뒤 (180,110) · 왼 (20,190) · 오 (340,190) · 앞 (180,270), 벽 높이 95
// 바닥 좌표 (p, q): p = 오른쪽 벽을 따라 앞으로, q = 왼쪽 벽을 따라 앞으로 (0~160)
const iso = (p, q) => [180 + p - q, 110 + (p + q) / 2];
const toPQ = (x, y) => [(x - 180) / 2 + (y - 110), (y - 110) - (x - 180) / 2];
const WALL_H = 95;
const OL = 'stroke="#6b4a36" stroke-width="1" stroke-linejoin="round"';
// 가구 앞모서리 기준 상대좌표: u = 오른쪽 벽 방향으로 뒤로, v = 왼쪽 벽 방향으로 뒤로, z = 높이
const P = (u, v, z = 0, o = [0, 0]) => [o[0] - u + v, o[1] - (u + v) / 2 - z];
const pt = (u, v, z, o) => P(u, v, z, o).join(' ');
function box(a, b, h, [top, left, right], o = [0, 0]) {
  const q = (u, v, z) => pt(u, v, z, o);
  return `<path d="M${q(0, 0, 0)}L${q(a, 0, 0)}L${q(a, 0, h)}L${q(0, 0, h)}Z" fill="${left}" ${OL}/>`
    + `<path d="M${q(0, 0, 0)}L${q(0, b, 0)}L${q(0, b, h)}L${q(0, 0, h)}Z" fill="${right}" ${OL}/>`
    + `<path d="M${q(0, 0, h)}L${q(a, 0, h)}L${q(a, b, h)}L${q(0, b, h)}Z" fill="${top}" ${OL}/>`;
}
const WOOD = ['#dca673', '#bb865b', '#a47049'];

// 옮길 수 있는 물건들. zone: floor(앞모서리 기준, fp=[u폭, v폭]) / wallL·wallR(왼쪽 아래 기준, sz=[가로, 세로])
const OBJS = [
  { id: 'window', zone: 'wallL', at: [104, 114], sz: [64, 50] },
  { id: 'frame', zone: 'wallR', at: [196, 72], sz: [36, 30], need: 'frame' },
  { id: 'clock', zone: 'wallR', at: [244, 90], sz: [24, 24] },
  { id: 'shelf', zone: 'wallR', at: [284, 114], sz: [44, 34], need: 'trophy' },
  { id: 'rug', zone: 'floor', at: iso(135, 135), fp: [70, 70], need: 'rug', flat: true },
  { id: 'bed', zone: 'floor', at: iso(150, 44), fp: [72, 42] },
  { id: 'sink', zone: 'floor', at: iso(30, 140), fp: [28, 64] },
  { id: 'lamp', zone: 'floor', at: iso(74, 20), fp: [18, 18], need: 'lamp' },
  { id: 'plant', zone: 'floor', at: iso(20, 22), fp: [14, 14], need: 'plant' },
  { id: 'guitar', zone: 'floor', at: iso(14, 64), fp: [10, 16], need: 'guitar' },
  { id: 'basket', zone: 'floor', at: iso(150, 100), fp: [24, 24], kind: 'laundry' },
  { id: 'dumbbell', zone: 'floor', at: iso(156, 140), fp: [12, 28], kind: 'workout' },
  { id: 'roomie', zone: 'floor', at: iso(112, 112), fp: [16, 16] },
];
const LAYOUT_KEY = 'jansori-room-layout';
function loadLayout() { try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch { return {}; } }
function saveLayout(id, pos) {
  const l = loadLayout();
  l[id] = pos.map((n) => Math.round(n * 10) / 10);
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch {}
}
function resetLayout() { try { localStorage.removeItem(LAYOUT_KEY); } catch {} }
const objDef = (id) => OBJS.find((o) => o.id === id);
function clampPos(o, [x, y]) {
  if (o.zone === 'floor') {
    let [p, q] = toPQ(x, y);
    p = Math.min(159, Math.max(o.fp[0] + 1, p));
    q = Math.min(159, Math.max(o.fp[1] + 1, q));
    return iso(p, q);
  }
  const left = o.zone === 'wallL';
  const u = Math.min(158 - o.sz[0], Math.max(2, left ? x - 20 : x - 180));
  const base = left ? 190 - u / 2 : 110 + u / 2;
  const hgt = Math.min(WALL_H - 2 - o.sz[1], Math.max(4, base - y));
  return [left ? 20 + u : 180 + u, base - hgt];
}
function objPos(id) {
  const o = objDef(id);
  const saved = loadLayout()[id];
  return clampPos(o, Array.isArray(saved) && saved.every(Number.isFinite) ? saved : o.at);
}
function objTransform(id, [x, y]) {
  const z = objDef(id).zone;
  return z === 'wallL' ? `matrix(1 -.5 0 1 ${x} ${y})` : z === 'wallR' ? `matrix(1 .5 0 1 ${x} ${y})` : `translate(${x} ${y})`;
}
// 바닥 물건의 화면상 중심 (깊이 정렬·근처 판정용)
function objCenter(id) {
  const o = objDef(id), [x, y] = objPos(id);
  return o.zone === 'floor' ? [x + (o.fp[1] - o.fp[0]) / 2, y - (o.fp[0] + o.fp[1]) / 4] : [x + o.sz[0] / 2, y - o.sz[1] / 2];
}
function nearestObj(id, ids) {
  const [x, y] = objCenter(id);
  let best = null, bd = 1e9;
  for (const k of ids) {
    if (k === id || objDef(k).zone !== 'floor') continue;
    const [a, b] = objCenter(k);
    const d = Math.hypot(a - x, (b - y) * 2);
    if (d < bd) { bd = d; best = k; }
  }
  return bd < 70 ? best : null;
}

function roomSVG(r) {
  const h = new Date().getHours();
  const night = h >= 20 || h < 6, eve = h >= 17 && h < 20;
  const L = (k) => r.mess[k] || 0;
  const has = (id) => r.items.has(id);
  const kinds = kindsUsed(r);
  const fly = (x, y) => `<g class="fly" style="--d:${(x % 7) / 10}s"><ellipse cx="${x - 3}" cy="${y - 3}" rx="3" ry="2" fill="#fff" opacity=".8"/><ellipse cx="${x + 3}" cy="${y - 3}" rx="3" ry="2" fill="#fff" opacity=".8"/><circle cx="${x}" cy="${y}" r="2.6" fill="#2b211b"/></g>`;
  const stink = (x, y) => `<path class="stink" d="M${x} ${y}q-5-7 0-14t0-14M${x + 9} ${y - 2}q-5-7 0-14t0-14" stroke="#9bb35a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;

  // ---- 배경 · 벽 · 바닥 ----
  let s = `<rect width="360" height="290" fill="${night ? '#3c4a7a' : '#dceefa'}"/><rect width="360" height="290" fill="url(#dots)"/>`;
  s += '<path d="M20 190L180 270V279L20 199Z" fill="#b98b62" stroke="#6b4a36"/><path d="M180 270L340 190V199L180 279Z" fill="#a27650" stroke="#6b4a36"/>';
  s += '<path d="M180 110L340 190L180 270L20 190Z" fill="#e6bf92"/>';
  for (let i = 1; i < 8; i++) { const t = i / 8; s += `<path d="M${180 - 160 * t} ${110 + 80 * t}L${340 - 160 * t} ${190 + 80 * t}" stroke="#d3a777" stroke-width="1.6"/>`; }
  for (let i = 0; i < 6; i++) { const [x, y] = iso(20 + i * 27, 12 + ((i * 53) % 140)); s += `<path d="M${x} ${y}l-8 4" stroke="#d3a777" stroke-width="1.6"/>`; }
  s += '<path d="M20 190L180 110V15L20 95Z" fill="#fde7d2"/><path d="M180 110L340 190V95L180 15Z" fill="#f6d6b6"/>';
  for (let x = 36; x < 180; x += 16) s += `<path d="M${x} ${95 - (x - 20) / 2}V${190 - (x - 20) / 2}" stroke="#f9d8b8" stroke-width="5" opacity=".55"/>`;
  for (let x = 196; x < 340; x += 16) s += `<path d="M${x} ${15 + (x - 180) / 2}V${110 + (x - 180) / 2}" stroke="#efc9a3" stroke-width="5" opacity=".45"/>`;
  s += '<path d="M20 190L180 110V102L20 182Z" fill="#e7bf98"/><path d="M180 110L340 190V182L180 102Z" fill="#d9ad84"/>';
  s += '<path d="M20 95L180 15L340 95V91L180 11L20 91Z" fill="#fff8ef" stroke="#6b4a36" stroke-width="1" stroke-linejoin="round"/>';
  s += '<path d="M20 91V199M340 91V199M180 15V110" stroke="#6b4a36" stroke-width="1" opacity=".8"/><path d="M20 190L180 110L340 190" stroke="#6b4a36" stroke-width="1" fill="none" opacity=".35"/>';

  // 가랜드 조명 (벽 위쪽, 고정)
  if (has('lights')) {
    const cols = ['#ff8e7a', '#ffd166', '#6cc08a', '#7ab8ff'];
    let d = 'M20 102', bulbs = '';
    for (let i = 0; i < 8; i++) {
      const x0 = 20 + i * 40, y0 = i < 4 ? 102 - i * 20 : 22 + (i - 4) * 20, y1 = i < 4 ? y0 - 20 : y0 + 20;
      d += `Q${x0 + 20} ${(y0 + y1) / 2 + 9} ${x0 + 40} ${y1}`;
      bulbs += `<circle cx="${x0 + 20}" cy="${(y0 + y1) / 2 + 8}" r="3.6" fill="${cols[i % 4]}" ${night ? 'class="glow"' : ''}/>`;
    }
    s += `<path d="${d}" stroke="#7a5a44" stroke-width="1.3" fill="none"/>${bulbs}`;
  }

  // ---- 물건 그리기 (각자 로컬 좌표) ----
  const draw = {
    window() {
      const sky = night ? '#2b3a67' : eve ? '#ffb98a' : '#bfe6ff';
      let g = `<rect x="-3" y="-53" width="70" height="56" rx="3" fill="#fffaf4" ${OL}/><rect x="2" y="-48" width="60" height="46" fill="${sky}"/>`;
      g += night ? '<circle cx="48" cy="-36" r="7" fill="#fff6c8"/><circle cx="51" cy="-38" r="6" fill="#2b3a67"/><circle cx="14" cy="-40" r="1.2" fill="#fff"/><circle cx="26" cy="-20" r="1.1" fill="#fff"/><circle cx="50" cy="-12" r="1.2" fill="#fff"/>'
        : `<circle cx="${eve ? 44 : 16}" cy="${eve ? -12 : -38}" r="7" fill="${eve ? '#ff8e5a' : '#ffe08a'}"/><ellipse cx="44" cy="-32" rx="10" ry="4.5" fill="#fff" opacity=".9"/><ellipse cx="37" cy="-30" rx="7" ry="3.6" fill="#fff" opacity=".9"/>`;
      g += '<path d="M32 -48V-2M2 -25H62" stroke="#fffaf4" stroke-width="3.5"/><rect x="-6" y="1" width="76" height="4" rx="1.5" fill="#e8d5c0" stroke="#6b4a36" stroke-width="1"/>';
      if (L('wake') && h < 14) g += `<g data-mess="wake"><path d="M-2 -55h35v58h-35z" fill="#ff9f80" ${OL}/><path d="M31 -55h35v58h-35z" fill="#f78f6e" ${OL}/><path d="M8 -55v58M20 -55v58M42 -55v58M54 -55v58" stroke="#e57c5c" stroke-width="2" opacity=".6"/></g>`;
      else g += `<path d="M-8 -55h14q-5 30 1 58h-15z" fill="#ff9f80" ${OL}/><path d="M72 -55h-14q5 30-1 58h15z" fill="#ff9f80" ${OL}/>`;
      return g + `<rect x="-11" y="-59" width="86" height="4" rx="2" fill="#b9835a" ${OL}/>`;
    },
    frame: () => `<rect x="0" y="-30" width="36" height="30" rx="2" fill="#b9835a" ${OL}/><rect x="4" y="-26" width="28" height="22" fill="#cfeaf7"/><path d="M4 -4l9-10 7 6 4-4 8 8z" fill="#6cc08a"/><circle cx="25" cy="-20" r="3" fill="#ffd166"/>`,
    clock() {
      const d = new Date(), m = d.getMinutes(), hr = (d.getHours() % 12) + m / 60;
      const hand = (deg, len) => { const a = (deg - 90) * Math.PI / 180; return `${12 + Math.cos(a) * len} ${-12 + Math.sin(a) * len}`; };
      return `<circle cx="12" cy="-12" r="12" fill="#fffaf4" ${OL}/><circle cx="12" cy="-12" r="9.5" fill="none" stroke="#ff9f80" stroke-width="1.5"/>`
        + `<path d="M12 -12L${hand(hr * 30, 5.5)}M12 -12L${hand(m * 6, 8)}" stroke="#5a3f2e" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="-12" r="1.3" fill="#e0483c"/>`;
    },
    shelf: () => `<path d="M14 -30h16v8q0 9-8 9t-8-9z" fill="#ffc94a" ${OL}/><path d="M14 -27h-5q0 7 6 7M30 -27h5q0 7-6 7" stroke="#e3a52f" stroke-width="2" fill="none"/><rect x="18" y="-13" width="8" height="5" fill="#e3a52f" ${OL}/><text x="4" y="-12" font-size="10">⭐</text>`
      + `<rect x="0" y="-8" width="44" height="5" rx="1.5" fill="#b9835a" ${OL}/><path d="M6 -3l2 6M38 -3l-2 6" stroke="#8a5e3e" stroke-width="2"/>`,
    rug() {
      const [cx, cy] = P(35, 35);
      return `<ellipse cx="${cx}" cy="${cy}" rx="46" ry="23" fill="#f6a5a0" ${OL}/><ellipse cx="${cx}" cy="${cy}" rx="37" ry="17" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="5 5" opacity=".85"/><ellipse cx="${cx}" cy="${cy}" rx="18" ry="8" fill="#ffc2b8"/>`;
    },
    bed() {
      const messy = L('wake') || (L('sleep') && h >= 6 && h < 14);
      let g = box(6, 42, 38, WOOD, P(66, 0)) + `<path d="M${pt(68, 8, 30)}L${pt(68, 34, 30)}" stroke="#8a5e3e" stroke-width="2"/>`;
      g += box(66, 42, 10, WOOD) + box(64, 40, 7, ['#fffaf4', '#efe2d4', '#e0cfbd'], P(1, 1, 10));
      if (messy) {
        g += `<g data-mess="wake"><path d="M${pt(-2, -1, 17)}Q${pt(18, -4, 30)} ${pt(46, 2, 19)}L${pt(48, 42, 18)}Q${pt(22, 46, 30)} ${pt(-2, 42, 17)}Z" fill="#8fc1e3" ${OL}/>`
          + `<path d="M${pt(10, 6, 21)}Q${pt(20, 16, 26)} ${pt(30, 10, 21)}M${pt(14, 26, 21)}Q${pt(26, 34, 26)} ${pt(36, 26, 20)}" stroke="#6aa3cc" stroke-width="2" fill="none"/>`
          + box(12, 24, 5, ['#fff', '#eee4da', '#e2d6ca'], P(-18, 12)) + '</g>';
      } else {
        g += box(12, 26, 5, ['#fff', '#eee4da', '#e2d6ca'], P(50, 7, 17));
        g += box(42, 41, 3, ['#8fc1e3', '#79acd0', '#6a9cc0'], P(-1, 0, 17)) + `<path d="M${pt(30, 0, 20)}L${pt(30, 41, 20)}" stroke="#fff" stroke-width="2" opacity=".7"/>`;
      }
      if (has('cat')) {
        if (r.total < 5) {
          const [x, y] = P(26, 22, 20);
          g += `<g data-say="cat" class="cat" transform="translate(${x - 268} ${y - 165})"><ellipse cx="268" cy="160" rx="15" ry="8" fill="#f4b183" ${OL}/><circle cx="255" cy="155" r="7.5" fill="#f4b183" ${OL}/><path d="M249 150l1-7 5 4M257 148l4-6 1 7" fill="#f4b183" ${OL}/><path d="M252 156q2 2 3 0M257 156q2 2 3 0" stroke="#5a3f2e" stroke-width="1.3" fill="none"/><path d="M282 162q9 2 5-8" stroke="#f4b183" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M263 154h9M266 158h9" stroke="#e39a68" stroke-width="2"/></g>`;
        } else {
          const [x, y] = P(-2, 30);
          g += `<path data-say="cathide" d="M${x} ${y}q6-12 12-2" stroke="#f4b183" stroke-width="4" fill="none" stroke-linecap="round"/>`;
        }
      }
      if (L('sleep')) {
        g += '<g data-mess="sleep">';
        for (let i = 0; i < L('sleep'); i++) {
          const [x, y] = P(-10 - i * 3, 8 + i * 9);
          g += i === 1 ? `<g transform="rotate(75 ${x} ${y})"><rect x="${x - 3.5}" y="${y - 12}" width="7" height="12" rx="2" fill="#7ab8ff" ${OL}/></g>`
            : `<rect x="${x - 3.5}" y="${y - 12}" width="7" height="12" rx="2" fill="${i ? '#ffd166' : '#6cc08a'}" ${OL}/><rect x="${x - 3.5}" y="${y - 10}" width="7" height="2.5" fill="#fff" opacity=".7"/>`;
        }
        g += '</g>';
      }
      return g;
    },
    sink() {
      let g = box(28, 64, 34, ['#fffaf4', '#f6ebde', '#ece0d2']) + box(30, 66, 3, ['#c98f62', '#b07a50', '#9c6b45'], P(-1, -1, 34));
      g += `<path d="M${pt(0, 32, 3)}L${pt(0, 32, 31)}" stroke="#d9c6b2" stroke-width="1.5"/><circle cx="${P(0, 28, 20)[0]}" cy="${P(0, 28, 20)[1]}" r="1.6" fill="#a8774f"/><circle cx="${P(0, 36, 20)[0]}" cy="${P(0, 36, 20)[1]}" r="1.6" fill="#a8774f"/>`;
      g += `<path d="M${pt(6, 14, 37)}L${pt(22, 14, 37)}L${pt(22, 40, 37)}L${pt(6, 40, 37)}Z" fill="#9aa5ad" ${OL}/><path d="M${pt(9, 17, 37)}L${pt(19, 17, 37)}L${pt(19, 37, 37)}L${pt(9, 37, 37)}Z" fill="#7d8790"/>`;
      g += `<path d="M${pt(26, 27, 37)}L${pt(26, 27, 48)}Q${pt(23, 27, 52)} ${pt(17, 27, 46)}" stroke="#8b969e" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      g += `<rect x="${P(6, 52, 37)[0] - 4}" y="${P(6, 52, 37)[1] - 9}" width="8" height="9" rx="1.5" fill="#ffd166" ${OL}/>`;
      if (L('dish')) {
        const n = [0, 2, 5, 8][L('dish')];
        const [cx, cy] = P(14, 27, 37);
        g += '<g data-mess="dish">';
        for (let i = 0; i < n; i++) g += `<ellipse cx="${cx + (i % 2 ? 1.5 : -1.5)}" cy="${cy - 2 - i * 3.4}" rx="10" ry="3.6" fill="${i % 3 === 2 ? '#e8f1f7' : '#fff'}" stroke="#a89888" stroke-width="1"/>`;
        if (L('dish') >= 2) { const [x, y] = P(4, 46, 37); g += `<path d="M${x - 5} ${y - 12}h10l-1.5 12h-7z" fill="#ffd9c9" ${OL}/><path d="M${x - 4} ${y - 9}q4 2.5 8 0" stroke="#b07a52" stroke-width="1.8" fill="none"/>`; }
        if (L('dish') >= 3) g += fly(cx - 8, cy - 30) + fly(cx + 12, cy - 36);
        g += '</g>';
      }
      return g;
    },
    lamp() {
      const [x, y] = P(9, 9, 22);
      let g = night ? `<circle cx="${x}" cy="${y - 20}" r="36" fill="url(#glow)" pointer-events="none"/>` : '';
      g += box(18, 18, 22, WOOD) + `<path d="M${pt(0, 2, 12)}L${pt(0, 16, 12)}" stroke="#8a5e3e" stroke-width="1.5"/>`;
      return g + `<rect x="${x - 1.5}" y="${y - 16}" width="3" height="16" fill="#7a5a44"/><path d="M${x - 10} ${y - 14}h20l-5-14h-10z" fill="#ffd9a0" ${OL}/>`;
    },
    plant() {
      const [x, y] = P(7, 7);
      const wilt = r.mood < 40;
      let g = `<path d="M${x - 8} ${y - 14}h16l-3 14h-10z" fill="#d9774f" ${OL}/><rect x="${x - 10}" y="${y - 17}" width="20" height="4" rx="2" fill="#c96a44" ${OL}/>`;
      g += wilt ? `<path d="M${x} ${y - 17}q-8-6-12 4M${x} ${y - 17}q6-10 13-2M${x} ${y - 17}q0-9-2-13" stroke="#a7a35a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
        : `<path d="M${x} ${y - 17}q-12-10-8-24q10 8 8 24zM${x} ${y - 17}q8-18 18-16q-4 14-18 16zM${x} ${y - 17}q-2-18 4-26q6 12-4 26z" fill="#6cc08a" ${OL}/>`;
      return g;
    },
    guitar() {
      const [x, y] = P(5, 8);
      return `<g transform="rotate(14 ${x} ${y})"><rect x="${x - 2.5}" y="${y - 62}" width="5" height="36" fill="#7a5a44" ${OL}/><rect x="${x - 5}" y="${y - 70}" width="10" height="9" rx="2" fill="#5a3f2e"/>`
        + `<ellipse cx="${x}" cy="${y - 24}" rx="11" ry="9" fill="#e3954f" ${OL}/><ellipse cx="${x}" cy="${y - 11}" rx="14" ry="11" fill="#e3954f" ${OL}/><circle cx="${x}" cy="${y - 18}" r="3.5" fill="#5a3f2e"/></g>`;
    },
    basket() {
      const [x, y] = P(12, 12), l = L('laundry');
      let g = '<g data-mess="laundry">';
      if (l >= 1) g += `<path d="M${x - 12} ${y - 24}q8-12 16-3q8-9 14 2z" fill="#ffd166" ${OL}/>`;
      if (l >= 2) g += `<path d="M${x - 15} ${y - 22}q4-18 15-12q9-12 19 0q-9 6-34 12z" fill="#9ad0f5" ${OL}/><path d="M${x + 3} ${y - 34}q5-9 12-2" stroke="#ff8e7a" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      if (l >= 3) g += `<path d="M${x + 14} ${y + 2}q8-7 18 2l-3 6h-14z" fill="#c3a6e0" ${OL}/><path d="M${x - 30} ${y + 4}q3-7 12-3l-2 6h-10z" fill="#ffd166" ${OL}/>` + stink(x - 2, y - 38);
      return g + `<path d="M${x - 17} ${y - 24}h34l-4 26h-26z" fill="#e8c9a0" ${OL}/><path d="M${x - 15} ${y - 16}h30M${x - 14} ${y - 8}h28" stroke="#c9a578" stroke-width="2"/></g>`;
    },
    dumbbell() {
      const [x1, y1] = P(6, 4, 5), [x2, y2] = P(6, 24, 5);
      let g = `<g data-mess="workout"><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#7d8790" stroke-width="3.5" stroke-linecap="round"/>`;
      g += `<ellipse cx="${x1}" cy="${y1}" rx="4.5" ry="7" fill="#5a636b" ${OL}/><ellipse cx="${x2}" cy="${y2}" rx="4.5" ry="7" fill="#5a636b" ${OL}/>`;
      if (L('workout')) g += `<path d="M${x1 - 4} ${y1 - 10}l6 4M${x2 + 2} ${y2 - 12}l-3 5M${(x1 + x2) / 2} ${(y1 + y2) / 2 - 8}v4" stroke="#fff" stroke-width="1.2"/><ellipse cx="${(x1 + x2) / 2}" cy="${(y1 + y2) / 2 + 2}" rx="14" ry="3" fill="#cdbfb2" opacity=".7"/>`;
      return g + '</g>';
    },
    roomie() {
      if (r.gone) return '<g data-roomie="1"><g transform="rotate(-8)"><rect x="-17" y="-26" width="34" height="24" rx="2" fill="#fffaf4" stroke="#b8a898"/><path d="M-12 -19h22M-12 -13h18M-12 -8h14" stroke="#b8a898" stroke-width="1.8"/></g><path d="M8 -36q6-6 12 0" stroke="#c9b9a8" stroke-width="2" fill="none" stroke-dasharray="3 3"/></g>';
      return `<g data-roomie="1"><g class="rm"><g transform="translate(-30 -61) scale(.6)"><g class="${r.face === 'angry' ? 'wiggle' : 'bob'}">${mascotInner(r.face)}</g></g></g></g>`;
    },
  };
  const show = (o) => (!o.need || has(o.need)) && (!o.kind || kinds.has(o.kind));

  // 벽 물건 먼저, 바닥은 러그 → 나머지 깊이(화면 y) 순
  const vis = OBJS.filter(show);
  const floor = vis.filter((o) => o.zone === 'floor').sort((a, b) => objCenter(a.id)[1] - objCenter(b.id)[1]);
  const put = (o) => `<g data-obj="${o.id}" transform="${objTransform(o.id, objPos(o.id))}">${draw[o.id]()}</g>`;
  s += vis.filter((o) => o.zone !== 'floor').map(put).join('');
  const rugs = floor.filter((o) => o.flat).map(put).join('');
  const stand = floor.filter((o) => !o.flat);

  // 치우기 전엔 못 옮기는 어지러움 (쓰레기 · 바닥 물건)
  let fixed = '';
  if (L('trash')) {
    fixed += '<g data-mess="trash">';
    const bags = [[96, 222, '#3d4a54'], [118, 228, '#55636e'], [84, 234, '#4a5762']].slice(0, L('trash'));
    for (const [x, y, c] of bags) fixed += `<path d="M${x - 13} ${y + 12}q-4-20 13-22q17 2 13 22z" fill="${c}" ${OL}/><path d="M${x - 4} ${y - 9}l4 -6 4 6" stroke="${c}" stroke-width="3" fill="none"/>`;
    if (L('trash') >= 2) fixed += stink(100, 196);
    if (L('trash') >= 3) fixed += fly(128, 196);
    fixed += '</g>';
  }
  if (L('tidy') || L('misc')) {
    const l = Math.max(L('tidy'), L('misc'));
    fixed += `<g data-mess="${L('tidy') ? 'tidy' : 'misc'}">`;
    fixed += `<path d="M148 252q2-8 10-6l2 4q-6 2-6 8z" fill="#ff8e7a" ${OL}/><path d="M206 254l16-6 4 7-16 5z" fill="#7ab8ff" ${OL}/>`;
    if (l >= 2) fixed += `<rect x="232" y="214" width="20" height="6" rx="1" fill="#6cc08a" transform="rotate(-10 242 217)" ${OL}/><rect x="234" y="208" width="18" height="6" rx="1" fill="#ffd166" transform="rotate(6 243 211)" ${OL}/><path d="M118 244q8-6 18 0l3 10q-11 6-22 0z" fill="#c3a6e0" ${OL}/>`;
    if (l >= 3) fixed += `<rect x="168" y="244" width="26" height="6" rx="1" fill="#e0b080" ${OL}/><circle cx="180" cy="247" r="1.5" fill="#e0483c"/><path d="M250 236q4-8 12-4" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    fixed += '</g>';
  }
  s += rugs + fixed + stand.map(put).join('');

  if (night) s += `<rect width="360" height="290" fill="#141a44" opacity="${has('lamp') ? 0.2 : 0.3}" pointer-events="none"/>`;
  return `<svg viewBox="0 0 360 290" class="room" role="img" aria-label="룸메랑 같이 사는 미니룸">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="#fff" opacity=".6"/><circle cx="10" cy="10" r="1" fill="#fff" opacity=".4"/></pattern></defs>${s}</svg>`;
}
function kindsUsed(r) { return r.kinds || new Set(); }
