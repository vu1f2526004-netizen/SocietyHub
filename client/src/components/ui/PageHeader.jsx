import React from 'react';

/**
 * SocietyHub Standard PageHeader Component
 * Standardizes page titles, subtitles, breadcrumbs, and primary header actions.
 */
const PageHeader = ({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  className = '',
  style = {},
}) => {
  return (
    <div
      style={{
        marginBottom: 'var(--sh-space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...style,
      }}
      className={className}
    >
      {/* Optional Breadcrumbs */}
      {breadcrumbs && (
        <nav aria-label="Breadcrumb" style={{ fontSize: 'var(--sh-text-xs)', color: 'var(--sh-slate-400)' }}>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {idx > 0 && <span style={{ color: 'var(--sh-slate-300)' }}>/</span>}
                {crumb.href ? (
                  <a href={crumb.href} style={{ color: 'var(--sh-slate-500)', textDecoration: 'none' }}>
                    {crumb.label}
                  </a>
                ) : (
                  <span style={{ color: idx === breadcrumbs.length - 1 ? 'var(--sh-slate-700)' : 'var(--sh-slate-500)' }}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Main Row: Title & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--sh-space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'var(--sh-text-2xl)',
                fontWeight: 'var(--sh-weight-bold)',
                color: 'var(--sh-slate-900)',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: 'var(--sh-text-sm)',
                color: 'var(--sh-slate-500)',
                lineHeight: 'var(--sh-leading-normal)',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
