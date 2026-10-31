import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * SocietyHub FormField Component
 * Standard layout wrapper for inputs, selects, and textareas with accessible label,
 * required indicator, helper text, and error states.
 */
const FormField = ({
  label,
  required = false,
  error,
  helperText,
  children,
  id,
  className = '',
  style = {},
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '16px',
        fontFamily: 'var(--sh-font-sans)',
        ...style,
      }}
      className={className}
    >
      {label && (
        <label
          htmlFor={fieldId}
          style={{
            fontSize: 'var(--sh-text-sm)',
            fontWeight: 'var(--sh-weight-semibold)',
            color: error ? 'var(--sh-danger-600)' : 'var(--sh-slate-700)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--sh-danger-500)', fontWeight: 'bold' }} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Clone children to inject id and aria-invalid if appropriate */}
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id: fieldId,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined,
          })
        : children}

      {error ? (
        <div
          id={`${fieldId}-error`}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: 'var(--sh-text-xs)',
            color: 'var(--sh-danger-600)',
            fontWeight: 'var(--sh-weight-medium)',
            marginTop: '2px',
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <div
          id={`${fieldId}-helper`}
          style={{
            fontSize: 'var(--sh-text-xs)',
            color: 'var(--sh-slate-500)',
            marginTop: '2px',
          }}
        >
          {helperText}
        </div>
      ) : null}
    </div>
  );
};

export default FormField;
