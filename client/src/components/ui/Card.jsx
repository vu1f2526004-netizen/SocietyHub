import React from 'react';

/**
 * SocietyHub Standard Card Component
 * Surface container with predictable padding, borders, shadows, and optional header/footer.
 */
const Card = ({
  children,
  title,
  subtitle,
  action,
  footer,
  padding = 'md', // 'none' | 'sm' | 'md' | 'lg'
  hoverable = false,
  accentColor,
  onClick,
  style = {},
  className = '',
  ...props
}) => {
  const getPaddingStyle = () => {
    switch (padding) {
      case 'none': return '0px';
      case 'sm': return 'var(--sh-space-3)'; // 12px
      case 'lg': return 'var(--sh-space-6)'; // 24px
      case 'md':
      default: return 'var(--sh-space-5)'; // 20px
    }
  };

  const pad = getPaddingStyle();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--sh-white)',
        borderRadius: 'var(--sh-radius-lg)',
        border: '1px solid var(--sh-slate-200)',
        borderLeft: accentColor ? `4px solid ${accentColor}` : '1px solid var(--sh-slate-200)',
        boxShadow: 'var(--sh-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform var(--sh-transition-base), box-shadow var(--sh-transition-base)',
        ...style,
      }}
      onMouseOver={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--sh-shadow-md)';
        }
      }}
      onMouseOut={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--sh-shadow-sm)';
        }
      }}
      className={className}
      {...props}
    >
      {/* Header if title, subtitle or action provided */}
      {(title || subtitle || action) && (
        <div
          style={{
            padding: `${pad} ${pad} var(--sh-space-3) ${pad}`,
            borderBottom: '1px solid var(--sh-slate-100)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div>
            {title && (
              <h3 style={{ margin: 0, fontSize: 'var(--sh-text-lg)', fontWeight: 'var(--sh-weight-bold)', color: 'var(--sh-slate-900)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ margin: '4px 0 0 0', fontSize: 'var(--sh-text-sm)', color: 'var(--sh-slate-500)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}

      {/* Body Content */}
      <div style={{ padding: pad, flex: 1 }}>
        {children}
      </div>

      {/* Optional Footer */}
      {footer && (
        <div
          style={{
            padding: `var(--sh-space-3) ${pad}`,
            backgroundColor: 'var(--sh-slate-50)',
            borderTop: '1px solid var(--sh-slate-200)',
            fontSize: 'var(--sh-text-xs)',
            color: 'var(--sh-slate-600)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

export const CardHeader = ({ children, style = {}, className = '', ...props }) => (
  <div
    style={{
      padding: 'var(--sh-space-5) var(--sh-space-5) var(--sh-space-3) var(--sh-space-5)',
      borderBottom: '1px solid var(--sh-slate-100)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, style = {}, className = '', ...props }) => (
  <h3
    style={{
      margin: 0,
      fontFamily: 'var(--sh-font-heading)',
      fontSize: 'var(--sh-text-lg)',
      fontWeight: 'var(--sh-weight-bold)',
      color: 'var(--sh-slate-900)',
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, style = {}, className = '', ...props }) => (
  <p
    style={{
      margin: 0,
      fontSize: 'var(--sh-text-sm)',
      color: 'var(--sh-slate-500)',
      lineHeight: 1.5,
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </p>
);

export const CardContent = ({ children, style = {}, className = '', ...props }) => (
  <div
    style={{
      padding: 'var(--sh-space-5)',
      flex: 1,
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter = ({ children, style = {}, className = '', ...props }) => (
  <div
    style={{
      padding: 'var(--sh-space-3) var(--sh-space-5)',
      backgroundColor: 'var(--sh-slate-50)',
      borderTop: '1px solid var(--sh-slate-200)',
      fontSize: 'var(--sh-text-xs)',
      color: 'var(--sh-slate-600)',
      ...style
    }}
    className={className}
    {...props}
  >
    {children}
  </div>
);

export default Card;

