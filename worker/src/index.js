// 잔소리 룸메 — API + 5분마다 도는 잔소리 스케줄러
// KV 키: idx = [uid...] / u:{uid} = 사용자 / s:{share} = uid
//        log:{uid}:{date} = 내 응답(했음·미룸·패스) / nag:{uid}:{date} = 봇이 조른 기록
import { sendPush } from './push.js';

const GAP = 30 * 60e3;      // 재알림 간격
const MAX_NAG = 4;          // 무시할 때 최대 조르는 횟수
const FIRST_WINDOW = 60;    // 예정 시각 후 몇 분 안에만 첫 알림 (앱 늦게 켰을 때 아침 알림 폭탄 방지)
const QUIET_UNTIL = 7 * 60; // 00:00~07:00 조용히
const LOG_TTL = 120 * 86400;

// ---------- 시간 (KST) ----------
const kst = (t = Date.now()) => new Date(t + 9 * 3600e3);
const dateKey = (d) => d.toISOString().slice(0, 10);
const minOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const nowInfo = (t = Date.now()) => {
  const d = kst(t);
  return { t, date: dateKey(d), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
};
const shiftDate = (date, days) => dateKey(new Date(Date.parse(date) + days * 86400e3));
const dowOf = (date) => new Date(Date.parse(date)).getUTCDay();

// ---------- 잔소리 문구 ----------
function nagText(task, n, kind) {
  if (kind === 'snooze') return `10분 지났어 ⏰ ${task.tiny}`;
  return [
    `${task.tiny}. 딱 이것만 하자`,
    `아직이지? ${task.tiny}. 2분이면 끝나`,
    `진짜 안 할 거야? 안 할 거면 패스 이유라도 적어 😑`,
    `마지막으로 말한다. 했으면 [했음], 안 할 거면 [패스]. 무시하면 리포트에 남아 📝`,
  ][Math.min(n, 3)];
}

// ---------- KV 헬퍼 ----------
const getJ = async (env, k, d = null) => (await env.KV.get(k, 'json')) ?? d;
const putJ = (env, k, v, ttl) => env.KV.put(k, JSON.stringify(v), ttl ? { expirationTtl: ttl } : undefined);
const rid = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------- 스케줄러 ----------
async function runUser(env, uid, now) {
  const u = await getJ(env, `u:${uid}`);
  if (!u || !u.sub || u.dead) return;
  const todays = u.tasks.filter((t) => t.days.includes(now.dow));
  const log = await getJ(env, `log:${uid}:${now.date}`, {});
  const nag = await getJ(env, `nag:${uid}:${now.date}`, {});
  const vapid = { pub: env.VAPID_PUBLIC, jwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT };
  let changed = false;

  const pending = todays.filter((t) => minOf(t.time) <= now.min && !['done', 'pass'].includes(log[t.id]?.st)).length;

  for (const t of todays) {
    const tMin = minOf(t.time);
    const e = log[t.id];
    if (tMin > now.min || e?.st === 'done' || e?.st === 'pass') continue;
    const g = nag[t.id] || { n: 0, last: 0 };
    let kind = null;
    if (e?.st === 'snooze') {
      if (e.until > now.t) continue;
      if (g.last < e.until) kind = 'snooze';
      else if (g.n < MAX_NAG && now.t - g.last >= GAP) kind = 'nag';
    } else if (g.n === 0) {
      if (now.min - tMin <= FIRST_WINDOW) kind = 'first';
    } else if (g.n < MAX_NAG && now.t - g.last >= GAP) kind = 'nag';
    if (!kind || g.n >= MAX_NAG * 2) continue;

    const status = await sendPush(u.sub, {
      title: `${t.emoji} ${t.name}`,
      body: nagText(t, kind === 'first' ? 0 : g.n, kind),
      tag: t.id,
      url: `./?task=${t.id}`,
      badge: pending,
    }, vapid);
    if (status === 404 || status === 410) { u.dead = true; await putJ(env, `u:${uid}`, u); return; }
    if (status >= 400) console.log('push fail', uid, status);
    nag[t.id] = { n: g.n + 1, last: now.t };
    changed = true;
  }

  // 일요일 21시 주간 리포트
  if (now.dow === 0 && now.min >= 21 * 60 && !nag._rep) {
    const w = await weekData(env, uid, u, now.date);
    await sendPush(u.sub, {
      title: '📊 이번 주 잔소리 리포트',
      body: `완료율 ${w.rate}%. ${w.rate >= 80 ? '이번 주 꽤 괜찮았어 👏' : w.rate >= 50 ? '반은 했네. 다음 주엔 조금만 더' : '...이번 주 반성 좀 하자'}`,
      tag: 'report',
      url: './?tab=report',
      badge: pending,
    }, vapid);
    nag._rep = 1;
    changed = true;
  }
  if (changed) await putJ(env, `nag:${uid}:${now.date}`, nag, LOG_TTL);
}

// ---------- 리포트 데이터 ----------
async function weekData(env, uid, u, today) {
  const dow = dowOf(today);
  const monday = shiftDate(today, -((dow + 6) % 7));
  const dates = [...Array(7)].map((_, i) => shiftDate(monday, i));
  const days = await Promise.all(dates.map(async (date) => ({
    date,
    log: date <= today ? await getJ(env, `log:${uid}:${date}`, {}) : {},
    nag: date <= today ? await getJ(env, `nag:${uid}:${date}`, {}) : {},
  })));
  let total = 0, done = 0;
  const now = nowInfo();
  for (const d of days) {
    for (const t of u.tasks) {
      if (!t.days.includes(dowOf(d.date)) || d.date > today) continue;
      if (d.date === now.date && minOf(t.time) > now.min && !d.log[t.id]) continue;
      total++;
      if (d.log[t.id]?.st === 'done') done++;
    }
  }
  // 연속 '완벽한 날' (최대 30일 역산, 오늘은 다 끝냈을 때만 포함)
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const date = shiftDate(today, -i);
    const due = u.tasks.filter((t) => t.days.includes(dowOf(date)));
    const lg = days.find((d) => d.date === date)?.log ?? (await getJ(env, `log:${uid}:${date}`, {}));
    const perfect = due.length > 0 && due.every((t) => lg[t.id]?.st === 'done');
    if (perfect) streak++;
    else if (i > 0) break;
  }
  return { tasks: u.tasks, dates, days, rate: total ? Math.round((done / total) * 100) : 0, total, done, streak, today, since: u.created };
}

// ---------- API ----------
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Uid,X-Key',
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

function validTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length > 20) return null;
  const out = [];
  for (const t of tasks) {
    if (!t || typeof t.name !== 'string' || !/^\d{2}:\d{2}$/.test(t.time) || !Array.isArray(t.days)) return null;
    out.push({
      id: String(t.id || rid(4)).slice(0, 20),
      emoji: String(t.emoji || '✅').slice(0, 8),
      name: t.name.slice(0, 20),
      tiny: String(t.tiny || t.name).slice(0, 60),
      time: t.time,
      days: t.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    });
  }
  return out;
}
const validSub = (s) => s && typeof s.endpoint === 'string' && s.endpoint.startsWith('https://') && s.keys?.p256dh && s.keys?.auth
  ? { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } } : null;

async function auth(env, req) {
  const uid = req.headers.get('X-Uid');
  if (!uid || !/^[0-9a-f]{16}$/.test(uid)) return null;
  const u = await getJ(env, `u:${uid}`);
  return u && u.secret === req.headers.get('X-Key') ? { uid, u } : null;
}

async function api(req, env) {
  const url = new URL(req.url);
  const p = url.pathname;
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const now = nowInfo();

  if (p === '/api/register' && req.method === 'POST') {
    const tasks = validTasks(body.tasks);
    const sub = validSub(body.sub);
    if (!tasks || !sub) return json({ error: 'bad input' }, 400);
    const uid = rid(8), share = rid(8);
    const u = { secret: rid(16), share, sub, tasks, created: now.date };
    await putJ(env, `u:${uid}`, u);
    await env.KV.put(`s:${share}`, uid);
    const idx = await getJ(env, 'idx', []);
    idx.push(uid);
    await putJ(env, 'idx', idx);
    return json({ uid, secret: u.secret, share });
  }

  if (p === '/api/report' && url.searchParams.get('share')) {
    const uid = await env.KV.get(`s:${url.searchParams.get('share')}`);
    const u = uid && (await getJ(env, `u:${uid}`));
    if (!u) return json({ error: 'not found' }, 404);
    const w = await weekData(env, uid, u, now.date);
    for (const d of w.days) for (const k in d.log) delete d.log[k].reason; // 패스 사유는 본인만
    return json(w);
  }

  const a = await auth(env, req);
  if (!a) return json({ error: 'unauthorized' }, 401);
  const { uid, u } = a;

  if (p === '/api/state') {
    return json({ tasks: u.tasks, share: u.share, dead: !!u.dead, now, log: await getJ(env, `log:${uid}:${now.date}`, {}), nag: await getJ(env, `nag:${uid}:${now.date}`, {}) });
  }
  if (p === '/api/report') return json(await weekData(env, uid, u, now.date));

  if (p === '/api/sub' && req.method === 'POST') {
    const sub = validSub(body.sub);
    if (!sub) return json({ error: 'bad sub' }, 400);
    u.sub = sub; delete u.dead;
    await putJ(env, `u:${uid}`, u);
    return json({ ok: true });
  }
  if (p === '/api/tasks' && req.method === 'POST') {
    const tasks = validTasks(body.tasks);
    if (!tasks) return json({ error: 'bad tasks' }, 400);
    u.tasks = tasks;
    await putJ(env, `u:${uid}`, u);
    return json({ ok: true, tasks });
  }
  if (p === '/api/act' && req.method === 'POST') {
    const { task, act, reason } = body;
    if (!u.tasks.some((t) => t.id === task)) return json({ error: 'no task' }, 400);
    const key = `log:${uid}:${now.date}`;
    const log = await getJ(env, key, {});
    const prev = log[task] || {};
    if (act === 'done') log[task] = { st: 'done', at: now.t, sn: prev.sn || 0 };
    else if (act === 'snooze') log[task] = { st: 'snooze', at: now.t, until: now.t + 10 * 60e3, sn: (prev.sn || 0) + 1 };
    else if (act === 'pass') {
      if (typeof reason !== 'string' || reason.trim().length < 2) return json({ error: '이유는 두 글자 이상' }, 400);
      log[task] = { st: 'pass', at: now.t, reason: reason.trim().slice(0, 100), sn: prev.sn || 0 };
    } else if (act === 'undo') delete log[task];
    else return json({ error: 'bad act' }, 400);
    await putJ(env, key, log, LOG_TTL);
    return json({ ok: true, log });
  }
  if (p === '/api/test' && req.method === 'POST') {
    const vapid = { pub: env.VAPID_PUBLIC, jwk: JSON.parse(env.VAPID_PRIVATE_JWK), subject: env.VAPID_SUBJECT };
    const status = await sendPush(u.sub, { title: '🙋 잔소리 룸메', body: '알림 잘 온다! 이제 도망 못 가', tag: 'test', url: './' }, vapid);
    if (status === 404 || status === 410) { u.dead = true; await putJ(env, `u:${uid}`, u); }
    return json({ status });
  }
  return json({ error: 'not found' }, 404);
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    try { return await api(req, env); } catch (e) { console.log(e.stack); return json({ error: 'server' }, 500); }
  },
  async scheduled(_ev, env, ctx) {
    const now = nowInfo();
    if (now.min < QUIET_UNTIL) return;
    const idx = await getJ(env, 'idx', []);
    ctx.waitUntil(Promise.all(idx.map((uid) => runUser(env, uid, now).catch((e) => console.log(uid, e.stack)))));
  },
};
