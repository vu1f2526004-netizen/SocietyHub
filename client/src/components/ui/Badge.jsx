import React from 'react';

/**
 * SocietyHub Standard Badge Component
 * Semantic pill for statuses (Pending, Approved, Paid, Overdue, Entered, etc.)
 */
const Badge = ({
  children,
  variant = 'neutral', // 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'
  size = 'md', // 'sm' | 'md'
  icon,
  dot = false,
  className = '',
  style = {},
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'var(--sh-badge-success-bg, #dcfce7)',
          text: 'var(--sh-badge-success-text, #166534)',
          border: 'var(--sh-badge-success-border, #86efac)',
          dotColor: 'var(--sh-primary-500)',
        };
      case 'warning':
        return {
          bg: 'var(--sh-badge-warning-bg, #fef3c7)',
          text: 'var(--sh-badge-warning-text, #b45309)',
          border: 'var(--sh-badge-warning-border, #fde68a)',
          dotColor: 'var(--sh-warning-500)',
        };
      case 'danger':
      case 'error':
        return {
          bg: 'var(--sh-badge-danger-bg, #fee2e2)',
          text: 'var(--sh-badge-danger-text, #b91c1c)',
          border: 'var(--sh-badge-danger-border, #fca5a5)',
          dotColor: 'var(--sh-danger-500)',
        };
      case 'info':
      case 'blue':
        return {
          bg: 'var(--sh-badge-info-bg, #dbeafe)',
          text: 'var(--sh-badge-info-text, #1d4ed8)',
          border: 'var(--sh-badge-info-border, #bfdbfe)',
          dotColor: 'var(--sh-blue-500)',
        };
      case 'purple':
        return {
          bg: 'var(--sh-badge-purple-bg, #ede9fe)',
          text: 'var(--sh-badge-purple-text, #6d28d9)',
          border: 'var(--sh-badge-purple-border, #ddd6fe)',
          dotColor: 'var(--sh-purple-500)',
        };
      case 'neutral':
      default:
        return {
          bg: 'var(--sh-badge-neutral-bg, #f1f5f9)',
          text: 'var(--sh-badge-neutral-text, #334155)',
          border: 'var(--sh-badge-neutral-border, #e2e8f0)',
          dotColor: 'var(--sh-slate-400)',
        };
    }
  };

  const v = getVariantStyles();
  const isSmall = size === 'sm';

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon;
      return <IconComp size={isSmall ? 12 : 14} style={{ flexShrink: 0 }} />;
    }
    return null;
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--sh-radius-full)',
        fontSize: isSmall ? 'var(--sh-text-xs)' : '0.8rem',
        fontWeight: 'var(--sh-weight-bold)',
        lineHeight: 1.2,
        backgroundColor: v.bg,
        color: v.text,
        border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
      className={className}
    >
      {dot && (
        <span
          style={{
            width: isSmall ? '5px' : '6px',
            height: isSmall ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: v.dotColor,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {renderIcon()}
      {children}
    </span>
  );
};

export default Badge;
