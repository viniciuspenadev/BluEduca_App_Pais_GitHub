// Service Worker for BluEduca PWA
const CACHE_NAME = 'blueduca-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/offline.html',
                '/icon-192.png',
                '/icon-512.png'
            ]).catch(err => console.warn('[SW] Caching failed:', err));
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // For navigation (HTML), try network first, then cache/offline
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(OFFLINE_URL) || caches.match('/');
                })
        );
        return;
    }

    // For other assets (images, css, js), try cache first (if exists), then network
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// Push notification logic
self.addEventListener('push', (event) => {
    let data = { title: 'BluEduca', body: 'Nova notificação recebida.' };
    let targetUrl = '/';

    if (event.data) {
        try {
            const json = event.data.json();
            data = { ...data, ...json };

            // Robust URL extraction to prevent "Menu" (Home) fallback
            // Checks multiple common fields used by backends
            targetUrl = json.url || json.data?.url || json.link || json.deep_link || '/';
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                data: { url: targetUrl }
            }),
            // Update App Badge if supported and provided
            (async () => {
                if (data.badge && 'setAppBadge' in navigator) {
                    try {
                        await navigator.setAppBadge(parseInt(data.badge));
                    } catch (e) {
                        console.error('Failed to set badge', e);
                    }
                }
            })()
        ])
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Mapping legacy URLs to new Next.js structure
    let url = event.notification.data.url || '/';
    if (url.startsWith('/pais')) {
        url = url.replace('/pais', '');
    }
    // Ensure it doesn't end up empty or as double slash
    if (!url || url === '') url = '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                // Check if we have a window already open at this url
                const clientPath = new URL(client.url).pathname;
                if (clientPath === url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
