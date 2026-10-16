import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    const newToast = { id, type, message, title };

    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const toast = {
    success: (message, title = 'Success') => addToast('success', message, title),
    error: (message, title = 'Error') => addToast('error', message, title),
    warning: (message, title = 'Warning') => addToast('warning', message, title),
    info: (message, title = 'Notice') => addToast('info', message, title),
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: '#f0fdf4',
          border: '#86efac',
          iconColor: '#16a34a',
          titleColor: '#166534',
          textColor: '#15803d',
          Icon: CheckCircle,
        };
      case 'error':
        return {
          bg: '#fef2f2',
          border: '#fca5a5',
          iconColor: '#dc2626',
          titleColor: '#991b1b',
          textColor: '#b91c1c',
          Icon: AlertCircle,
        };
      case 'warning':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          iconColor: '#d97706',
          titleColor: '#92400e',
          textColor: '#b45309',
          Icon: AlertTriangle,
        };
      default:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          iconColor: '#2563eb',
          titleColor: '#1e40af',
          textColor: '#1d4ed8',
          Icon: Info,
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '380px',
          width: 'calc(100vw - 40px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const s = getToastStyles(t.type);
          const Icon = s.Icon;
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: '10px',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                animation: 'slideInRight 0.25s ease-out',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ color: s.iconColor, flexShrink: 0, marginTop: '2px' }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', color: s.titleColor, marginBottom: '2px' }}>
                    {t.title}
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: s.textColor, lineHeight: 1.4, wordBreak: 'break-word' }}>
                  {t.message}
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#475569')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return fallback no-op to avoid crashing if used outside provider
    return {
      success: (msg) => console.log('[Toast Success]', msg),
      error: (msg) => console.error('[Toast Error]', msg),
      warning: (msg) => console.warn('[Toast Warning]', msg),
      info: (msg) => console.info('[Toast Info]', msg),
    };
  }
  return context;
};

export default ToastContext;
