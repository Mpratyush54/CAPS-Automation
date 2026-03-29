/**
 * CAPS Automation Service Worker
 * Handles background push notifications.
 */
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const { title, body, icon, url, id } = data;
        
        const options = {
            body: body || 'You have a new update.',
            icon: icon || '/logo192.png',
            badge: '/logo192.png',
            data: { url: url || '/notifications', id },
            vibrate: [100, 50, 100],
            actions: [
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
