import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import ThemeToggle from '../components/shared/ThemeToggle';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  UserCheck, 
  CheckSquare, 
  AlertTriangle, 
  Car, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X,
  Building2,
  ChevronRight
} from 'lucide-react';

const StaffLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/staff', label: 'Gate Dashboard', icon: LayoutDashboard },
    { path: '/staff/visitors', label: 'Expected Visitors', icon: UserCheck },
    { path: '/staff/tasks', label: 'My Tasks', icon: CheckSquare },
    { path: '/staff/incidents', label: 'Incident Reports', icon: AlertTriangle },
    { path: '/staff/parking', label: 'Parking Observations', icon: Car },
    { path: '/staff/notifications', label: 'Notifications', icon: Bell },
    { path: '/staff/profile', label: 'Profile', icon: User },
  ];

  const getPageTitle = () => {
    const item = navItems.find(i => {
      if (i.path === '/staff' && location.pathname !== '/staff') return false;
      return location.pathname.startsWith(i.path);
    });
    return item ? item.label : 'Gate Operations';
  };

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      backgroundColor: 'var(--sh-slate-50)', 
      color: 'var(--sh-slate-900)',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      transition: 'background-color 0.2s ease, color 0.2s ease'
    }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 11, 27, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 45
          }}
          className="lg-hidden"
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{
          width: '272px',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          backgroundColor: '#070D1D',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }} 
        className="portal-sidebar"
      >
        {/* Brand header */}
        <div style={{ 
          padding: '22px 20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#FFFFFF', 
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                SocietyHub
                <span style={{ 
                  fontSize: '0.62rem', 
                  fontWeight: '700', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  backgroundColor: 'rgba(37, 99, 235, 0.2)', 
                  color: '#60A5FA',
                  border: '1px solid rgba(37, 99, 235, 0.35)',
                  letterSpacing: '0.04em'
                }}>
                  SECURITY
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={11} style={{ color: '#60A5FA' }} />
                <span>Main Gate Terminal</span>
              </div>
            </div>
          </div>
          <button 
            className="lg-hidden" 
            onClick={() => setSidebarOpen(false)} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: 'none', 
              color: '#94A3B8', 
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Navigation items */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/staff'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '11px 14px',
                borderRadius: '8px',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                textDecoration: 'none',
                background: isActive 
                  ? 'linear-gradient(90deg, rgba(37, 99, 235, 0.22) 0%, rgba(37, 99, 235, 0.05) 100%)' 
                  : 'transparent',
                borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                transition: 'all 0.18s ease',
                gap: '12px',
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.88rem'
              })}
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} color={isActive ? '#60A5FA' : '#64748B'} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {isActive && <ChevronRight size={14} color="#60A5FA" style={{ opacity: 0.8 }} />}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* User bar / Logout */}
        <div style={{ 
          padding: '16px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              width: '100%', 
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              color: '#F87171', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              cursor: 'pointer',
              fontWeight: '600', 
              transition: 'all 0.2s', 
              borderRadius: '8px', 
              fontSize: '0.85rem'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: 0,
        marginLeft: 0,
        transition: 'margin-left 0.25s ease'
      }} className="portal-main-content">
        {/* Top Navbar */}
        <header 
          className="portal-header"
          style={{
            backgroundColor: 'var(--sh-white)',
            padding: '14px 28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--sh-slate-200)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            transition: 'background-color 0.2s ease, border-color 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="lg-hidden" 
              onClick={() => setSidebarOpen(true)} 
              style={{ 
                background: 'transparent', 
                border: '1px solid var(--sh-slate-200)', 
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer', 
                color: 'var(--sh-slate-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--sh-slate-900)', letterSpacing: '-0.01em' }}>
                {getPageTitle()}
              </h1>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ThemeToggle />

            <NotificationDropdown userRole="SecurityStaff" />
            
            <div style={{ height: '28px', width: '1px', backgroundColor: 'var(--sh-slate-200)' }}></div>
            
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'background-color 0.15s ease'
              }} 
              onClick={() => navigate('/staff/profile')}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ textAlign: 'right', display: 'none', flexDirection: 'column' }} className="sm-flex">
                <span style={{ fontWeight: '600', fontSize: '0.86rem', color: 'var(--sh-slate-900)', lineHeight: 1.2 }}>{user?.name || 'Gate Officer'}</span>
                <span style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: '600' }}>Security Staff</span>
              </div>
              <div style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '50%', 
                backgroundColor: 'rgba(37, 99, 235, 0.12)', 
                color: '#2563EB', 
                border: '2px solid rgba(37, 99, 235, 0.3)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: '700',
                fontSize: '0.9rem'
              }}>
                {user?.name?.charAt(0).toUpperCase() || 'G'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <style>
        {`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          .sm-flex { display: none !important; }
          @media (min-width: 1024px) {
            .lg-hidden { display: none !important; }
            .portal-sidebar { 
              position: sticky !important; 
              transform: none !important; 
            }
          }
          @media (min-width: 640px) { .sm-flex { display: flex !important; } }
          @media (max-width: 640px) {
            .portal-header { padding: 12px 16px !important; }
            .portal-main-content main { padding: 20px 16px !important; }
          }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
        `}
      </style>
    </div>
  );
};

export default StaffLayout;
