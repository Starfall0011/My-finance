const VER = "keuangan-sb-v66";
const SHELL = ["./", "index.html", "config.js", "manifest.json", "icon-192.png", "icon-light-192.png", "icon-512.png", "maskable-512.png", "apple-touch-icon.png", "favicon-32.png"];

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

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if ("focus" in c) return c.focus(); }
      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
      // Jika aplikasi sedang terlihat, pemberitahuan sudah tampil di dalam aplikasi
      const vis = cs.filter(c => c.visibilityState === "visible");
      if (vis.length) { vis.forEach(c => c.postMessage({ type: "sg-sync" })); return; }
      return self.registration.showNotification(d.title || "Keuangan Saya", {
        body: d.body || "",
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: d.tag || undefined
      });
    })
  );
});
