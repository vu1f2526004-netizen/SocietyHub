import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/**
 * SocietyHub Standard Button Component
 * Supports accessible focus rings, loading states, semantic variants, and icon placement.
 */
const Button = ({
  as: Component = 'button',
  to,
  children,
  type = 'button',
  variant = 'primary', // 'primary' | 'secondary' | 'blue' | 'outline' | 'danger' | 'dangerOutline' | 'ghost' | 'link'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  style = {},
  title,
  ariaLabel,
  fullWidth = false,
  ...props
}) => {
  const isBusy = loading || disabled;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon;
      return <IconComp size={sStyles.iconSize} style={{ flexShrink: 0 }} />;
    }
    return null;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--sh-slate-100)',
          color: 'var(--sh-slate-900)',
          border: '1px solid var(--sh-slate-300)',
          boxShadow: 'var(--sh-shadow-xs)',
          hoverBg: 'var(--sh-slate-200)',
          hoverBorder: 'var(--sh-slate-400)',
          hoverText: 'var(--sh-slate-900)',
        };
      case 'blue':
        return {
          backgroundColor: 'var(--sh-blue-600)',
          color: '#ffffff',
          border: '1px solid var(--sh-blue-600)',
          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
          hoverBg: 'var(--sh-blue-700)',
          hoverBorder: 'var(--sh-blue-700)',
        };
      case 'outline':
        return {
          backgroundColor: 'var(--sh-white)',
          color: 'var(--sh-slate-800)',
          border: '1px solid var(--sh-slate-300)',
          boxShadow: 'var(--sh-shadow-xs)',
          hoverBg: 'var(--sh-slate-100)',
          hoverBorder: 'var(--sh-slate-400)',
          hoverText: 'var(--sh-slate-900)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--sh-danger-600)',
          color: '#ffffff',
          border: '1px solid var(--sh-danger-600)',
          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.25)',
          hoverBg: 'var(--sh-danger-700)',
          hoverBorder: 'var(--sh-danger-700)',
        };
      case 'dangerOutline':
        return {
          backgroundColor: 'var(--sh-white)',
          color: 'var(--sh-danger-600)',
          border: '1px solid var(--sh-danger-border)',
          boxShadow: 'var(--sh-shadow-xs)',
          hoverBg: 'var(--sh-badge-danger-bg)',
          hoverBorder: 'var(--sh-danger-500)',
          hoverText: 'var(--sh-danger-600)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--sh-slate-700)',
          border: '1px solid transparent',
          boxShadow: 'none',
          hoverBg: 'var(--sh-slate-100)',
          hoverBorder: 'transparent',
          hoverText: 'var(--sh-slate-900)',
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
          color: 'var(--sh-primary-600)',
          border: 'none',
          boxShadow: 'none',
          padding: 0,
          hoverBg: 'transparent',
          hoverText: 'var(--sh-primary-700)',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--sh-primary-500)',
          color: '#ffffff',
          border: '1px solid var(--sh-primary-500)',
          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.25)',
          hoverBg: 'var(--sh-primary-600)',
          hoverBorder: 'var(--sh-primary-600)',
        };
    }
  };

  const getSizeStyles = () => {
    if (variant === 'link') return { fontSize: 'var(--sh-text-sm)', padding: '0' };
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: 'var(--sh-text-xs)',
          borderRadius: 'var(--sh-radius-sm)',
          gap: '6px',
          iconSize: 14,
        };
      case 'lg':
        return {
          padding: '12px 24px',
          fontSize: 'var(--sh-text-base)',
          borderRadius: 'var(--sh-radius-lg)',
          gap: '10px',
          iconSize: 20,
        };
      case 'md':
      default:
        return {
          padding: '9px 16px',
          fontSize: 'var(--sh-text-sm)',
          borderRadius: 'var(--sh-radius-md)',
          gap: '8px',
          iconSize: 16,
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      to={to}
      disabled={Component === 'button' ? isBusy : undefined}
      aria-disabled={Component !== 'button' && isBusy ? 'true' : undefined}
      onClick={isBusy ? (e) => e.preventDefault() : onClick}
      title={title}
      aria-label={ariaLabel || title}
      aria-busy={loading ? 'true' : 'false'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--sh-font-sans)',
        fontWeight: 'var(--sh-weight-semibold)',
        lineHeight: 1,
        cursor: isBusy ? 'not-allowed' : 'pointer',
        pointerEvents: isBusy ? 'none' : 'auto',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--sh-transition-fast)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        textDecoration: variant === 'link' ? 'underline' : 'none',
        backgroundColor: vStyles.backgroundColor,
        color: vStyles.color,
        border: vStyles.border,
        boxShadow: vStyles.boxShadow,
        padding: sStyles.padding,
        fontSize: sStyles.fontSize,
        borderRadius: sStyles.borderRadius,
        gap: sStyles.gap,
        ...style,
      }}
      onMouseOver={(e) => {
        if (!isBusy) {
          if (vStyles.hoverBg) e.currentTarget.style.backgroundColor = vStyles.hoverBg;
          if (vStyles.hoverBorder) e.currentTarget.style.borderColor = vStyles.hoverBorder;
          if (vStyles.hoverText) e.currentTarget.style.color = vStyles.hoverText;
        }
      }}
      onMouseOut={(e) => {
        if (!isBusy) {
          e.currentTarget.style.backgroundColor = vStyles.backgroundColor;
          e.currentTarget.style.border = vStyles.border;
          e.currentTarget.style.color = vStyles.color;
        }
      }}
      className={className}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" color={variant === 'outline' || variant === 'ghost' ? 'muted' : 'white'} />
          <span>{children}</span>
        </>
      ) : (
        <>
          {iconPosition === 'left' && renderIcon()}
          {children}
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </Component>
  );
};

export default Button;
