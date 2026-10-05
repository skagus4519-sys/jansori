// 잔소리 룸메 — 프론트 (바닐라 JS, 빌드 없음)
const API = window.JANSORI_API;
const VAPID = window.JANSORI_VAPID;
const MAX_NAG = 4;
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_TASKS = [
  { id: 'wake', emoji: '☀️', name: '기상', tiny: '일어나서 물 한 컵 마시기', time: '08:30', days: ALL },
  { id: 'laundry', emoji: '🧺', name: '빨래', tiny: '빨래 바구니 세탁기에 넣고 버튼만 누르기', time: '10:30', days: [3, 0] },
  { id: 'workout', emoji: '💪', name: '운동', tiny: '스쿼트 10개만 하기', time: '11:00', days: [1, 2, 3, 4, 5] },
  { id: 'trash', emoji: '🗑️', name: '분리수거', tiny: '재활용 봉투 현관 앞에 내놓기', time: '20:00', days: [0] },
  { id: 'dish', emoji: '🍽️', name: '설거지', tiny: '싱크대 그릇 3개만 씻기', time: '21:30', days: ALL },
  { id: 'tidy', emoji: '🧹', name: '방 정리', tiny: '바닥에 있는 물건 5개만 제자리에', time: '22:00', days: ALL },
  { id: 'sleep', emoji: '🛏️', name: '취침 준비', tiny: '폰 충전기에 꽂고 침대에 눕기', time: '23:30', days: ALL },
];

const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('jansori_' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('jansori_' + k, JSON.stringify(v)); } catch {} },
};
const params = new URLSearchParams(location.search);
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;

let acct = store.get('acct');
let state = null;
let report = null;
let tab = params.get('tab') || 'today';
let focusTask = params.get('task');
let passOpen = null;
let editTasks = null;
let say = null;
let holdT = null;

// ---------- 유틸 ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const hm = (t) => new Date(t).toTimeString().slice(0, 5);
const b64uBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}
async function call(path, body) {
  const res = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Uid': acct?.uid || '', 'X-Key': acct?.secret || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `서버 오류 ${res.status}`);
  return j;
}

// ---------- 룸메 캐릭터 ----------
function mascotInner(mood = 'chill') {
  const eyes = {
    meh: '<path d="M32 52h12M56 52h12" stroke="#3a2418" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="55.5" r="3" fill="#3a2418"/><circle cx="62" cy="55.5" r="3" fill="#3a2418"/>',
    happy: '<path d="M33 54q5-6 10 0M57 54q5-6 10 0" stroke="#3a2418" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    sleep: '<path d="M33 55h10M57 55h10" stroke="#3a2418" stroke-width="3.2" stroke-linecap="round"/>',
    angry: '<path d="M31 46l11 4M69 46l-11 4" stroke="#3a2418" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="55" r="3.6" fill="#3a2418"/><circle cx="62" cy="55" r="3.6" fill="#3a2418"/>',
  }[mood] || '<circle cx="38" cy="54" r="3.8" fill="#3a2418"/><circle cx="62" cy="54" r="3.8" fill="#3a2418"/>';
  const mouth = {
    happy: '<path d="M43 64q7 8 14 0" stroke="#3a2418" stroke-width="3" fill="#ff8e7a" stroke-linecap="round"/>',
    nag: '<ellipse cx="50" cy="66" rx="4.5" ry="5.5" fill="#3a2418"/>',
    angry: '<path d="M43 68q7-6 14 0" stroke="#3a2418" stroke-width="3" fill="none" stroke-linecap="round"/>',
    meh: '<path d="M44 66h12" stroke="#3a2418" stroke-width="3" stroke-linecap="round"/>',
    sleep: '<path d="M46 66q4 3 8 0" stroke="#3a2418" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  }[mood] || '<path d="M45 65q5 4 10 0" stroke="#3a2418" stroke-width="3" fill="none" stroke-linecap="round"/>';
  const extra = mood === 'angry' ? '<path d="M80 22l4-8M86 28l8-3M76 18l-1-8" stroke="#e0483c" stroke-width="3" stroke-linecap="round"/>'
    : mood === 'sleep' ? '<text x="76" y="26" font-size="14" font-weight="700" fill="#a8988c">z</text><text x="86" y="16" font-size="10" font-weight="700" fill="#a8988c">z</text>'
    : mood === 'happy' ? '<text x="80" y="26" font-size="16">✨</text>' : '';
  return `<path d="M50 22c-2-8 2-14 9-15-1 7-4 12-9 15z" fill="#6cc08a"/><path d="M50 24c-3-6-9-8-14-6 3 5 8 7 14 6z" fill="#4fae74"/>
    <ellipse cx="50" cy="90" rx="30" ry="5" fill="#000" opacity=".07"/>
    <path class="blob-body" d="M50 22c22 0 38 16 38 38 0 18-14 30-38 30S12 78 12 60c0-22 16-38 38-38z"/>
    <path class="blob-shade" d="M20 72c6 10 17 16 30 16 14 0 25-5 31-14-8 6-18 9-31 9-12 0-22-4-30-11z" opacity=".55"/>
    <circle cx="28" cy="63" r="5" fill="#ff8e7a" opacity=".55"/><circle cx="72" cy="63" r="5" fill="#ff8e7a" opacity=".55"/>
    ${eyes}${mouth}${extra}`;
}
const mascot = (mood = 'chill') => `<svg viewBox="0 0 100 100" aria-hidden="true" class="${mood === 'nag' || mood === 'angry' ? 'wiggle' : ''}">${mascotInner(mood)}</svg>`;

// ---------- 오늘 ----------
function statusOf(t) {
  const e = state.log[t.id];
  const g = state.nag[t.id];
  if (e?.st === 'done') return { k: 'done', at: e.at };
  if (e?.st === 'pass') return { k: 'pass', reason: e.reason };
  if (e?.st === 'snooze' && e.until > Date.now()) return { k: 'snooze', until: e.until };
  if (toMin(t.time) > nowMin()) return { k: 'later' };
  if (g && g.n >= MAX_NAG) return { k: 'ignored' };
  return { k: 'due' };
}
const todaysTasks = () => state.tasks.filter((t) => t.days.includes(new Date().getDay())).sort((a, b) => toMin(a.time) - toMin(b.time));

function heroToday(list) {
  const st = list.map((t) => ({ t, s: statusOf(t) }));
  const open = st.filter((x) => x.s.k === 'due' || x.s.k === 'ignored');
  const ignored = st.filter((x) => x.s.k === 'ignored');
  const next = st.find((x) => x.s.k === 'later' || x.s.k === 'snooze');
  const doneN = st.filter((x) => x.s.k === 'done').length;
  if (!list.length) return { mood: 'sleep', msg: '오늘은 할 일이 없네', sub: '설정에서 추가할 수 있어' };
  if (ignored.length) return { mood: 'angry', msg: `${ignored[0].t.name}, 나 계속 무시하는 거야?`, sub: '했으면 했음, 안 할 거면 패스 이유라도 써' };
  if (open.length) return { mood: 'nag', msg: `${open[0].t.tiny}. 딱 이것만 하자`, sub: open.length > 1 ? `밀린 게 ${open.length}개야. 하나씩만` : '2분이면 끝나' };
  if (next) return { mood: 'chill', msg: `다음은 ${next.s.k === 'snooze' ? hm(next.s.until) : next.t.time} ${next.t.name}`, sub: `지금까지 ${doneN}개 했어. 그때 부를게` };
  return { mood: 'happy', msg: doneN === list.length ? '오늘 할 거 다 했네? 기특하다' : '오늘 끝! 푹 쉬어', sub: `${doneN}/${list.length} 완료` };
}

function taskCard(t) {
  const s = statusOf(t);
  const chip = {
    done: `<span class="chip ok">✓ ${hm(s.at)} 완료</span>`,
    pass: '<span class="chip pass">오늘 패스</span>',
    snooze: `<span class="chip wait">${hm(s.until)}에 다시 부름</span>`,
    ignored: '<span class="chip bad">무시 중 😑</span>',
    due: '<span class="chip wait">지금!</span>',
    later: '',
  }[s.k];
  let bottom = '';
  if (s.k === 'done' || s.k === 'pass') {
    bottom = `${s.reason ? `<div class="reason">이유: ${esc(s.reason)}</div>` : ''}<button class="undo" data-act="undo" data-id="${t.id}">되돌리기</button>`;
  } else if (passOpen === t.id) {
    bottom = `<form class="passbox" data-pass="${t.id}"><input name="r" placeholder="왜 안 하는지 솔직하게" maxlength="100" autocomplete="off" enterkeyhint="done"><button>패스</button></form>`;
  } else {
    bottom = `<div class="acts">
      <button class="do" data-hold="${t.id}"><i></i><span>꾹 눌러서 했음</span></button>
      ${s.k === 'later' ? '' : `<button data-act="snooze" data-id="${t.id}">10분 뒤</button>`}
      <button data-act="pass" data-id="${t.id}">패스</button></div>`;
  }
  const cls = s.k === 'due' || s.k === 'ignored' ? 'due' : s.k === 'later' ? 'later' : s.k === 'done' || s.k === 'pass' ? 'closed' : '';
  return `<div class="task ${cls}" id="t-${t.id}">
    <div class="task-top"><div class="task-emoji">${esc(t.emoji)}</div>
    <div class="task-main"><div class="task-name">${esc(t.name)} <span class="task-time">${t.time}</span> ${chip}</div>
    <div class="task-tiny">${esc(t.tiny)}</div></div></div>${bottom}</div>`;
}

function renderToday() {
  const list = todaysTasks();
  const room = computeRoom(state);
  let h = heroToday(list);
  if (room.gone) h = { msg: '룸메가 집을 나갔다…', sub: '쪽지: "친구네 간다. 방 치우면 돌아올게"' };
  else if (room.face === 'angry' && h.mood !== 'happy') h = { msg: h.msg, sub: '방 상태 보면 알지? 나 지금 화났어' };
  if (say && say.until > Date.now()) h = { msg: say.msg, sub: say.sub || '' };
  const dead = state.dead || (typeof Notification !== 'undefined' && Notification.permission !== 'granted');
  const messList = Object.entries(room.mess).filter(([, v]) => v > 0);
  $app.innerHTML = `
    <div class="room-card">${roomSVG(room)}
      <div class="moodbar"><span>룸메 기분 <b>${room.moodName}</b></span><div class="bar"><i style="width:${room.mood}%;background:${room.mood >= 60 ? 'var(--ok)' : room.mood >= 40 ? 'var(--pass)' : 'var(--bad)'}"></i></div><span>${room.mood}</span></div>
    </div>
    <div class="bubble up">${esc(h.msg)}<small>${esc(h.sub)}</small></div>
    <div class="roominfo">${messList.length ? `🧹 어질러진 곳 ${messList.length}군데 (그림을 눌러봐)` : '✨ 방이 깨끗해'} · ${room.next ? `다음 ${room.next.emoji} ${room.next.name}까지 ${room.next.pts - room.pts}개` : '아이템 전부 모음 🏆'}</div>
    ${dead ? '<button class="big-btn" data-act="resub" style="margin:0 0 14px">🔕 알림이 꺼져 있어. 다시 켜기</button>' : ''}
    ${list.map(taskCard).join('') || '<div class="empty">오늘 예정된 일이 없어요</div>'}`;
  const pending = list.filter((t) => ['due', 'ignored'].includes(statusOf(t).k)).length;
  if (navigator.setAppBadge) (pending ? navigator.setAppBadge(pending) : navigator.clearAppBadge()).catch(() => {});
  if (focusTask) {
    const el = document.getElementById('t-' + focusTask);
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); }
    focusTask = null;
  }
  if (passOpen) $app.querySelector('.passbox input')?.focus();
}

async function act(id, a, reason) {
  try {
    const r = await call('/api/act', { task: id, act: a, reason });
    const before = state.pts || 0;
    state.log = r.log;
    state.pts = r.pts;
    passOpen = null;
    report = null;
    const t = state.tasks.find((x) => x.id === id);
    const got = ITEMS.find((it) => before < it.pts && r.pts >= it.pts);
    if (got) { say = { msg: `🎉 새 아이템! ${got.emoji} ${got.name}`, sub: '방에 놔뒀어. 한번 봐봐', until: Date.now() + 8000 }; navigator.vibrate?.([40, 60, 40]); }
    else if (a === 'done') say = { msg: pick(LINES.done[kindOf(t)].concat(LINES.done.misc)), sub: `누적 완료 ${r.pts}개`, until: Date.now() + 6000 };
    else if (a === 'pass') say = { msg: pick(LINES.pass), until: Date.now() + 6000 };
    else if (a === 'snooze') say = { msg: pick(LINES.snooze), until: Date.now() + 6000 };
    else say = null;
    render();
    if (a !== 'undo') scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { toast(e.message); }
}

// ---------- 리포트 ----------
function cellOf(w, t, d) {
  const dow = new Date(d.date + 'T00:00:00').getDay();
  if (!t.days.includes(dow)) return { c: 'off', s: '' };
  const e = d.log[t.id];
  if (e?.st === 'done') return { c: 'done', s: '✓' };
  if (e?.st === 'pass') return { c: 'pass', s: 'P' };
  if (d.date > w.today) return { c: '', s: '' };
  if (d.date < w.today) return d.date < w.since ? { c: 'off', s: '' } : { c: 'bad', s: '✕' };
  return (d.nag[t.id]?.n || 0) >= MAX_NAG ? { c: 'bad', s: '✕' } : { c: '', s: '·' };
}

function renderReport(w, shared) {
  let pass = 0, bad = 0;
  const score = {};
  const reasons = [];
  for (const t of w.tasks) score[t.id] = { t, n: 0, sn: 0, pass: 0, bad: 0 };
  for (const d of w.days) for (const t of w.tasks) {
    const c = cellOf(w, t, d);
    const sc = score[t.id];
    sc.sn += d.log[t.id]?.sn || 0;
    if (c.c === 'pass') { pass++; sc.pass++; if (d.log[t.id].reason) reasons.push({ d: d.date, t, r: d.log[t.id].reason }); }
    if (c.c === 'bad') { bad++; sc.bad++; }
  }
  const worst = Object.values(score).map((x) => ({ ...x, n: x.sn + x.pass * 2 + x.bad * 3 })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
  const mood = w.total === 0 ? 'chill' : w.rate >= 80 ? 'happy' : w.rate >= 50 ? 'chill' : 'angry';
  const msg = w.total === 0 ? '아직 기록이 없어' : w.rate >= 80 ? '이번 주 꽤 괜찮은데?' : w.rate >= 50 ? '반은 했네. 조금만 더' : '...이번 주 반성 좀 하자';
  const md = (s) => `${+s.slice(5, 7)}/${+s.slice(8)}`;
  $app.innerHTML = `
    <div class="hero">${mascot(mood)}<div class="bubble">${shared ? '자취생 주간 리포트' : msg}<small>${md(w.dates[0])} ~ ${md(w.dates[6])}</small></div></div>
    <div class="stats">
      <div class="stat"><b>${w.rate}%</b><span>완료율 (${w.done}/${w.total})</span></div>
      <div class="stat"><b>${w.streak}일</b><span>연속 완벽한 날 🔥</span></div>
      <div class="stat"><b>${pass}</b><span>패스</span></div>
      <div class="stat"><b style="color:var(--bad)">${bad}</b><span>무시</span></div>
    </div>
    <h2>이번 주 기록</h2>
    <div class="grid"><table><colgroup><col style="width:31%">${w.dates.map(() => "<col>").join("")}</colgroup>
      <tr><th></th>${w.dates.map((d) => `<th class="${d === w.today ? 'today' : ''}">${DAYS[new Date(d + 'T00:00:00').getDay()]}</th>`).join('')}</tr>
      ${w.tasks.map((t) => `<tr><td class="label">${esc(t.emoji)} ${esc(t.name)}</td>${w.days.map((d) => { const c = cellOf(w, t, d); return `<td><div class="cell ${c.c}">${c.s}</div></td>`; }).join('')}</tr>`).join('')}
    </table>
    <div class="legend"><span>✓ 했음</span><span>P 패스</span><span>✕ 무시</span></div></div>
    ${worst.length ? `<h2>제일 많이 미룬 일</h2><div class="list">${worst.map((x) => `<div>${esc(x.t.emoji)} <b>${esc(x.t.name)}</b> <small>· 미룸 ${x.sn} · 패스 ${x.pass} · 무시 ${x.bad}</small></div>`).join('')}</div>` : ''}
    ${!shared && state ? `<h2>방 꾸미기 컬렉션 (누적 완료 ${state.pts || 0}개)</h2><div class="items">${ITEMS.map((it) => `<div class="${(state.pts || 0) >= it.pts ? 'on' : ''}"><b>${(state.pts || 0) >= it.pts ? it.emoji : '🔒'}</b>${it.name}<small>${it.pts}개</small></div>`).join('')}</div>` : ''}
    ${!shared && reasons.length ? `<h2>패스할 때 댄 핑계</h2><div class="list">${reasons.map((x) => `<div>${esc(x.r)}<br><small>${md(x.d)} ${esc(x.t.name)}</small></div>`).join('')}</div>` : ''}
    ${shared ? '<p class="help" style="text-align:center;margin-top:24px">잔소리 룸메로 기록된 리포트예요</p>'
      : `<button class="big-btn" data-act="share">👀 감시자에게 리포트 보내기</button><p class="help">친구나 가족한테 링크를 보내면 이 주간 기록을 볼 수 있어요(핑계는 안 보여요). 누가 본다고 생각하면 덜 미루게 돼요.</p>`}`;
}

// ---------- 설정 ----------
function renderSettings() {
  editTasks ??= structuredClone(state.tasks);
  const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  $app.innerHTML = `
    <h2 style="margin-top:8px">알림</h2>
    <div class="list"><div>${state.dead || perm !== 'granted' ? '🔕 꺼져 있음' : '🔔 켜져 있음'}<br><small>무시하면 30분마다 최대 ${MAX_NAG}번 조르고, 밤 12시~아침 7시는 조용히 해요</small></div></div>
    <button class="big-btn ghost" data-act="test">테스트 알림 보내기</button>
    ${state.dead || perm !== 'granted' ? '<button class="big-btn" data-act="resub">알림 다시 켜기</button>' : ''}
    <h2>할 일 (${editTasks.length})</h2>
    <p class="help">"2분 버전"이 알림에 나가요. 거창하게 쓰지 말고 시작만 하면 되는 크기로.</p>
    ${editTasks.map((t, i) => `<div class="edit" data-i="${i}">
      <div class="row"><input type="text" class="emoji" data-f="emoji" value="${esc(t.emoji)}" maxlength="8" aria-label="이모지">
        <input type="text" data-f="name" value="${esc(t.name)}" placeholder="이름" maxlength="20">
        <input type="time" class="time" data-f="time" value="${t.time}"></div>
      <div class="row"><input type="text" data-f="tiny" value="${esc(t.tiny)}" placeholder="2분 버전 (예: 그릇 3개만 씻기)" maxlength="60"></div>
      <div class="days">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<button data-day="${d}" class="${t.days.includes(d) ? 'on' : ''}">${DAYS[d]}</button>`).join('')}<button class="del" data-del="${i}" aria-label="삭제">🗑️</button></div>
    </div>`).join('')}
    <button class="big-btn ghost" data-act="add">+ 할 일 추가</button>
    <button class="big-btn" data-act="save">저장</button>
    <h2>복구 코드</h2>
    <p class="help">앱을 지웠다가 다시 깔면 이 코드로 기록을 되살릴 수 있어요. 메모장에 저장해 두세요.</p>
    <div class="code">${acct.uid}.${acct.secret}</div>
    <button class="big-btn ghost" data-act="copy">복구 코드 복사</button>`;
}

// ---------- 시작 / 설치 ----------
function renderInstall() {
  $app.innerHTML = `<div class="intro">${mascot('nag')}
    <h1>잔소리 룸메</h1><p>아이폰은 홈 화면에 추가해야 알림을 보낼 수 있어</p>
    <ol class="steps">
      <li>아래쪽 <b>공유 버튼</b>(□↑)을 눌러</li>
      <li><b>홈 화면에 추가</b>를 눌러</li>
      <li>홈 화면에 생긴 <b>잔소리룸메</b> 아이콘으로 열어</li>
    </ol>
    <p class="help" style="margin-top:14px">iOS 16.4 이상, Safari에서 열어야 해요</p>
    <button class="big-btn ghost" data-act="restore">복구 코드가 있어요</button></div>`;
}
function renderIntro() {
  $app.innerHTML = `<div class="intro">${mascot('happy')}
    <h1>안녕, 난 너의 잔소리 룸메</h1>
    <p>정해진 시간에 내가 먼저 말 걸게.<br>안 하면 30분마다 계속 조를 거야.</p>
    <div class="preview">${DEFAULT_TASKS.map((t) => `<div>${t.emoji} ${t.name}<small>${t.time}</small></div>`).join('')}</div>
    <p class="help">기본 세트로 시작해. 시간이랑 할 일은 설정에서 바꿀 수 있어.</p>
    <button class="big-btn" data-act="start">알림 허용하고 시작하기</button>
    <button class="big-btn ghost" data-act="restore">복구 코드가 있어요</button></div>`;
}

async function getSub() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('이 브라우저는 알림을 못 받아요');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('알림이 거부됐어. 아이폰 설정 > 알림 > 잔소리룸메에서 켜줘');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(VAPID) }));
  store.set('ep', sub.endpoint);
  return sub.toJSON();
}

// ---------- 라우팅 ----------
function render() {
  if (!acct) { $tabs.hidden = true; return isIOS && !standalone ? renderInstall() : renderIntro(); }
  if (!state) { $app.innerHTML = `<div class="intro">${mascot('chill')}<p>불러오는 중…</p></div>`; return; }
  $tabs.hidden = false;
  for (const b of $tabs.children) b.classList.toggle('on', b.dataset.tab === tab);
  if (tab === 'report') {
    if (report) renderReport(report);
    else { $app.innerHTML = `<div class="intro">${mascot('chill')}<p>리포트 계산 중…</p></div>`; call('/api/report').then((r) => { report = r; if (tab === 'report') render(); }).catch((e) => toast(e.message)); }
  } else if (tab === 'settings') renderSettings();
  else renderToday();
}

async function load() {
  try {
    state = await call('/api/state');
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && sub.endpoint !== store.get('ep')) { await call('/api/sub', { sub: sub.toJSON() }); store.set('ep', sub.endpoint); state.dead = false; }
    }
  } catch (e) {
    if (e.message === 'unauthorized') { acct = null; store.set('acct', null); }
    toast(e.message);
  }
  render();
}

// ---------- 이벤트 ----------
$tabs.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  tab = b.dataset.tab;
  if (tab !== 'settings') editTasks = null;
  history.replaceState(null, '', tab === 'today' ? './' : `./?tab=${tab}`);
  scrollTo(0, 0);
  render();
});

$app.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button[data-hold]');
  if (!b) return;
  b.classList.add('holding');
  holdT = setTimeout(() => { holdT = null; b.classList.remove('holding'); navigator.vibrate?.(30); act(b.dataset.hold, 'done'); }, 900);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  $app.addEventListener(ev, (e) => {
    if (!holdT || (ev === 'pointerleave' && !e.target.closest?.('button[data-hold]'))) return;
    clearTimeout(holdT); holdT = null;
    $app.querySelectorAll('.holding').forEach((x) => x.classList.remove('holding'));
    if (ev === 'pointerup') toast(pick(LINES.hold));
  }, true);
}
$app.addEventListener('contextmenu', (e) => { if (e.target.closest('button[data-hold]')) e.preventDefault(); });

$app.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target.closest('[data-pass]');
  if (!f) return;
  const r = f.r.value.trim();
  if (r.length < 2) return toast('이유는 두 글자 이상 써야 패스 가능');
  act(f.dataset.pass, 'pass', r);
});

$app.addEventListener('input', (e) => {
  const box = e.target.closest('.edit');
  if (box && e.target.dataset.f) editTasks[box.dataset.i][e.target.dataset.f] = e.target.value;
});

$app.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-roomie],[data-mess]');
  if (g && state) {
    const room = computeRoom(state);
    if (g.dataset.roomie) say = room.gone ? { msg: '(쪽지) 친구네 간다. 방 치우면 돌아올게', sub: '할 일을 하면 기분이 올라가요', until: Date.now() + 6000 } : { msg: pick(LINES.tap[room.face]), sub: `기분 ${room.mood}/100`, until: Date.now() + 5000 };
    else {
      const k = g.dataset.mess;
      const t = state.tasks.find((x) => kindOf(x) === k);
      say = { msg: `저 ${MESS_LABEL[k]} 보여?`, sub: t ? `${t.name} 하면 치워져` : '', until: Date.now() + 5000 };
      if (t) focusTask = t.id;
    }
    return render();
  }
  const b = e.target.closest('button');
  if (!b) return;
  const box = b.closest('.edit');
  if (b.dataset.day && box) {
    const t = editTasks[box.dataset.i];
    const d = +b.dataset.day;
    t.days = t.days.includes(d) ? t.days.filter((x) => x !== d) : [...t.days, d];
    b.classList.toggle('on');
    return;
  }
  if (b.dataset.del) { editTasks.splice(+b.dataset.del, 1); return renderSettings(); }
  const a = b.dataset.act;
  const id = b.dataset.id;
  if (a === 'done' || a === 'snooze' || a === 'undo') return act(id, a);
  if (a === 'pass') { passOpen = id; return render(); }

  if (a === 'start') {
    b.disabled = true;
    try {
      const sub = await getSub();
      acct = await call('/api/register', { sub, tasks: DEFAULT_TASKS });
      store.set('acct', acct);
      toast('시작! 이제 도망 못 가');
      await load();
    } catch (err) { toast(err.message); b.disabled = false; }
  }
  if (a === 'resub') {
    try { await call('/api/sub', { sub: await getSub() }); state.dead = false; toast('알림 다시 켰어'); render(); } catch (err) { toast(err.message); }
  }
  if (a === 'test') {
    try { const r = await call('/api/test', {}); toast(r.status < 300 ? '보냈어! 잠깐 기다려봐' : `실패 (${r.status}). 알림 다시 켜기를 눌러봐`); if (r.status === 404 || r.status === 410) { state.dead = true; render(); } } catch (err) { toast(err.message); }
  }
  if (a === 'add') {
    editTasks.push({ id: Math.random().toString(36).slice(2, 8), emoji: '✅', name: '', tiny: '', time: '12:00', days: [...ALL] });
    renderSettings();
    $app.querySelectorAll('.edit [data-f=name]')[editTasks.length - 1]?.focus();
  }
  if (a === 'save') {
    const bad = editTasks.find((t) => !t.name.trim() || !t.time || !t.days.length);
    if (bad) return toast('이름·시간·요일은 꼭 채워줘');
    try {
      const r = await call('/api/tasks', { tasks: editTasks.map((t) => ({ ...t, name: t.name.trim(), tiny: t.tiny.trim() || t.name.trim() })) });
      state.tasks = r.tasks; editTasks = null; report = null;
      toast('저장했어'); renderSettings();
    } catch (err) { toast(err.message); }
  }
  if (a === 'copy') { navigator.clipboard.writeText(`${acct.uid}.${acct.secret}`).then(() => toast('복사했어'), () => toast('길게 눌러서 복사해줘')); }
  if (a === 'share') {
    const url = `${location.origin}${location.pathname}?r=${state.share}`;
    const data = { title: '잔소리 룸메 주간 리포트', text: '내가 이번 주에 얼마나 게을렀는지 봐줘', url };
    if (navigator.share) navigator.share(data).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => toast('링크 복사했어'));
  }
  if (a === 'restore') {
    const code = prompt('복구 코드를 붙여넣어줘');
    const [uid, secret] = (code || '').trim().split('.');
    if (!uid || !secret) return;
    acct = { uid, secret };
    try {
      state = await call('/api/state');
      acct.share = state.share;
      store.set('acct', acct);
      try { await call('/api/sub', { sub: await getSub() }); state.dead = false; } catch (err) { toast(err.message); }
      render();
    } catch { acct = null; toast('코드가 맞지 않아'); render(); }
  }
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && acct) { report = null; load(); } });
setInterval(() => { if (document.visibilityState === 'visible' && state && tab === 'today' && !passOpen) render(); }, 60e3);
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.task) { focusTask = e.data.task; tab = 'today'; }
  if (e.data?.tab) tab = e.data.tab;
  if (acct) load();
});

// ---------- 시작 ----------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
if (params.get('r')) {
  $app.innerHTML = `<div class="intro">${mascot('chill')}<p>리포트 불러오는 중…</p></div>`;
  fetch(`${API}/api/report?share=${encodeURIComponent(params.get('r'))}`).then((r) => r.ok ? r.json() : Promise.reject())
    .then((w) => renderReport(w, true)).catch(() => { $app.innerHTML = '<div class="empty">리포트를 찾을 수 없어요</div>'; });
} else if (acct) { render(); load(); } else render();
