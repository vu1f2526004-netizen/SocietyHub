import React, { forwardRef } from 'react';

/**
 * SocietyHub Standard Textarea Component
 * Multi-line input with accessible focus outlines, error borders, and customizable resize behavior.
 */
const Textarea = forwardRef(({
  rows = 3,
  error = false,
  disabled = false,
  fullWidth = true,
  resize = 'vertical',
  className = '',
  style = {},
  id,
  value,
  ...props
}, ref) => {
  const borderColor = error ? 'var(--sh-danger-500)' : 'var(--sh-slate-300)';

  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      value={value}
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--sh-font-sans)',
        color: 'var(--sh-slate-900)',
        backgroundColor: disabled ? 'var(--sh-slate-100)' : 'var(--sh-white)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--sh-radius-md)',
        padding: '10px 12px',
        fontSize: 'var(--sh-text-sm)',
        lineHeight: 'var(--sh-leading-normal)',
        outline: 'none',
        boxSizing: 'border-box',
        resize: resize,
        cursor: disabled ? 'not-allowed' : 'text',
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
    />
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
