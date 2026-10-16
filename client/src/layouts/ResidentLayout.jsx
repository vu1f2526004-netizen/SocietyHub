import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { 
  LayoutDashboard, 
  MessageSquareWarning, 
  WalletCards,
  Receipt,
  Landmark,
  Users,
  CalendarDays,
  Vote,
  AlertTriangle,
  FileText,
  Bell,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';

const ResidentLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/resident', icon: LayoutDashboard },
    { name: 'My Complaints', path: '/resident/complaints', icon: MessageSquareWarning },
    { name: 'Maintenance & Fees', path: '/resident/bills', icon: WalletCards },
    { name: 'Payments', path: '/resident/payments', icon: Receipt },
    { name: 'Society Accounts', path: '/resident/accounts', icon: Landmark },
    { name: 'Visitors', path: '/resident/visitors', icon: Users },
    { name: 'Events', path: '/resident/events', icon: CalendarDays },
    { name: 'Voting', path: '/resident/voting', icon: Vote },
    { name: 'Community Issues', path: '/resident/issues', icon: AlertTriangle },
    { name: 'Documents', path: '/resident/documents', icon: FileText },
    { name: 'Notifications', path: '/resident/notifications', icon: Bell },
    { name: 'Profile', path: '/resident/profile', icon: User },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(i => {
      if (i.path === '/resident' && location.pathname !== '/resident') return false;
      return location.pathname.startsWith(i.path);
    });
    return item ? item.name : 'Dashboard';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '250px' : '0',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        position: 'fixed',
        zIndex: 40,
        height: '100%',
        backgroundColor: '#1e293b',
        color: 'white',
        transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
        '@media (min-width: 768px)': {
          position: 'static',
          width: '260px',
          transform: 'none'
        }
      }} className="sidebar">
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>SocietyHub</h2>
          <button className="md-hidden" onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/resident'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                textDecoration: 'none',
                backgroundColor: isActive ? '#0f172a' : 'transparent',
                borderLeft: isActive ? '4px solid #38bdf8' : '4px solid transparent',
                transition: 'all 0.2s',
                gap: '12px',
                fontWeight: isActive ? '600' : '400'
              })}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px',
              backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer',
              fontWeight: '600', transition: 'background 0.2s', borderRadius: '6px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar */}
        <header style={{
          backgroundColor: 'white',
          padding: '15px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="md-hidden" onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <Menu size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
              {getPageTitle()}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationDropdown userRole="Resident" />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate('/resident/profile')} className="cursor-pointer">
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>{user?.name}</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Flat {user?.flatNumber || 'N/A'}</span>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>
        {`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          .cursor-pointer { cursor: pointer; }
          @media (min-width: 768px) {
            .md-hidden { display: none !important; }
            .sidebar {
              position: static !important;
              width: 260px !important;
              transform: none !important;
            }
          }
          /* Custom scrollbar */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}
      </style>
    </div>
  );
};

export default ResidentLayout;
