import React, { useEffect } from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { getCurrentSessionUser } from './services/unifiedAuth';

export function App() {
  useEffect(() => {
    // Prevent back-button access after logout (handles bfcache and history pop)
    const checkBackNavigationAuth = () => {
      const hash = window.location.hash || '';
      const path = hash.startsWith('#/') ? hash.slice(1) : hash;
      const cleanPath = path.split('?')[0].split('#')[0];
      const isAuthPage =
        cleanPath === '/login' ||
        cleanPath.startsWith('/login') ||
        cleanPath === '/signin' ||
        cleanPath.startsWith('/signin') ||
        cleanPath.includes('signup') ||
        cleanPath.includes('password') ||
        cleanPath.includes('register') ||
        cleanPath === '' ||
        cleanPath === '/';

      if (!isAuthPage) {
        const user = getCurrentSessionUser();
        if (!user) {
          window.location.replace('#/login');
        }
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        checkBackNavigationAuth();
      }
    };

    window.addEventListener('popstate', checkBackNavigationAuth);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('popstate', checkBackNavigationAuth);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

export default App;
