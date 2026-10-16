import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
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
  X 
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div 
        style={{
          width: sidebarOpen ? '280px' : '0',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          position: 'fixed',
          zIndex: 40,
          height: '100%',
          backgroundColor: '#0f172a',
          color: 'white',
          transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 10px rgba(0,0,0,0.1)'
        }}
        className="staff-sidebar"
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', letterSpacing: '0.02em', color: 'white' }}>SocietyHub</h1>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Security / Staff</span>
            </div>
          </div>
          <button 
            className="staff-mobile-close" 
            onClick={() => setSidebarOpen(false)} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/staff'}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                backgroundColor: isActive ? '#1e293b' : 'transparent',
                color: isActive ? '#60a5fa' : '#cbd5e1',
                fontWeight: isActive ? '600' : '500',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                transition: 'all 0.15s ease'
              })}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '20px 16px', borderTop: '1px solid #1e293b' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px 16px', 
              backgroundColor: 'transparent', 
              color: '#ef4444', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '600', 
              transition: 'background 0.2s' 
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{ 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e2e8f0', 
          padding: '16px 32px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          position: 'sticky', 
          top: 0, 
          zIndex: 30,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="staff-menu-btn" 
              onClick={() => setSidebarOpen(true)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              <Menu size={24} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
              {getPageTitle()}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationDropdown userRole="SecurityStaff" />
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} 
              onClick={() => navigate('/staff/profile')}
            >
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="staff-user-label">
                <span style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>{user?.name || 'Staff Member'}</span>
                <span style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Security Staff</span>
              </div>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      <style>
        {`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          @media (min-width: 1024px) {
            .staff-menu-btn { display: none !important; }
            .staff-mobile-close { display: none !important; }
            .staff-sidebar {
              position: static !important;
              width: 280px !important;
              transform: none !important;
            }
          }
          @media (max-width: 640px) {
            .staff-user-label { display: none !important; }
          }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}
      </style>
    </div>
  );
};

export default StaffLayout;
