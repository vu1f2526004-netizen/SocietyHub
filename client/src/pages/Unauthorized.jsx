import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

const Unauthorized = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'SecurityStaff') return '/staff';
    return '/resident';
  };

  const getRoleLabel = () => {
    if (!user) return 'Guest';
    if (user.role === 'SecurityStaff') return 'Security / Staff';
    return user.role;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
        border: '1px solid #e2e8f0',
        padding: '40px 32px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: '#fef2f2',
          color: '#ef4444',
          marginBottom: '20px'
        }}>
          <ShieldAlert size={36} />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '700',
          color: '#0f172a',
          margin: '0 0 8px 0',
          letterSpacing: '-0.02em'
        }}>
          403 - Access Denied
        </h1>

        <p style={{
          fontSize: '0.95rem',
          color: '#64748b',
          lineHeight: '1.5',
          margin: '0 0 24px 0'
        }}>
          You do not have permission to access this area. SocietyHub enforces strict role separation between Resident, Admin, and Security Staff portals.
        </p>

        {user && (
          <div style={{
            backgroundColor: '#f1f5f9',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#334155',
            marginBottom: '28px',
            textAlign: 'left'
          }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>Signed in as: {user.name}</p>
            <p style={{ margin: 0, color: '#64748b' }}>Assigned Role: <span style={{ fontWeight: '600', color: '#0f172a' }}>{getRoleLabel()}</span></p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => navigate(getDashboardPath())}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <ArrowLeft size={18} />
            <span>Return to {user ? `${getRoleLabel()} Dashboard` : 'Login'}</span>
          </button>

          {user && (
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={16} />
              <span>Sign Out & Switch Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
