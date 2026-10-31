import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { FileQuestion, Home, ArrowLeft, LayoutDashboard, Mail } from 'lucide-react';

const NotFoundPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'SecurityStaff') return '/staff';
    return '/resident';
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(48px, 6vw, 80px) var(--sh-space-6)',
        backgroundColor: 'var(--pub-bg-main)',
        minHeight: '70vh',
        transition: 'background-color 200ms ease'
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            backgroundColor: 'var(--pub-bg-glass-card)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--pub-border-subtle)',
            borderRadius: '20px',
            padding: 'clamp(32px, 4vw, 44px)',
            boxShadow: 'var(--pub-card-shadow)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--pub-accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}
          >
            <FileQuestion size={32} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--pub-border-subtle)',
              color: 'var(--pub-text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '14px'
            }}
          >
            Error 404 • Not Found
          </div>

          <h1
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: '26px',
              fontWeight: '700',
              color: 'var(--pub-text-primary)',
              marginBottom: '10px',
              letterSpacing: '-0.02em'
            }}
          >
            Page Not Found
          </h1>

          <p
            style={{
              fontSize: '14.5px',
              color: 'var(--pub-text-secondary)',
              lineHeight: 1.6,
              marginBottom: '28px'
            }}
          >
            The destination you are looking for doesn't exist, has been removed, or was moved to another location.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {user ? (
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                className="sh-btn-luxury"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--pub-accent-emerald)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <LayoutDashboard size={18} />
                <span>Go to Your Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="sh-btn-luxury"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--pub-accent-emerald)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Home size={18} />
                <span>Back to Home Page</span>
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="sh-btn-luxury"
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--pub-bg-surface)',
                  color: 'var(--pub-text-primary)',
                  border: '1px solid var(--pub-border-subtle)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <ArrowLeft size={16} />
                <span>Go Back</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="sh-btn-luxury"
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--pub-bg-surface)',
                  color: 'var(--pub-text-primary)',
                  border: '1px solid var(--pub-border-subtle)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Mail size={16} />
                <span>Contact Desk</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
