import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationDropdown from '../components/NotificationDropdown';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus,
  ShieldCheck,
  MessageSquareWarning, 
  Wrench, 
  WalletCards,
  Receipt,
  PieChart,
  UserCheck,
  AlertTriangle,
  CalendarDays,
  Vote,
  FileText,
  BarChart3,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  Search
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Residents', path: '/admin/residents', icon: Users },
    { name: 'Registration Requests', path: '/admin/registration-requests', icon: UserPlus },
    { name: 'Security Staff', path: '/admin/staff', icon: ShieldCheck },
    { name: 'Complaints', path: '/admin/complaints', icon: MessageSquareWarning },
    { name: 'Repairs & Maintenance', path: '/admin/repairs', icon: Wrench },
    { name: 'Maintenance & Fees', path: '/admin/bills', icon: WalletCards },
    { name: 'Payments', path: '/admin/payments', icon: Receipt },
    { name: 'Finance', path: '/admin/finance', icon: PieChart },
    { name: 'Visitors', path: '/admin/visitors', icon: UserCheck },
    { name: 'Community Issues', path: '/admin/issues', icon: AlertTriangle },
    { name: 'Events', path: '/admin/events', icon: CalendarDays },
    { name: 'Voting', path: '/admin/voting', icon: Vote },
    { name: 'Documents', path: '/admin/documents', icon: FileText },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Profile', path: '/admin/profile', icon: User },
  ];

  const getPageTitle = () => {
    const item = menuItems.find(i => {
      if (i.path === '/admin' && location.pathname !== '/admin') return false;
      return location.pathname.startsWith(i.path);
    });
    return item ? item.name : 'Dashboard';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '260px' : '0',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        position: 'fixed',
        zIndex: 40,
        height: '100%',
        backgroundColor: '#0f172a',
        color: 'white',
        transition: 'transform 0.3s ease-in-out, width 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
        '@media (min-width: 1024px)': {
          position: 'static',
          width: '260px',
          transform: 'none'
        }
      }} className="sidebar">
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>S</div>
            SocietyHub
          </h2>
          <button className="lg-hidden" onClick={() => setSidebarOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                padding: '10px 24px',
                color: isActive ? 'white' : '#94a3b8',
                textDecoration: 'none',
                backgroundColor: isActive ? '#1e293b' : 'transparent',
                borderRight: isActive ? '3px solid #10b981' : '3px solid transparent',
                transition: 'all 0.2s',
                gap: '12px',
                fontWeight: isActive ? '600' : '400',
                fontSize: '0.9rem'
              })}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={18} color={location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin') ? '#10b981' : '#64748b'} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #1e293b' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px',
              backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer',
              fontWeight: '600', transition: 'background 0.2s', borderRadius: '6px', fontSize: '0.9rem'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar */}
        <header style={{
          backgroundColor: 'white',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button className="lg-hidden" onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <Menu size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>
              {getPageTitle()}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ position: 'relative', display: 'none' }} className="md-flex">
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search..." 
                style={{ padding: '10px 16px 10px 40px', borderRadius: '9999px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.875rem', width: '250px', outline: 'none' }} 
              />
            </div>

            <NotificationDropdown userRole="Admin" />
            
            <div style={{ height: '32px', width: '1px', backgroundColor: '#e2e8f0' }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/admin/profile')}>
              <div style={{ textAlign: 'right', display: 'none', flexDirection: 'column' }} className="sm-flex">
                <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#0f172a' }}>{user?.name}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Admin / Secretary</span>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>
        {`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
          @media (min-width: 1024px) {
            .lg-hidden { display: none !important; }
            .sidebar { position: static !important; width: 260px !important; transform: none !important; }
          }
          @media (min-width: 768px) { .md-flex { display: flex !important; } }
          @media (min-width: 640px) { .sm-flex { display: flex !important; } }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}
      </style>
    </div>
  );
};

export default AdminLayout;
