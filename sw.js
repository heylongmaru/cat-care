/* 喵日誌（貓咪照護記錄）— Service Worker
   目的只有兩個：
   1. 讓瀏覽器認得這是可安裝的 App（加到主畫面、全螢幕開啟）
   2. 沒網路時也打得開（把工具本體快取起來）

   刻意「不」快取任何使用者資料——資料一律存在 localStorage，
   同步走 Apps Script，這裡只放靜態檔。
   改版時把 CACHE 的版本號 +1，舊快取會在啟用時清掉。
   ※ v1.8.2 與 v1.9 曾漏改這裡，導致舊快取不會被清除——**每次動 index.html 都要順手改**。 */
const CACHE = 'catcare-v1.9';
const ASSETS = ['./', './index.html', './guide.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // 某個檔抓不到也不要卡住安裝
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // 同步用的 POST 一律直接走網路
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // 外部資源（如 OCR 引擎）交給瀏覽器自己處理

  // 網路優先、失敗回快取：這樣改版後一開就是新版，斷網時仍打得開
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
