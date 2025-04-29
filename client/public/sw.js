// Nombre del caché
const CACHE_NAME = 'nido-financiero-v1';

// Lista de recursos para pre-cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia de caché: Network First, luego Caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Respondemos con la respuesta de la red
        // y guardamos una copia en el caché
        let responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          // Solo guardamos en caché recursos de nuestra aplicación
          if (event.request.url.includes(self.origin)) {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        // Si falla la red, intentamos responder desde el caché
        return caches.match(event.request);
      })
  );
});

// Activación con limpieza de caché antiguos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Eliminamos los cachés antiguos
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});