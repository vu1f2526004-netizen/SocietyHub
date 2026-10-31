import React from 'react';

/**
 * SocietyHub Standard Metric / KPI StatCard
 * Standardizes dashboard statistics across Admin, Resident, and Security Staff portals.
 */
const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'var(--sh-primary-500)',
  bg,
  trend,
  onClick,
  loading = false,
  style = {},
  className = '',
}) => {
  const iconBg = bg || (color.startsWith('#') ? `${color}15` : 'var(--sh-primary-50)');
  const iconColor = color;

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon;
      return <IconComponent size={20} />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        backgroundColor: 'var(--sh-white)',
        borderRadius: 'var(--sh-radius-lg)',
        padding: 'var(--sh-space-6)',
        boxShadow: 'var(--sh-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform var(--sh-transition-base), box-shadow var(--sh-transition-base)',
        border: '1px solid var(--sh-slate-200)',
        borderLeft: `4px solid ${color}`,
        outline: 'none',
        userSelect: 'none',
        ...style,
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--sh-shadow-md)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--sh-shadow-sm)';
        }
      }}
      className={className}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--sh-text-xs)',
            fontWeight: 'var(--sh-weight-bold)',
            color: 'var(--sh-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </h3>
        {icon && (
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--sh-radius-md)',
              backgroundColor: iconBg,
              color: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {renderIcon()}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: subtitle || trend ? '6px' : '0' }}>
        <span
          style={{
            fontSize: 'var(--sh-text-3xl)',
            fontWeight: 'var(--sh-weight-extrabold)',
            color: 'var(--sh-slate-900)',
            fontFamily: 'var(--sh-font-heading)',
            letterSpacing: '-0.02em',
          }}
        >
          {loading ? '—' : value}
        </span>
        {trend && (
          <span
            style={{
              fontSize: 'var(--sh-text-xs)',
              fontWeight: 'var(--sh-weight-bold)',
              color: trend.isPositive ? 'var(--sh-success-600)' : 'var(--sh-danger-600)',
            }}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{ margin: 0, fontSize: 'var(--sh-text-xs)', color: 'var(--sh-slate-500)', fontWeight: 'var(--sh-weight-medium)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
