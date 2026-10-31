import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Reusable, accessible data-refresh button used across SocietyHub.
 * Prevents duplicate clicks, provides spinning animation during requests,
 * and maintains consistent styling.
 */
const RefreshButton = ({
  onRefresh,
  onClick,
  refreshing = false,
  loading = false,
  label = 'Refresh',
  title = 'Refresh records',
  size = 'md',
  showLabel = true,
  style = {}
}) => {
  const isBusy = refreshing || loading;

  const handleClick = (e) => {
    e?.preventDefault();
    if (isBusy) return;
    const action = onRefresh || onClick;
    action?.();
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: isSmall ? '6px 10px' : '8px 14px',
        backgroundColor: 'var(--sh-white)',
        border: '1px solid var(--sh-slate-300)',
        borderRadius: '8px',
        fontSize: isSmall ? '0.8rem' : '0.85rem',
        fontWeight: '600',
        color: isBusy ? 'var(--sh-slate-400)' : 'var(--sh-slate-700)',
        cursor: isBusy ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease-in-out',
        boxShadow: 'var(--sh-shadow-xs)',
        ...style
      }}
      onMouseOver={(e) => {
        if (!isBusy) {
          e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)';
          e.currentTarget.style.borderColor = 'var(--sh-slate-400)';
        }
      }}
      onMouseOut={(e) => {
        if (!isBusy) {
          e.currentTarget.style.backgroundColor = 'var(--sh-white)';
          e.currentTarget.style.borderColor = 'var(--sh-slate-300)';
        }
      }}
    >
      <RefreshCw
        size={isSmall ? 13 : 15}
        style={{
          animation: isBusy ? 'spin 1s linear infinite' : 'none',
          flexShrink: 0
        }}
      />
      {showLabel && (
        <span>{isBusy ? 'Refreshing...' : label}</span>
      )}
    </button>
  );
};

export default RefreshButton;
