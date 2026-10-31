import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  toggleTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlTheme = new URLSearchParams(window.location.search).get('theme');
        if (urlTheme === 'dark' || urlTheme === 'light') return urlTheme;
        const saved = localStorage.getItem('societyhub_theme') || localStorage.getItem('societyhub_public_theme');
        if (saved === 'dark' || saved === 'light') return saved;
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }
      }
    } catch (_) {}
    return 'dark'; // Luxury midnight navy default
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    try {
      localStorage.setItem('societyhub_theme', theme);
      localStorage.setItem('societyhub_public_theme', theme);
    } catch (_) {}

    // Set data-theme on html root element
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-public-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
