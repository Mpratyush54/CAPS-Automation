/**
 * Generates or retrieves a stable unique identifier for the current device.
 * This is stored in localStorage to ensure the same device is recognized 
 * even if the push token changes, preventing duplicate subscriptions.
 */
export const getDeviceFingerprint = () => {
    let fingerprint = localStorage.getItem('deviceFingerprint');
    if (!fingerprint) {
        // High-fidelity fingerprint based on multi-dimensional environment properties
        const platformInfo = [
            navigator.userAgent,           // Browser & Engine info
            navigator.platform,            // OS / Architecture info
            navigator.hardwareConcurrency, // Core count
            navigator.deviceMemory,       // Available RAM (approximate)
            screen.width, screen.height,   // Resolution
            screen.colorDepth,             // Display depth
            window.devicePixelRatio,       // Scaling
            navigator.language,            // Locale
            Intl.DateTimeFormat().resolvedOptions().timeZone // Geographic bias
        ].join('|');
        
        // Use SHA-like stabilization for the ID
        const hashBase = btoa(platformInfo).substring(0, 32);
        const randomEntropy = Math.random().toString(36).substring(2, 10);
        fingerprint = `fp_${hashBase}_${randomEntropy}`;
        
        localStorage.setItem('deviceFingerprint', fingerprint);
    }
    return fingerprint;
};
/**
 * Request browser notification permission
 * @returns {Promise<string>} 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return 'unsupported';
    return await Notification.requestPermission();
};

/**
 * Returns current permission state
 */
export const getNotificationState = () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
};

/**
 * Returns basic device info for labeling
 */
export const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';
    
    return {
        os,
        browser: 'Web Browser', // Simplification
        platform: navigator.platform
    };
};
