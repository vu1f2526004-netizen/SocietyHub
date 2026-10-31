import React from 'react';

/**
 * SocietyHub Skeleton Component
 * Content loading placeholder with smooth shimmer animation.
 */
const Skeleton = ({
  variant = 'text', // 'text' | 'circular' | 'rectangular'
  width = '100%',
  height,
  count = 1,
  style = {},
  className = '',
}) => {
  const getDefaultHeight = () => {
    switch (variant) {
      case 'circular': return typeof width === 'number' ? `${width}px` : width;
      case 'rectangular': return '120px';
      case 'text':
      default: return '16px';
    }
  };

  const resolvedHeight = height || getDefaultHeight();
  const borderRadius =
    variant === 'circular'
      ? 'var(--sh-radius-full)'
      : variant === 'rectangular'
      ? 'var(--sh-radius-md)'
      : 'var(--sh-radius-xs)';

  const shimmerStyle = {
    display: 'block',
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof resolvedHeight === 'number' ? `${resolvedHeight}px` : resolvedHeight,
    borderRadius,
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shShimmer 1.5s infinite linear',
  };

  if (count > 1 && variant === 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              ...shimmerStyle,
              width: i === count - 1 ? '70%' : '100%',
              ...style,
            }}
            className={className}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        ...shimmerStyle,
        ...style,
      }}
      className={className}
    />
  );
};

export default Skeleton;
