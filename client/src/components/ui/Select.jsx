import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * SocietyHub Standard Select Component
 * Styled dropdown with custom chevron, accessible keyboard navigation, and error states.
 */
const Select = forwardRef(({
  options = [],
  children,
  size = 'md', // 'sm' | 'md' | 'lg'
  error = false,
  disabled = false,
  fullWidth = true,
  className = '',
  style = {},
  id,
  value,
  ...props
}, ref) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 28px 6px 10px',
          fontSize: 'var(--sh-text-xs)',
          borderRadius: 'var(--sh-radius-sm)',
          chevronSize: 14,
        };
      case 'lg':
        return {
          padding: '12px 36px 12px 16px',
          fontSize: 'var(--sh-text-base)',
          borderRadius: 'var(--sh-radius-lg)',
          chevronSize: 20,
        };
      case 'md':
      default:
        return {
          padding: '9px 32px 9px 12px',
          fontSize: 'var(--sh-text-sm)',
          borderRadius: 'var(--sh-radius-md)',
          chevronSize: 16,
        };
    }
  };

  const s = getSizeStyles();
  const borderColor = error ? 'var(--sh-danger-500)' : 'var(--sh-slate-300)';

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto', display: 'inline-flex', alignItems: 'center' }}>
      <select
        ref={ref}
        id={id}
        value={value}
        disabled={disabled}
        style={{
          width: '100%',
          fontFamily: 'var(--sh-font-sans)',
          color: 'var(--sh-slate-900)',
          backgroundColor: disabled ? 'var(--sh-slate-100)' : 'var(--sh-white)',
          border: `1px solid ${borderColor}`,
          borderRadius: s.borderRadius,
          padding: s.padding,
          fontSize: s.fontSize,
          outline: 'none',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          transition: 'border-color var(--sh-transition-fast), box-shadow var(--sh-transition-fast)',
          boxShadow: 'var(--sh-shadow-xs)',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--sh-danger-600)' : 'var(--sh-primary-500)';
          e.currentTarget.style.boxShadow = error ? 'var(--sh-focus-ring-danger)' : 'var(--sh-focus-ring)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.boxShadow = 'var(--sh-shadow-xs)';
        }}
        className={className}
        {...props}
      >
        {children ||
          options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
      </select>

      <div
        style={{
          position: 'absolute',
          right: size === 'sm' ? '8px' : size === 'lg' ? '14px' : '10px',
          color: 'var(--sh-slate-400)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ChevronDown size={s.chevronSize} />
      </div>
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
