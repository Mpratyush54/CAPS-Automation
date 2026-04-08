import { api } from './api';
import { getDeviceFingerprint, requestNotificationPermission, getDeviceInfo } from './device';

/**
 * Converts a base64 encoded string to a Uint8Array.
 * Required for PushManager.subscribe()
 */
const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

/**
 * Registers the current device for push notifications.
 * Fetches the the VAPID Public Key from the the backend.
 */
/**
 * Checks if the current device is already synchronized for push.
 */
export const checkDeviceSync = async () => {
    try {
        const fingerprint = getDeviceFingerprint();
        const res = await api.get('/api/notifications/devices');
        const devices = res.data.data.devices || [];
        return devices.some(d => d.fingerprint === fingerprint && d.isActive);
    } catch (err) {
        return false;
    }
};

export const registerCurrentDevice = async (force = false) => {
    try {
        // 1. Check Service Worker support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported in this browser.');
            return { success: false, reason: 'unsupported' };
        }

        // 2. Request Permission
        const permission = await requestNotificationPermission();
        if (permission !== 'granted' && !force) {
            return { success: false, permission };
        }

        // 3. Register Service Worker
        await navigator.serviceWorker.register('/sw.js');
        const registration = await navigator.serviceWorker.ready;

        // 4. Fetch the the VAPID Public Key from the the backend
        const keyRes = await api.get('/api/notifications/public-key');
        const { publicKey } = keyRes.data.data;

        // 5. Subscribe to Push Service
        let subscription = await registration.pushManager.getSubscription();
        
        // CHECK FOR KEY MISMATCH (Important!)
        if (subscription && subscription.options.applicationServerKey) {
            const currentKey = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.options.applicationServerKey)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            
            if (currentKey !== publicKey) {
                console.warn('VAPID Key mismatch! Re-subscribing...');
                await subscription.unsubscribe();
                subscription = null;
            }
        }

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }

        // 6. Gather machine metadata
        const fingerprint = getDeviceFingerprint();
        const info = getDeviceInfo();

        // 7. Register REAL TOKEN (Subscription Object) with backend
        const response = await api.post('/api/notifications/devices', {
            token: subscription, // Send the the full JSON object
            platform: 'web',
            deviceName: `${info.os} ${info.browser}`,
            fingerprint
        });

        console.log('Real Push Token registered successfully');
        return { success: true, permission, device: response.data.data };
    } catch (err) {
        console.error('Real Registration failed:', err.message);
        throw err;
    }
};
