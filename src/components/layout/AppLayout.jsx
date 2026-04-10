import { Suspense } from 'react';
import Sidebar from '../Sidebar';
import MobileNav from '../navigation/MobileNav';
import OnboardingBanner from './OnboardingBanner';
import PremiumLoader from '../common/PremiumLoader';

const AppLayout = ({ children }) => (
  <div className="app-layout">
    <Sidebar />
    <div className="main-content">
      <OnboardingBanner />
      <Suspense fallback={<PremiumLoader />}>
        {children}
      </Suspense>
    </div>
    <MobileNav />
  </div>
);

export default AppLayout;
