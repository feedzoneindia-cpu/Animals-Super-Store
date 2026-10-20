import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import SplashScreen from '../components/common/SplashScreen.jsx';
import { ScrollSpyProvider } from '../context/ScrollSpyContext.jsx';
import useScrollReveal from '../hooks/useScrollReveal.js';

/** Pages that render full-screen, without the site navbar and footer. */
const BARE_ROUTES = ['/login', '/register'];

export default function MainLayout() {
  const { pathname } = useLocation();
  const isBare = BARE_ROUTES.includes(pathname.replace(/\/+$/, '') || '/');
  useScrollReveal(pathname);
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <SplashScreen />
      <ScrollSpyProvider>
        {!isBare && <Navbar />}
        <main id="main-content" key={pathname} className="animate-page-in flex-1">
          <Outlet />
        </main>
      </ScrollSpyProvider>
      {!isBare && <Footer />}
    </div>
  );
}
