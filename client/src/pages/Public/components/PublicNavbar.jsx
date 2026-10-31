import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { usePublicTheme } from '../../../context/PublicThemeContext';
import {
  Building2,
  Menu,
  X,
  LayoutDashboard,
  ChevronDown,
  Users,
  UserPlus,
  Sun,
  Moon
} from 'lucide-react';
import Badge from '../../../components/ui/Badge';

const PublicNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useContext(AuthContext);
  const { theme, isDark, toggleTheme } = usePublicTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginActive = location.pathname === '/login';
  const isJoinActive = location.pathname === '/join-society';
  const isRegisterActive = location.pathname === '/register-society';
  const isGetStartedActive = isJoinActive || isRegisterActive;

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setGetStartedOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setGetStartedOpen(false);
      }
    };

    if (getStartedOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [getStartedOpen]);

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'SecurityStaff') return '/staff';
    return '/resident';
  };

  const getRoleLabel = () => {
    if (!user) return '';
    if (user.role === 'Admin') return 'Admin';
    if (user.role === 'SecurityStaff') return 'Gate Staff';
    return 'Resident';
  };

  const getDesktopNavLinkStyle = ({ isActive }) => ({
    fontSize: '16px',
    fontWeight: isActive ? '600' : '500',
    color: isActive
      ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
      : (isDark ? 'var(--pub-text-secondary)' : 'var(--pub-text-secondary)'),
    backgroundColor: isActive
      ? (isDark ? 'rgba(77, 226, 193, 0.12)' : 'rgba(16, 185, 129, 0.1)')
      : 'transparent',
    border: isActive
      ? (isDark ? '1px solid rgba(77, 226, 193, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)')
      : '1px solid transparent',
    padding: '7px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 180ms ease',
    display: 'inline-flex',
    alignItems: 'center'
  });

  const getMobileNavLinkStyle = ({ isActive }) => ({
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: isActive ? '600' : '500',
    color: isActive
      ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
      : (isDark ? 'var(--pub-text-primary)' : 'var(--pub-text-primary)'),
    backgroundColor: isActive
      ? (isDark ? 'rgba(77, 226, 193, 0.12)' : 'rgba(16, 185, 129, 0.1)')
      : 'transparent',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'block',
    transition: 'all 180ms ease'
  });

  const handleSelectJoin = () => {
    setGetStartedOpen(false);
    navigate('/join-society');
  };

  const handleSelectRegister = () => {
    setGetStartedOpen(false);
    navigate('/register-society');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        maxWidth: '100vw',
        backgroundColor: 'var(--pub-nav-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--pub-border-subtle)',
        boxShadow: isDark
          ? '0 4px 20px -2px rgba(0, 0, 0, 0.5)'
          : '0 2px 10px -1px rgba(0, 0, 0, 0.05)',
        transition: 'background-color 250ms ease, border-color 250ms ease, box-shadow 250ms ease'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 clamp(14px, 3vw, 24px)',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box'
        }}
      >
        {/* Left Side: Brand Logo and Wordmark */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            outline: 'none',
            flexShrink: 0
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark
                ? '0 0 16px rgba(16, 185, 129, 0.45)'
                : '0 2px 6px rgba(16, 185, 129, 0.3)',
              color: '#ffffff',
              border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : 'none'
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  letterSpacing: '-0.02em',
                  display: 'block',
                  lineHeight: 1.15
                }}
              >
                SocietyHub
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '600',
                color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'block'
              }}
            >
              Smart Community
            </span>
          </div>
        </Link>

        {/* Center Navigation Links (Home, Features, About, Contact, Feedback) */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '6px'
          }}
          className="sh-desktop-nav"
        >
          <NavLink to="/" end style={getDesktopNavLinkStyle}>
            Home
          </NavLink>
          <NavLink to="/features" style={getDesktopNavLinkStyle}>
            Features
          </NavLink>
          <NavLink to="/about" style={getDesktopNavLinkStyle}>
            About
          </NavLink>
          <NavLink to="/contact" style={getDesktopNavLinkStyle}>
            Contact
          </NavLink>
          <NavLink to="/feedback" style={getDesktopNavLinkStyle}>
            Feedback
          </NavLink>
        </nav>

        {/* Right Side Actions: Theme Toggle, Login Portal, Get Started Dropdown */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '12px'
          }}
          className="sh-desktop-actions"
        >
          {/* Theme Toggle Button */}
          <button
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              border: '1px solid var(--pub-border-subtle)',
              color: isDark ? '#F5BB45' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease'
            }}
            className="sh-btn-luxury"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Badge variant="success" withDot size="sm">
                {getRoleLabel()}
              </Badge>
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                style={{
                  height: '44px',
                  padding: '0 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 18px rgba(16, 185, 129, 0.35)',
                  transition: 'all 200ms ease'
                }}
                className="sh-btn-luxury"
              >
                <LayoutDashboard size={16} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          ) : (
            <>
              {/* Login Portal Button */}
              <Link
                to="/login"
                id="public-nav-login-btn"
                style={{
                  height: '44px',
                  padding: '0 16px',
                  fontSize: '15px',
                  fontWeight: isLoginActive ? '600' : '500',
                  color: isLoginActive
                    ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
                    : 'var(--pub-text-primary)',
                  backgroundColor: isLoginActive
                    ? (isDark ? 'rgba(77, 226, 193, 0.14)' : 'rgba(16, 185, 129, 0.12)')
                    : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                  border: isLoginActive
                    ? (isDark ? '1px solid rgba(77, 226, 193, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                    : '1px solid var(--pub-border-subtle)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 200ms ease',
                  boxShadow: isLoginActive
                    ? (isDark ? '0 0 16px rgba(77, 226, 193, 0.2)' : '0 0 12px rgba(16, 185, 129, 0.15)')
                    : 'none'
                }}
                className="sh-btn-luxury"
              >
                Login Portal
              </Link>

              {/* Get Started Dropdown */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  id="get-started-dropdown-trigger"
                  aria-haspopup="true"
                  aria-expanded={getStartedOpen}
                  onClick={() => setGetStartedOpen(!getStartedOpen)}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: isGetStartedActive ? '1px solid #6EE7B7' : 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isGetStartedActive
                      ? '0 0 24px rgba(16, 185, 129, 0.5)'
                      : '0 0 20px rgba(16, 185, 129, 0.35)',
                    transition: 'all 200ms ease'
                  }}
                  className="sh-btn-luxury"
                >
                  <span>Get Started</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: getStartedOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 200ms ease'
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {getStartedOpen && (
                  <div
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="get-started-dropdown-trigger"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      minWidth: '270px',
                      backgroundColor: 'var(--pub-bg-glass-card)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid var(--pub-border-subtle)',
                      borderRadius: '14px',
                      boxShadow: 'var(--pub-card-shadow)',
                      padding: '8px',
                      zIndex: 100,
                      animation: 'fadeInMenu 0.15s ease-out'
                    }}
                  >
                    {/* Item 1: Join Existing Society */}
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      onClick={handleSelectJoin}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectJoin();
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isJoinActive
                          ? (isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)')
                          : '1px solid transparent',
                        backgroundColor: isJoinActive
                          ? (isDark ? 'rgba(77, 226, 193, 0.12)' : 'rgba(16, 185, 129, 0.1)')
                          : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 150ms ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isJoinActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isJoinActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onFocus={(e) => {
                        if (!isJoinActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
                      }}
                      onBlur={(e) => {
                        if (!isJoinActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: 'var(--pub-accent-emerald)',
                          border: isDark ? '1px solid rgba(77, 226, 193, 0.2)' : '1px solid #A7F3D0'
                        }}
                      >
                        <Users size={18} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: isJoinActive ? '700' : '600',
                            color: isJoinActive
                              ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
                              : 'var(--pub-text-primary)'
                          }}
                        >
                          Join Existing Society
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--pub-text-muted)' }}>
                          For residents, owners & tenants
                        </div>
                      </div>
                    </button>

                    {/* Item 2: Register a New Society */}
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={0}
                      onClick={handleSelectRegister}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectRegister();
                        }
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isRegisterActive
                          ? (isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)')
                          : '1px solid transparent',
                        backgroundColor: isRegisterActive
                          ? (isDark ? 'rgba(77, 226, 193, 0.12)' : 'rgba(16, 185, 129, 0.1)')
                          : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginTop: '4px',
                        transition: 'background-color 150ms ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isRegisterActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isRegisterActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      onFocus={(e) => {
                        if (!isRegisterActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';
                      }}
                      onBlur={(e) => {
                        if (!isRegisterActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: isDark ? 'rgba(77, 226, 193, 0.15)' : '#F0FDF4',
                          border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid #BBF7D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)'
                        }}
                      >
                        <UserPlus size={18} />
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--pub-text-primary)'
                          }}
                        >
                          Register a New Society
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--pub-text-muted)' }}>
                          For management committees & RWA
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mobile Controls (Theme Toggle & Hamburger) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} className="sh-mobile-toggle-group">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              border: '1px solid var(--pub-border-subtle)',
              color: isDark ? '#F5BB45' : '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            className="sh-mobile-theme-btn"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid var(--pub-border-subtle)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
              color: 'var(--pub-text-primary)',
              cursor: 'pointer',
              padding: 0
            }}
            className="sh-mobile-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--pub-bg-surface)',
            borderBottom: '1px solid var(--pub-border-subtle)',
            padding: '16px 20px 24px',
            boxShadow: 'var(--pub-card-shadow)'
          }}
          className="sh-mobile-menu"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              style={getMobileNavLinkStyle}
            >
              Home
            </NavLink>
            <NavLink
              to="/features"
              onClick={() => setMobileMenuOpen(false)}
              style={getMobileNavLinkStyle}
            >
              Features
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              style={getMobileNavLinkStyle}
            >
              About
            </NavLink>
            <NavLink
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              style={getMobileNavLinkStyle}
            >
              Contact
            </NavLink>
            <NavLink
              to="/feedback"
              onClick={() => setMobileMenuOpen(false)}
              style={getMobileNavLinkStyle}
            >
              Feedback
            </NavLink>
          </div>

          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid var(--pub-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(getDashboardPath());
                }}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LayoutDashboard size={17} />
                <span>Go to {getRoleLabel()} Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  id="mobile-nav-login-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  style={{
                    width: '100%',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: isLoginActive ? '600' : '500',
                    color: isLoginActive
                      ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
                      : 'var(--pub-text-primary)',
                    backgroundColor: isLoginActive
                      ? (isDark ? 'rgba(77, 226, 193, 0.14)' : 'rgba(16, 185, 129, 0.12)')
                      : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9'),
                    border: isLoginActive
                      ? (isDark ? '1px solid rgba(77, 226, 193, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                      : '1px solid var(--pub-border-subtle)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 180ms ease'
                  }}
                >
                  Login Portal
                </button>
                <button
                  type="button"
                  id="mobile-nav-join-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/join-society');
                  }}
                  style={{
                    width: '100%',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: isJoinActive ? '600' : '500',
                    color: isJoinActive
                      ? (isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)')
                      : 'var(--pub-text-primary)',
                    backgroundColor: isJoinActive
                      ? (isDark ? 'rgba(77, 226, 193, 0.14)' : 'rgba(16, 185, 129, 0.12)')
                      : (isDark ? 'rgba(13, 22, 41, 0.6)' : '#FFFFFF'),
                    border: isJoinActive
                      ? (isDark ? '1px solid rgba(77, 226, 193, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)')
                      : '1px solid var(--pub-border-subtle)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 180ms ease'
                  }}
                >
                  <Users size={16} />
                  <span>Join Existing Society</span>
                </button>
                <button
                  type="button"
                  id="mobile-nav-register-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register-society');
                  }}
                  style={{
                    width: '100%',
                    height: '44px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: isRegisterActive ? '1px solid #6EE7B7' : 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isRegisterActive ? '0 0 18px rgba(16, 185, 129, 0.45)' : 'none',
                    transition: 'all 180ms ease'
                  }}
                >
                  <UserPlus size={16} />
                  <span>Register a New Society</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive Styles: Switch at 992px */}
      <style>{`
        @keyframes fadeInMenu {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 992px) {
          .sh-desktop-nav {
            display: flex !important;
          }
          .sh-desktop-actions {
            display: flex !important;
          }
          .sh-mobile-toggle-group {
            display: none !important;
          }
          .sh-mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};

export default PublicNavbar;
