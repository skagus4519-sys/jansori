// 잔소리 룸메 서비스워커 — 푸시 수신 + 앱 셸 캐시
const CACHE = 'jansori-v6';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'room.js', 'guide.js', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// 같은 출처 GET만: 네트워크 우선(브라우저 HTTP 캐시도 건너뜀 — Pages가 max-age=600을 줘서), 실패 시 캐시
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: '잔소리 룸메', body: e.data?.text() || '할 일 있어!' }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || '잔소리 룸메', {
      body: d.body, tag: d.tag, renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || './' },
    }),
    d.badge && self.navigator.setAppBadge ? self.navigator.setAppBadge(d.badge).catch(() => {}) : null,
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ refresh: 1 }))),
  ]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope);
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs[0];
    if (c) {
      c.postMessage({ task: target.searchParams.get('task'), tab: target.searchParams.get('tab') });
      return c.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
