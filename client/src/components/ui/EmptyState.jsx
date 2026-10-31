import React from 'react';
import { SearchX } from 'lucide-react';

/**
 * SocietyHub Standard EmptyState Component
 * Consistent feedback for empty tables, search results, and filters.
 */
const EmptyState = ({
  icon = SearchX,
  title = 'No records found',
  description = 'There are no items matching your criteria. Try adjusting your search query or filters.',
  action,
  bordered = true,
  style = {},
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon;
      return <IconComp size={28} />;
    }
    return null;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--sh-space-12) var(--sh-space-6)',
        backgroundColor: 'var(--sh-white)',
        borderRadius: 'var(--sh-radius-lg)',
        border: bordered ? '1px solid var(--sh-slate-200)' : 'none',
        ...style,
      }}
      className={className}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--sh-slate-100)',
          color: 'var(--sh-slate-400)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--sh-space-4)',
        }}
      >
        {renderIcon()}
      </div>

      <h3
        style={{
          margin: '0 0 var(--sh-space-2) 0',
          fontSize: 'var(--sh-text-lg)',
          fontWeight: 'var(--sh-weight-bold)',
          color: 'var(--sh-slate-800)',
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            margin: '0 0 var(--sh-space-6) 0',
            fontSize: 'var(--sh-text-sm)',
            color: 'var(--sh-slate-500)',
            maxWidth: '440px',
            lineHeight: 'var(--sh-leading-normal)',
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
