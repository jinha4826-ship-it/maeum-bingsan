/* 마음의 빙산 서비스 워커
   · 네트워크 우선: 항상 새 파일을 먼저 받아오고, 실패할 때만 캐시로 대신합니다.
   · 앱 파일(HTML·아이콘·매니페스트)만 캐시하고, Supabase·AI Worker·Google API처럼
     다른 주소로 나가는 요청은 절대 캐시하지 않습니다(기록·로그인 응답 보호).
   · 새 버전이 올라오면 캐시 이름이 바뀌고, 이전 캐시는 activate에서 지웁니다.
     (예전에 겪은 '캐시가 꼬여 수정이 반영되지 않는' 문제 방지) */
var SW_VERSION = '2026-11-18-v7';
var CACHE_NAME = 'maeum-bingsan-' + SW_VERSION;
var CORE = [
  './',
  './index.html',
  './privacy.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return Promise.all(CORE.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () { /* 없는 파일은 건너뜁니다 */ });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME && key.indexOf('maeum-bingsan-') === 0) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // 같은 사이트의 파일만 다룹니다. 클라우드 동기화·AI 서버 요청은 손대지 않습니다.
  if (url.origin !== self.location.origin) return;
  if (req.headers.get('range')) return;

  event.respondWith(networkFirst(req));
});

function networkFirst(req) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return fetch(req, { cache: 'no-store' }).then(function (res) {
      if (res && res.ok && res.type === 'basic' && res.status === 200) {
        cache.put(req, res.clone()).catch(function () {});
      }
      return res;
    }).catch(function () {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') {
          return cache.match('./index.html').then(function (shell) {
            if (shell) return shell;
            return offlinePage();
          });
        }
        return offlinePage();
      });
    });
  });
}

function offlinePage() {
  return new Response(
    '<!doctype html><html lang="ko"><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>오프라인 · 마음의 빙산</title>' +
    '<body style="margin:0;background:#fbf7f3;color:#40364a;font-family:-apple-system,BlinkMacSystemFont,\'Apple SD Gothic Neo\',sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px">' +
    '<div><div style="font-size:44px">🧊</div><h1 style="font-size:19px;letter-spacing:-.5px">지금은 연결이 없어요</h1>' +
    '<p style="font-size:13px;color:#8b8094;line-height:1.7">이미 저장된 기록은 기기에 그대로 있어요.<br>연결이 돌아오면 다시 열어 주세요.</p>' +
    '<p style="font-size:12px;color:#a498ad">You are offline. Your saved entries stay on this device.</p></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
