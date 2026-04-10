import { create } from 'zustand';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

const getViewportState = () => {
  if (typeof window === 'undefined') {
    return { viewport: 'desktop', isMobile: false, isTablet: false };
  }

  const width = window.innerWidth;
  const isMobile = width <= MOBILE_BREAKPOINT;
  const isTablet = width > MOBILE_BREAKPOINT && width <= TABLET_BREAKPOINT;

  return {
    viewport: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    isMobile,
    isTablet,
  };
};

export const useUiStore = create((set) => ({
  ...getViewportState(),
  setViewportFromWindow: () => set(getViewportState()),
}));

export { MOBILE_BREAKPOINT };
