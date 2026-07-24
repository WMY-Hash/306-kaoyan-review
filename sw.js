/* 306 考研复习辅助 — Service Worker
 * 缓存策略：stale-while-revalidate（先返回缓存，后台静默刷新；离线时仍可读）
 * 版本号：kaoyan-review-v1   改本文件 / 任何预缓存资源时改此版本号以触发更新
 */
/* global self, caches */
const CACHE = 'kaoyan-review-v1';
const CORE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './data/kb.js',
  './data/plan.js',
  './data/graph.js',
  './vendor/three.min.js',
  './vendor/3d-force-graph.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 跳过 chrome-extension 之类
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((resp) => {
        // 只缓存成功响应
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => hit); // 离线时回退到缓存
      return hit || network;
    })
  );
});