import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatErrorMessage } from '../utils/formatError';
import PublicNavbar from './Public/components/PublicNavbar';
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import societyLoginImg from '../assets/society-login.jpg';

const ROLE_TABS = [
  { id: 'Admin', label: 'Admin / Secretary', icon: ShieldCheck, placeholder: 'admin@society.com' },
  { id: 'Resident', label: 'Resident', icon: Users, placeholder: 'resident@society.com' },
  { id: 'SecurityStaff', label: 'Security Staff', icon: Building2, placeholder: 'staff@society.com' }
];

const Login = () => {
  const location = useLocation();
  const { login, user } = useContext(AuthContext);
  const { theme, isDark } = useTheme();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('Admin');
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.successMessage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Resident') navigate('/resident');
      else if (user.role === 'SecurityStaff') navigate('/staff');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    // Synchronously block duplicate submissions from double clicks or enter key presses
    if (isSubmittingRef.current || isSubmitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter both email and password.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await login(trimmedEmail, password, selectedRole);
    } catch (err) {
      const status = err.response?.status;
      const defaultMsg = status === 429
        ? 'Too many login attempts. Please wait a few moments before trying again.'
        : 'Invalid credentials or login failed. Please check your email and password.';
      const errorMsg = formatErrorMessage(err, defaultMsg);
      setError(errorMsg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const currentRoleObj = ROLE_TABS.find((r) => r.id === selectedRole) || ROLE_TABS[0];

  return (
    <div
      className={`sh-public-site ${isDark ? 'sh-dark' : 'sh-light'}`}
      data-theme={theme}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--sh-font-sans)',
        backgroundColor: 'var(--pub-bg-main)',
        color: 'var(--pub-text-primary)',
        overflowX: 'hidden',
        width: '100%',
        transition: 'background-color 250ms ease, color 250ms ease'
      }}
    >
      {/* Shared Public Navbar */}
      <PublicNavbar />

      {/* Main Split Screen Container */}
      <div className="sh-auth-container">
        <div
          className="sh-auth-card-grid"
          style={{
            backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
            border: '1px solid var(--pub-border-subtle)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.1)'
              : 'var(--pub-card-shadow)'
          }}
        >
          {/* LEFT PANEL: Residential Visual & Floating Information Badges */}
          <div
            className="sh-auth-image-column"
            style={{
              backgroundColor: isDark ? '#050B1B' : '#F8FAFC'
            }}
          >
            {/* Visual Image with Floating Animation */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden'
              }}
            >
              <img
                src={societyLoginImg}
                alt="Luxury Indian residential community clubhouse and entrance lobby"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                className="sh-float-auth-image"
                loading="eager"
              />
              {/* Rich Vignette Gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isDark
                    ? 'linear-gradient(180deg, rgba(5, 11, 27, 0.45) 0%, rgba(5, 11, 27, 0.85) 100%)'
                    : 'linear-gradient(180deg, rgba(15, 23, 42, 0.25) 0%, rgba(15, 23, 42, 0.82) 100%)'
                }}
              />
            </div>

            {/* Top Pill on Image */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(5, 11, 27, 0.75)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(77, 226, 193, 0.3)',
                  color: '#4DE2C1',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              >
                <Sparkles size={14} />
                <span>SocietyHub Unified Access</span>
              </div>
            </div>

            {/* Bottom Glassmorphism Hero Message */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  backgroundColor: 'rgba(13, 22, 41, 0.82)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--sh-font-heading)',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#ffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3
                  }}
                >
                  Your Entire Community, Connected in One Place.
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#CBD5E1',
                    margin: '0 0 16px 0'
                  }}
                >
                  Secure visitor clearances, automated maintenance billing, transparent society finances,
                  and official communication through authenticated portals.
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#6EE7B7',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}
                  >
                    <ShieldCheck size={13} />
                    Verified Portals
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 187, 69, 0.15)',
                      border: '1px solid rgba(245, 187, 69, 0.35)',
                      color: '#FDE68A',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}
                  >
                    Instant Gate Clearances
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Sign In Form */}
          <div
            style={{
              padding: 'clamp(32px, 4vw, 48px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  border: isDark ? '1px solid rgba(77, 226, 193, 0.25)' : '1px solid #A7F3D0',
                  color: isDark ? '#4DE2C1' : '#059669',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                <span>Authenticated Portal Access</span>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: 'clamp(24px, 2.5vw, 30px)',
                  fontWeight: '700',
                  color: 'var(--sh-slate-900)',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em'
                }}
              >
                Sign In to SocietyHub
              </h2>
              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--sh-slate-500)',
                  margin: 0,
                  lineHeight: 1.5
                }}
              >
                Select your community role and enter your verified credentials.
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--sh-slate-700)',
                  marginBottom: '8px'
                }}
              >
                Portal Role
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  backgroundColor: isDark ? '#050B1B' : '#F1F5F9',
                  padding: '4px',
                  borderRadius: '12px',
                  border: '1px solid var(--sh-slate-200)'
                }}
              >
                {ROLE_TABS.map((role) => {
                  const isActive = selectedRole === role.id;
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isActive
                          ? isDark
                            ? '#131F38'
                            : '#FFFFFF'
                          : 'transparent',
                        color: isActive
                          ? isDark
                            ? '#4DE2C1'
                            : '#059669'
                          : 'var(--sh-slate-500)',
                        fontSize: '12.5px',
                        fontWeight: isActive ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: isActive ? 'var(--sh-shadow-xs)' : 'none',
                        transition: 'all 150ms ease'
                      }}
                    >
                      <Icon size={14} />
                      <span>{role.id === 'SecurityStaff' ? 'Security' : role.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Success Alert */}
            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  color: '#10B981',
                  fontSize: '13.5px',
                  marginBottom: '20px'
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#EF4444',
                  fontSize: '13.5px',
                  marginBottom: '20px'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{typeof error === 'string' ? error : formatErrorMessage(error)}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--sh-slate-700)',
                    marginBottom: '6px'
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={18}
                    style={{
                      position: 'absolute',
                      top: '13px',
                      left: '14px',
                      color: 'var(--sh-slate-400)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    placeholder={currentRoleObj.placeholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 14px 0 42px',
                      borderRadius: '10px',
                      fontSize: '14.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 150ms ease'
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="login-password"
                    style={{
                      fontSize: '13.5px',
                      fontWeight: '600',
                      color: 'var(--sh-slate-700)'
                    }}
                  >
                    Password
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      top: '13px',
                      left: '14px',
                      color: 'var(--sh-slate-400)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '46px',
                      padding: '0 44px 0 42px',
                      borderRadius: '10px',
                      fontSize: '14.5px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 150ms ease'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--sh-slate-400)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="sh-btn-luxury"
                style={{
                  marginTop: '8px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--sh-primary-500)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  opacity: isSubmitting ? 0.75 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to {selectedRole === 'SecurityStaff' ? 'Security Desk' : `${selectedRole} Portal`}</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Links for Joining and Registering */}
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--sh-slate-200)',
                fontSize: '13.5px',
                color: 'var(--sh-slate-500)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <span>Have a Society Join Code?</span>
                <Link
                  id="login-to-join-society-link"
                  to="/join-society"
                  style={{
                    color: isDark ? '#4DE2C1' : '#059669',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Join Your Society &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>Management Committee or RWA?</span>
                <Link
                  id="login-to-register-society-link"
                  to="/register-society"
                  style={{
                    color: isDark ? '#4DE2C1' : '#059669',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Register New Society &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
