import React from 'react';

/**
 * SocietyHub LoadingSpinner Component
 * Accessible inline SVG spinner for buttons, cards, and asynchronous states.
 */
const LoadingSpinner = ({
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg'
  color = 'primary', // 'primary' | 'white' | 'muted' | 'blue' | 'danger'
  ariaLabel = 'Loading...',
  style = {},
  className = '',
}) => {
  const getSizePx = () => {
    switch (size) {
      case 'xs': return 12;
      case 'sm': return 16;
      case 'lg': return 32;
      case 'md':
      default: return 20;
    }
  };

  const getColorHex = () => {
    switch (color) {
      case 'white': return '#ffffff';
      case 'muted': return 'var(--sh-slate-400)';
      case 'blue': return 'var(--sh-blue-600)';
      case 'danger': return 'var(--sh-danger-600)';
      case 'primary':
      default: return 'var(--sh-primary-500)';
    }
  };

  const px = getSizePx();
  const c = getColorHex();

  return (
    <svg
      role="status"
      aria-label={ariaLabel}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: `${px}px`,
        height: `${px}px`,
        animation: 'shSpin 0.75s linear infinite',
        flexShrink: 0,
        ...style,
      }}
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={c}
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={c}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default LoadingSpinner;
