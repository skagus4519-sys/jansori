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

// ---------- 그림 ----------
function roomSVG(r) {
  const h = new Date().getHours();
  const night = h >= 20 || h < 6, eve = h >= 17 && h < 20;
  const L = (k) => r.mess[k] || 0;
  const has = (id) => r.items.has(id);
  const fly = (x, y) => `<g class="fly" style="--d:${(x % 7) / 10}s"><ellipse cx="${x - 3}" cy="${y - 3}" rx="3" ry="2" fill="#fff" opacity=".8"/><ellipse cx="${x + 3}" cy="${y - 3}" rx="3" ry="2" fill="#fff" opacity=".8"/><circle cx="${x}" cy="${y}" r="2.6" fill="#2b211b"/></g>`;
  const stink = (x, y) => `<path class="stink" d="M${x} ${y}q-5-7 0-14t0-14M${x + 9} ${y - 2}q-5-7 0-14t0-14" stroke="#9bb35a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
  let s = '';

  // 벽·바닥
  s += '<rect width="360" height="190" fill="#fbe6cf"/><rect y="174" width="360" height="16" fill="#f1cfab"/>';
  s += '<rect y="190" width="360" height="90" fill="#dcae80"/>';
  for (const y of [210, 234, 260]) s += `<path d="M0 ${y}H360" stroke="#c9996b" stroke-width="2"/>`;
  s += '<path d="M60 190v20M200 210v24M120 234v26M300 234v26M40 260v20M250 190v20" stroke="#c9996b" stroke-width="2"/>';

  // 가랜드 조명
  if (has('lights')) {
    s += '<path d="M0 8q45 22 90 0t90 0 90 0 90 0" stroke="#7a5a44" stroke-width="1.5" fill="none"/>';
    ['#ff8e7a', '#ffd166', '#6cc08a', '#7ab8ff', '#ff8e7a', '#ffd166', '#6cc08a', '#7ab8ff'].forEach((c, i) => {
      const x = 22 + i * 45, y = 8 + (i % 2 ? 0 : 11);
      s += `<circle cx="${x}" cy="${y + 4}" r="4" fill="${c}" ${night ? `class="glow"` : ''}/>`;
    });
  }

  // 창문
  const sky = night ? '#2b3a67' : eve ? '#ffb98a' : '#bfe6ff';
  s += `<rect x="131" y="22" width="98" height="88" rx="6" fill="#fffaf4"/><rect x="137" y="28" width="86" height="76" fill="${sky}"/>`;
  s += night ? '<circle cx="203" cy="48" r="9" fill="#fff6c8"/><circle cx="207" cy="45" r="8" fill="#2b3a67"/><circle cx="152" cy="40" r="1.4" fill="#fff"/><circle cx="170" cy="58" r="1.2" fill="#fff"/><circle cx="160" cy="84" r="1.4" fill="#fff"/><circle cx="210" cy="86" r="1.1" fill="#fff"/>'
    : `<circle cx="${eve ? 200 : 158}" cy="${eve ? 88 : 46}" r="9" fill="${eve ? '#ff8e5a' : '#ffe08a'}"/><ellipse cx="196" cy="56" rx="14" ry="6" fill="#fff" opacity=".9"/><ellipse cx="186" cy="58" rx="9" ry="5" fill="#fff" opacity=".9"/>`;
  s += '<path d="M180 28V104M137 66H223" stroke="#fffaf4" stroke-width="4"/>';
  if (L('wake') && h < 14) s += '<g data-mess="wake"><path d="M133 22h48v90h-48z" fill="#ff9f80"/><path d="M179 22h48v90h-48z" fill="#f78f6e"/><path d="M146 22v90M160 22v90M192 22v90M208 22v90" stroke="#e57c5c" stroke-width="2" opacity=".6"/></g>';
  else s += '<path d="M122 20h20q-6 46 2 92h-22z" fill="#ff9f80"/><path d="M238 20h-20q6 46-2 92h22z" fill="#ff9f80"/>';
  s += '<rect x="120" y="16" width="120" height="6" rx="3" fill="#b9835a"/>';

  // 액자 · 트로피 선반
  if (has('frame')) s += '<g transform="rotate(-3 55 60)"><rect x="30" y="34" width="50" height="40" rx="3" fill="#b9835a"/><rect x="35" y="39" width="40" height="30" fill="#cfeaf7"/><path d="M35 69l13-14 9 9 6-6 12 11z" fill="#6cc08a"/><circle cx="66" cy="47" r="4" fill="#ffd166"/></g>';
  if (has('trophy')) s += '<rect x="262" y="70" width="64" height="5" rx="2" fill="#b9835a"/><path d="M286 46h16v10q0 10-8 10t-8-10z" fill="#ffc94a"/><path d="M286 50h-6q0 8 7 8M302 50h6q0 8-7 8" stroke="#ffc94a" stroke-width="2.5" fill="none"/><rect x="290" y="64" width="8" height="6" fill="#e3a52f"/>';

  // 주방 (왼쪽)
  s += '<rect x="0" y="120" width="104" height="70" fill="#fff6ec"/><path d="M0 155h104M52 122v68" stroke="#ead7c3" stroke-width="2"/><circle cx="44" cy="138" r="2" fill="#c9a98c"/><circle cx="60" cy="138" r="2" fill="#c9a98c"/>';
  s += '<rect x="-2" y="112" width="108" height="10" rx="2" fill="#c98f62"/><rect x="18" y="113" width="34" height="5" rx="2" fill="#a8774f"/><path d="M28 113v-12h12v4" stroke="#9aa5ad" stroke-width="3" fill="none" stroke-linecap="round"/>';
  if (L('dish')) {
    const n = [0, 2, 5, 8][L('dish')];
    let d = '<g data-mess="dish">';
    for (let i = 0; i < n; i++) d += `<ellipse cx="${80 + (i % 2 ? 2 : -2)}" cy="${109 - i * 4.2}" rx="16" ry="3.6" fill="${i % 3 === 2 ? '#e8f1f7' : '#fff'}" stroke="#c9b9a8" stroke-width="1.2"/>`;
    if (L('dish') >= 2) d += '<path d="M56 97h12l-2 14h-8z" fill="#ffd9c9" stroke="#c9b9a8" stroke-width="1.2"/><path d="M57 101q5 3 10 0" stroke="#b07a52" stroke-width="2" fill="none"/>';
    if (L('dish') >= 3) d += fly(64, 74) + fly(92, 62) + '<path d="M70 104q2-3 4 0" stroke="#9bb35a" stroke-width="2" fill="none"/>';
    s += d + '</g>';
  }
  if (has('plant')) {
    const wilt = r.mood < 40;
    s += `<path d="M6 96h20l-3 16h-14z" fill="#d9774f"/><rect x="4" y="93" width="24" height="5" rx="2" fill="#c96a44"/>`;
    s += wilt ? '<path d="M16 93q-8-6-12 4M16 93q6-10 14-2M16 93q0-10-2-14" stroke="#a7a35a" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
      : '<path d="M16 93q-12-10-8-24q10 8 8 24zM16 93q8-18 18-16q-4 14-18 16zM16 93q-2-18 4-26q6 12-4 26z" fill="#6cc08a"/>';
  }

  // 기타
  if (has('guitar')) s += '<g transform="rotate(-12 120 160)"><rect x="117" y="112" width="6" height="44" fill="#7a5a44"/><rect x="114" y="106" width="12" height="9" rx="2" fill="#5a3f2e"/><ellipse cx="120" cy="164" rx="13" ry="11" fill="#e3954f"/><ellipse cx="120" cy="182" rx="16" ry="14" fill="#e3954f"/><circle cx="120" cy="170" r="4" fill="#5a3f2e"/></g>';

  // 침대 (오른쪽)
  s += '<rect x="338" y="116" width="22" height="98" rx="6" fill="#b9835a"/><rect x="236" y="196" width="8" height="22" fill="#9c6b45"/><rect x="232" y="168" width="120" height="34" rx="8" fill="#fffaf4"/>';
  if (L('wake') || (L('sleep') && h >= 6 && h < 14)) {
    s += '<g data-mess="wake"><path d="M232 186q6-30 30-24t26 4 30-10 22 8v20h-108z" fill="#8fc1e3"/><path d="M252 176q10 6 22-2M290 172q8 8 20 0" stroke="#6aa3cc" stroke-width="2.5" fill="none"/><rect x="300" y="146" width="28" height="16" rx="7" fill="#fff" stroke="#e6d6c6" transform="rotate(-18 314 154)"/></g>';
  } else {
    s += '<rect x="316" y="154" width="26" height="16" rx="7" fill="#fff" stroke="#e6d6c6"/><rect x="232" y="164" width="88" height="38" rx="10" fill="#8fc1e3"/><path d="M240 176h72" stroke="#6aa3cc" stroke-width="2.5"/>';
  }
  if (has('cat')) {
    if (r.total < 5) s += '<g class="cat"><ellipse cx="268" cy="160" rx="17" ry="9" fill="#f4b183"/><circle cx="254" cy="155" r="8" fill="#f4b183"/><path d="M248 150l1-8 5 5M256 148l4-7 2 7" fill="#f4b183"/><path d="M251 156q2 2 4 0M257 156q2 2 4 0" stroke="#5a3f2e" stroke-width="1.4" fill="none"/><path d="M284 162q10 2 6-8" stroke="#f4b183" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M262 154h10M266 158h10" stroke="#e39a68" stroke-width="2"/></g>';
    else s += '<path d="M330 214q4-10 10-2" fill="#f4b183"/><text x="300" y="232" font-size="9" fill="#8a7b70">(고양이 숨음)</text>';
  }
  if (L('sleep')) s += `<g data-mess="sleep">${[0, 1, 2].slice(0, L('sleep')).map((i) => `<g transform="rotate(${i ? 70 : 0} ${226 + i * 9} 240)"><rect x="${222 + i * 9}" y="230" width="8" height="14" rx="2" fill="${i % 2 ? '#7ab8ff' : '#6cc08a'}"/><rect x="${222 + i * 9}" y="232" width="8" height="3" fill="#fff" opacity=".7"/></g>`).join('')}</g>`;

  // 무드등 (협탁)
  if (has('lamp')) {
    if (night) s += '<circle cx="216" cy="150" r="34" fill="url(#glow)"/>';
    s += '<rect x="204" y="176" width="26" height="40" rx="3" fill="#c98f62"/><rect x="206" y="190" width="22" height="2" fill="#a8774f"/><rect x="215" y="158" width="4" height="18" fill="#7a5a44"/><path d="M206 160h22l-5-16h-12z" fill="#ffd9a0"/>';
  }

  // 러그
  if (has('rug')) s += '<ellipse cx="170" cy="248" rx="74" ry="17" fill="#f6a5a0"/><ellipse cx="170" cy="248" rx="60" ry="12" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 6" opacity=".8"/>';

  // 빨래 바구니
  if (kindsUsed(r).has('laundry')) {
    const l = L('laundry');
    s += `<g data-mess="laundry">`;
    if (l >= 1) s += '<path d="M244 226q8-14 18-4q8-10 16 2z" fill="#ffd166"/>';
    if (l >= 2) s += '<path d="M240 228q4-20 16-14q10-14 22 0q-10 6-38 14z" fill="#9ad0f5"/><path d="M262 214q6-10 14-2" stroke="#ff8e7a" stroke-width="6" fill="none" stroke-linecap="round"/>';
    if (l >= 3) s += '<path d="M282 262q10-8 22 2l-4 8h-16z" fill="#c3a6e0"/><path d="M226 266q4-8 14-4l-2 7h-12z" fill="#ffd166"/>' + stink(270, 210);
    s += '<path d="M240 228h44l-5 34h-34z" fill="#e8c9a0"/><path d="M243 238h38M245 248h34M247 256h30" stroke="#c9a578" stroke-width="2"/></g>';
  }

  // 쓰레기
  if (L('trash')) {
    s += '<g data-mess="trash">';
    const bags = [[30, 252, '#3d4a54'], [58, 258, '#55636e'], [16, 266, '#4a5762']].slice(0, L('trash'));
    for (const [x, y, c] of bags) s += `<path d="M${x - 14} ${y + 14}q-4-22 14-24q18 2 14 24z" fill="${c}"/><path d="M${x - 4} ${y - 10}l4 -6 4 6" stroke="${c}" stroke-width="3" fill="none"/>`;
    if (L('trash') >= 2) s += stink(36, 226);
    if (L('trash') >= 3) s += fly(70, 222);
    s += '</g>';
  }

  // 바닥 어지러움
  if (L('tidy') || L('misc')) {
    const l = Math.max(L('tidy'), L('misc'));
    s += `<g data-mess="${L('tidy') ? 'tidy' : 'misc'}">`;
    s += '<path d="M110 262q2-8 10-6l2 4q-6 2-6 8z" fill="#ff8e7a"/><path d="M136 270l18-6 4 8-18 5z" fill="#7ab8ff"/>';
    if (l >= 2) s += '<rect x="196" y="262" width="22" height="7" rx="1" fill="#6cc08a" transform="rotate(-10 207 265)"/><rect x="198" y="256" width="20" height="7" rx="1" fill="#ffd166" transform="rotate(6 208 259)"/><path d="M86 236q8-6 18 0l4 12q-12 6-24 0z" fill="#c3a6e0"/>';
    if (l >= 3) s += '<rect x="148" y="214" width="28" height="6" rx="1" fill="#e0b080"/><rect x="148" y="214" width="28" height="3" fill="#d29a62"/><circle cx="160" cy="217" r="1.6" fill="#e0483c"/><path d="M226 276q4-8 12-4" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>';
    s += '</g>';
  }

  // 아령
  if (kindsUsed(r).has('workout')) {
    s += '<g data-mess="workout"><rect x="296" y="264" width="30" height="5" rx="2" fill="#7d8790"/><rect x="290" y="257" width="9" height="19" rx="3" fill="#5a636b"/><rect x="323" y="257" width="9" height="19" rx="3" fill="#5a636b"/>';
    if (L('workout')) s += '<path d="M286 254l14 8M286 254l4 16M286 254l18 0M292 258q4 2 6 8" stroke="#fff" stroke-width="1" opacity=".9" fill="none"/><ellipse cx="311" cy="258" rx="14" ry="2" fill="#cdbfb2" opacity=".7"/>';
    s += '</g>';
  }

  // 룸메
  if (r.gone) {
    s += '<g data-roomie="1"><rect x="150" y="226" width="40" height="30" rx="2" fill="#fffaf4" transform="rotate(-6 170 240)" stroke="#e6d6c6"/><path d="M156 234h26M156 240h22M156 246h18" stroke="#b8a898" stroke-width="2" transform="rotate(-6 170 240)"/><path d="M178 214q6-6 12 0" stroke="#c9b9a8" stroke-width="2" fill="none" stroke-dasharray="3 3"/></g>';
  } else {
    s += `<g data-roomie="1" transform="translate(132 168) scale(.78)"><g class="${r.face === 'angry' ? 'wiggle' : 'bob'}">${mascotInner(r.face)}</g></g>`;
  }

  // 밤 조명
  if (night) s += `<rect width="360" height="280" fill="#141a44" opacity="${has('lamp') ? 0.22 : 0.32}" pointer-events="none"/>`;

  return `<svg viewBox="0 0 360 280" class="room" role="img" aria-label="룸메랑 같이 사는 방">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>${s}</svg>`;
}
function kindsUsed(r) { return r.kinds || new Set(); }
