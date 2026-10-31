import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  confirmLabel,
  cancelText = 'Cancel',
  confirmVariant = 'danger', // 'danger' | 'primary'
  variant,
  onConfirm,
  onClose,
  onCancel,
  loading = false,
  children
}) => {
  const handleClose = onClose || onCancel || (() => {});
  const resolvedConfirmText = confirmLabel || confirmText;
  const resolvedVariant = variant || confirmVariant;
  const isDanger = resolvedVariant === 'danger';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          backgroundColor: 'var(--sh-white)',
          borderRadius: '14px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--sh-shadow-lg)',
          border: '1px solid var(--sh-slate-200)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '50%',
              backgroundColor: isDanger ? 'var(--sh-badge-danger-bg, #fee2e2)' : 'var(--sh-badge-info-bg, #dbeafe)',
              color: isDanger ? 'var(--sh-badge-danger-text, #dc2626)' : 'var(--sh-badge-info-text, #2563eb)',
              flexShrink: 0
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                {title}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--sh-slate-400)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>
            {message && (
              <p style={{ margin: children ? '0 0 12px 0' : 0, color: 'var(--sh-slate-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {message}
              </p>
            )}
            {children}
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--sh-slate-100)',
            borderTop: '1px solid var(--sh-slate-200)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid var(--sh-slate-300)',
              backgroundColor: 'var(--sh-white)',
              color: 'var(--sh-slate-700)',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isDanger ? '#dc2626' : '#2563eb',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isDanger ? '0 1px 2px rgba(220, 38, 38, 0.3)' : '0 1px 2px rgba(37, 99, 235, 0.3)'
            }}
          >
            {loading ? 'Processing...' : resolvedConfirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
