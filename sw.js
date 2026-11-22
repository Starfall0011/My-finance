const VER = "keuangan-sb-v7";
const SHELL = ["./", "index.html", "config.js", "manifest.json", "icon-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "favicon-32.png"];

self.addEventListener("install", e => {
  // Simpan tiap file sendiri-sendiri: satu file yang hilang (404) tidak boleh menggagalkan seluruh instalasi offline
  e.waitUntil(caches.open(VER).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate") {
    // Buka dari jaringan jika ada (versi terbaru), cadangan dari cache saat offline
    e.respondWith(
      fetch(r).then(res => {
        const cp = res.clone();
        caches.open(VER).then(c => c.put("index.html", cp));
        return res;
      }).catch(() => caches.match("index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  if (new URL(r.url).pathname.endsWith("/config.js")) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
    return;
  }
  e.respondWith(
    caches.match(r).then(hit => {
      const net = fetch(r).then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(VER).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
