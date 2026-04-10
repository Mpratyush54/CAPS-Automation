import { useEffect } from 'react';
import { useUiStore } from '../store/ui';

export const useViewportTracker = () => {
  const setViewportFromWindow = useUiStore((s) => s.setViewportFromWindow);
  const viewport = useUiStore((s) => s.viewport);

  useEffect(() => {
    setViewportFromWindow();

    const onResize = () => setViewportFromWindow();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [setViewportFromWindow]);

  useEffect(() => {
    document.documentElement.setAttribute('data-viewport', viewport);
  }, [viewport]);
};
