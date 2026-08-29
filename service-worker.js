const CACHE_NAME = 'planning-lbm1-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});

/* -------- Daily reminder logic (best-effort, Chrome/Android installed PWA) -------- */
importScripts('data.js');

function todayStr(){
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function findTodayEvents(){
  const t = todayStr();
  const week = self.SCHEDULE.find(w => w.dates.includes(t));
  if (!week) return null;
  const day = week.days[t];
  return day ? day.events : [];
}

function announce(){
  const events = findTodayEvents();
  if (events === null) return Promise.resolve();
  let title, body;
  if (!events.length){
    title = "Aucun cours aujourd'hui";
    body = "Le planning LBM1-S1 ne prévoit rien pour aujourd'hui.";
  } else {
    title = `📚 ${events.length} cours aujourd'hui`;
    body = events.map(e => `${e.start} — ${(e.text.split('\n')[1] || e.text.split('\n')[0]).trim()}`).join('\n');
  }
  return self.registration.showNotification(title, {
    body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'daily-schedule'
  });
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-schedule-check'){
    event.waitUntil(announce());
  }
});

/* Manual trigger from the page (fallback for browsers without periodicSync) */
self.addEventListener('message', (event) => {
  if (event.data === 'announce-today'){
    event.waitUntil ? event.waitUntil(announce()) : announce();
  }
});
