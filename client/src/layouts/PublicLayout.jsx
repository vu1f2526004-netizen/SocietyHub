import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicThemeProvider, usePublicTheme } from '../context/PublicThemeContext';
import PublicNavbar from '../pages/Public/components/PublicNavbar';
import PublicFooter from '../pages/Public/components/PublicFooter';

/**
 * PublicLayoutContent
 * Renders the scoped theme container, navbar, page outlet, and footer.
 */
const PublicLayoutContent = () => {
  const { pathname } = useLocation();
  const { theme, isDark } = usePublicTheme();

  // Scroll to top whenever the route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className={`sh-public-site ${isDark ? 'sh-dark' : 'sh-light'}`}
      data-theme={theme}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--pub-bg-main)',
        color: 'var(--pub-text-primary)',
        overflowX: 'hidden',
        width: '100%',
        transition: 'background-color 250ms ease, color 250ms ease'
      }}
    >
      <PublicNavbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

/**
 * PublicLayout
 * Provides PublicThemeProvider so all public pages seamlessly share theme state.
 */
const PublicLayout = () => {
  return (
    <PublicThemeProvider>
      <PublicLayoutContent />
    </PublicThemeProvider>
  );
};

export default PublicLayout;
