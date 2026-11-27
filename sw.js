// Trang quản lý online: lưu sẵn trang trên điện thoại để mở ra là hiện ngay (cả khi mạng yếu / mất mạng).
// - Trang (index.html): hiện bản đã lưu ngay, đồng thời tải bản mới về lưu cho lần sau.
//   Trang tự so version.json: có bản mới thì mở lại với ?v=<bản> -> lần đó lấy thẳng từ mạng.
// - version.json, api.github.com, ntfy: luôn đi mạng, không lưu.
const CACHE = 'famtube-v1';
const SHELL = ['./', 'config.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('version.json')) return;
  const isPage = req.mode === 'navigate';
  const key = isPage ? './' : url.pathname;   // trang: một bản, bỏ ?v= và #token
  const fresh = fetch(req, { cache: 'no-store' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); }
    return res;
  });
  // Vừa có bản mới (?v=...): lấy mạng trước, mất mạng mới dùng bản lưu.
  if (isPage && url.searchParams.has('v')) {
    e.respondWith(fresh.catch(() => caches.match(key)));
    return;
  }
  e.respondWith(caches.match(key).then((hit) => {
    if (hit) { try { e.waitUntil(fresh.catch(() => {})); } catch (_) { fresh.catch(() => {}); } return hit; }
    return fresh;
  }));
});
