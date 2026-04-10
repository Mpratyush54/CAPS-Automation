import { useEffect, useState } from 'react';
import { getDeviceInfo, getNotificationState } from '../../lib/device';
import { registerCurrentDevice, checkDeviceSync } from '../../lib/notifications';

const OnboardingBanner = () => {
  const [showInstall, setShowInstall] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const info = getDeviceInfo();

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    checkDeviceSync().then((isSynced) => {
      const state = getNotificationState();
      if (state !== 'granted' || !isSynced) setShowNotify(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
  };

  const handleNotifyClick = async () => {
    try {
      await registerCurrentDevice(true);
      setShowNotify(false);
    } catch (e) {
      console.error('Registration failed:', e);
    }
  };

  if (!showInstall && !showNotify) return null;

  return (
    <div className="onboarding-container">
      {showInstall && (
        <div className="banner install-banner pulse-border">
          <div className="banner-content">
            <span className="icon" aria-hidden="true">Install</span>
            <div>
              <strong>Install {info.os} App</strong>
              <p>Get a faster experience and background updates.</p>
            </div>
          </div>
          <button className="btn-primary-glow sm" onClick={handleInstallClick}>Install</button>
        </div>
      )}
      {showNotify && (
        <div className="banner notify-banner">
          <div className="banner-content">
            <span className="icon" aria-hidden="true">Alerts</span>
            <div>
              <strong>Stay Updated</strong>
              <p>Enable real-time worklog and event alerts.</p>
            </div>
          </div>
          <button className="btn-accent sm" onClick={handleNotifyClick}>Enable</button>
        </div>
      )}
    </div>
  );
};

export default OnboardingBanner;
