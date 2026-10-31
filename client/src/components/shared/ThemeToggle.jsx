import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '', size = 'medium' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const isSmall = size === 'small';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isSmall ? '34px' : '38px',
        height: isSmall ? '34px' : '38px',
        borderRadius: '10px',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)'}`,
        color: isDark ? '#F5BB45' : '#0F172A',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        padding: 0,
        outline: 'none',
        flexShrink: 0
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(245, 187, 69, 0.18)' : 'rgba(16, 185, 129, 0.12)';
        e.currentTarget.style.borderColor = isDark ? '#F5BB45' : '#10B981';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)';
        e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {isDark ? (
        <Sun size={isSmall ? 17 : 19} style={{ color: '#F5BB45' }} />
      ) : (
        <Moon size={isSmall ? 17 : 19} style={{ color: '#0F172A' }} />
      )}
    </button>
  );
};

export default ThemeToggle;
