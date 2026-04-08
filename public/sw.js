/**
 * CAPS Automation Service Worker
 * Handles background push notifications.
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const payload = event.data.json();
        console.log('📦 [PWA] Push received:', payload);
        const { title, body, icon, badge, data, vibrate, requireInteraction, actions } = payload;
        
        // Extract nested data if available (supports both shallow and deep formats)
        const metadata = data || {};
        const urlToOpen = metadata.url || payload.url || '/notifications';
        
        const options = {
            body: body || 'New update available.',
            icon: icon || '/favicon.svg',
            badge: badge || '/favicon.svg',
            data: { 
                url: urlToOpen, 
                id: metadata.id || payload.id || null,
                timestamp: metadata.timestamp || new Date().getTime()
            },
            vibrate: vibrate || [200, 100, 200],
            requireInteraction: requireInteraction !== undefined ? requireInteraction : true,
            actions: actions || [
                { action: 'open', title: 'View Details' },
                { action: 'close', title: 'Dismiss' }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(title || 'CAPS Automation', options)
        );
    } catch (err) {
        console.error('Push handling error:', err);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') return;
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window open with this URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window found, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
