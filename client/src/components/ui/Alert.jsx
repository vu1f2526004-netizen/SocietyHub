import React, { useState } from 'react';
import { Info, CheckCircle, AlertTriangle, AlertCircle, X } from 'lucide-react';

/**
 * SocietyHub In-Page Alert Component
 * Used for operational warnings, pending action notices, and feedback banners.
 */
const Alert = ({
  variant = 'info', // 'info' | 'success' | 'warning' | 'danger'
  title,
  children,
  icon: CustomIcon,
  dismissible = false,
  onDismiss,
  action,
  className = '',
  style = {},
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const getVariantConfig = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'var(--sh-success-50)',
          border: 'var(--sh-success-border)',
          iconColor: 'var(--sh-success-500)',
          titleColor: 'var(--sh-success-700)',
          textColor: 'var(--sh-success-700)',
          DefaultIcon: CheckCircle,
        };
      case 'warning':
        return {
          bg: 'var(--sh-warning-50)',
          border: 'var(--sh-warning-border)',
          iconColor: 'var(--sh-warning-500)',
          titleColor: 'var(--sh-warning-700)',
          textColor: 'var(--sh-warning-700)',
          DefaultIcon: AlertTriangle,
        };
      case 'danger':
      case 'error':
        return {
          bg: 'var(--sh-danger-50)',
          border: 'var(--sh-danger-border)',
          iconColor: 'var(--sh-danger-500)',
          titleColor: 'var(--sh-danger-700)',
          textColor: 'var(--sh-danger-700)',
          DefaultIcon: AlertCircle,
        };
      case 'info':
      default:
        return {
          bg: 'var(--sh-blue-50)',
          border: 'var(--sh-blue-200)',
          iconColor: 'var(--sh-blue-600)',
          titleColor: 'var(--sh-blue-800)',
          textColor: 'var(--sh-blue-700)',
          DefaultIcon: Info,
        };
    }
  };

  const cfg = getVariantConfig();

  const renderIcon = () => {
    const iconToRender = CustomIcon || cfg.DefaultIcon;
    if (!iconToRender) return null;
    if (React.isValidElement(iconToRender)) return iconToRender;
    if (typeof iconToRender === 'function' || (typeof iconToRender === 'object' && iconToRender !== null)) {
      const IconComp = iconToRender;
      return <IconComp size={18} />;
    }
    return null;
  };

  const handleClose = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--sh-radius-md)',
        padding: 'var(--sh-space-3) var(--sh-space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--sh-space-3)',
        boxShadow: 'var(--sh-shadow-xs)',
        ...style,
      }}
      className={className}
    >
      <div style={{ color: cfg.iconColor, flexShrink: 0, marginTop: '2px' }}>
        {renderIcon()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontWeight: 'var(--sh-weight-bold)', fontSize: 'var(--sh-text-sm)', color: cfg.titleColor, marginBottom: '2px' }}>
            {title}
          </div>
        )}
        <div style={{ fontSize: 'var(--sh-text-sm)', color: cfg.textColor, lineHeight: 'var(--sh-leading-normal)' }}>
          {children}
        </div>
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}

      {dismissible && (
        <button
          type="button"
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: cfg.iconColor,
            cursor: 'pointer',
            padding: '2px',
            borderRadius: 'var(--sh-radius-xs)',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
            flexShrink: 0,
          }}
          title="Dismiss alert"
          aria-label="Dismiss alert"
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
