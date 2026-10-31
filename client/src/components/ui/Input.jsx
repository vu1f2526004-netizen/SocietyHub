import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';

/**
 * SocietyHub Standard Input Component
 * Supports accessible focus states, leading/trailing icons, clearable trigger,
 * password toggle, and size variations.
 */
const Input = forwardRef(({
  type = 'text',
  size = 'md', // 'sm' | 'md' | 'lg'
  icon,
  endIcon,
  onClear,
  error = false,
  disabled = false,
  fullWidth = true,
  className = '',
  style = {},
  value,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 10px',
          fontSize: 'var(--sh-text-xs)',
          borderRadius: 'var(--sh-radius-sm)',
          iconPaddingLeft: icon ? '30px' : '10px',
          iconPaddingRight: (isPassword || onClear || endIcon) ? '30px' : '10px',
          iconSize: 14,
        };
      case 'lg':
        return {
          padding: '12px 16px',
          fontSize: 'var(--sh-text-base)',
          borderRadius: 'var(--sh-radius-lg)',
          iconPaddingLeft: icon ? '44px' : '16px',
          iconPaddingRight: (isPassword || onClear || endIcon) ? '44px' : '16px',
          iconSize: 20,
        };
      case 'md':
      default:
        return {
          padding: '9px 12px',
          fontSize: 'var(--sh-text-sm)',
          borderRadius: 'var(--sh-radius-md)',
          iconPaddingLeft: icon ? '36px' : '12px',
          iconPaddingRight: (isPassword || onClear || endIcon) ? '36px' : '12px',
          iconSize: 16,
        };
    }
  };

  const s = getSizeStyles();
  const borderColor = error ? 'var(--sh-danger-500)' : 'var(--sh-slate-300)';

  const renderLeadingIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComp = icon;
      return <IconComp size={s.iconSize} />;
    }
    return null;
  };

  const renderTrailingIcon = () => {
    if (!endIcon) return null;
    if (React.isValidElement(endIcon)) return endIcon;
    if (typeof endIcon === 'function' || (typeof endIcon === 'object' && endIcon !== null)) {
      const IconComp = endIcon;
      return <IconComp size={s.iconSize} />;
    }
    return null;
  };

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto', display: 'inline-flex', alignItems: 'center' }}>
      {icon && (
        <div
          style={{
            position: 'absolute',
            left: size === 'sm' ? '8px' : size === 'lg' ? '14px' : '11px',
            color: error ? 'var(--sh-danger-500)' : 'var(--sh-slate-400)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {renderLeadingIcon()}
        </div>
      )}

      <input
        ref={ref}
        id={id}
        type={effectiveType}
        disabled={disabled}
        value={value}
        style={{
          width: '100%',
          fontFamily: 'var(--sh-font-sans)',
          color: 'var(--sh-slate-900)',
          backgroundColor: disabled ? 'var(--sh-slate-100)' : 'var(--sh-white)',
          border: `1px solid ${borderColor}`,
          borderRadius: s.borderRadius,
          padding: `${s.padding.split(' ')[0]} ${s.iconPaddingRight} ${s.padding.split(' ')[0]} ${s.iconPaddingLeft}`,
          fontSize: s.fontSize,
          outline: 'none',
          boxSizing: 'border-box',
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

      {/* Trailing Icon / Password Toggle / Clear button */}
      <div style={{ position: 'absolute', right: size === 'sm' ? '8px' : size === 'lg' ? '14px' : '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {onClear && value && !disabled && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--sh-slate-400)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--sh-radius-xs)',
            }}
            title="Clear field"
            aria-label="Clear field"
          >
            <X size={s.iconSize} />
          </button>
        )}

        {isPassword && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--sh-slate-400)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--sh-radius-xs)',
            }}
            title={showPassword ? 'Hide password' : 'Show password'}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={s.iconSize} /> : <Eye size={s.iconSize} />}
          </button>
        )}

        {endIcon && !isPassword && !onClear && (
          <div style={{ color: 'var(--sh-slate-400)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            {renderTrailingIcon()}
          </div>
        )}
      </div>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
