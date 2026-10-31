import React, { useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../../context/AuthContext';
import { usePublicTheme } from '../../../context/PublicThemeContext';
import {
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  Package,
  Receipt,
  CheckCircle2,
  Clock
} from 'lucide-react';
import heroCommunityImg from '../../../assets/society-hero.jpg';

const HeroSection = () => {
  const { user } = useContext(AuthContext);
  const { isDark } = usePublicTheme();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'SecurityStaff') return '/staff';
    return '/resident';
  };

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        padding: 'clamp(52px, 6vw, 84px) var(--sh-space-6) clamp(60px, 7vw, 96px)',
        background: isDark
          ? 'radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(77, 226, 193, 0.05) 0%, transparent 60%), var(--pub-bg-main)'
          : 'radial-gradient(ellipse at 80% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 60%, #F7F9FC 100%)',
        overflow: 'hidden',
        transition: 'background 250ms ease'
      }}
    >
      <div
        style={{
          maxWidth: 'var(--sh-container-xl)',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'clamp(44px, 5vw, 64px)',
          alignItems: 'center'
        }}
        className="sh-hero-grid"
      >
        {/* Left Column: SaaS Value Proposition & Editorial Headline */}
        <div style={{ textAlign: 'left', zIndex: 2 }}>
          {/* Eyebrow Label */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '24px',
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
              color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '20px',
              boxShadow: isDark ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none'
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--pub-accent-emerald)',
                flexShrink: 0,
                boxShadow: '0 0 8px var(--pub-accent-emerald)'
              }}
            />
            <span>Smarter Society Management</span>
          </div>

          {/* Headline with Turquoise / Emerald Gradient Accent */}
          <h1
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(28px, 4.2vw, 56px)',
              fontWeight: '800',
              lineHeight: 1.15,
              color: 'var(--pub-text-primary)',
              letterSpacing: '-0.025em',
              marginBottom: '20px',
              wordBreak: 'break-word',
              overflowWrap: 'break-word'
            }}
          >
            Elevate Your Community.
            <span
              style={{
                display: 'block',
                marginTop: '6px',
                background: 'linear-gradient(135deg, #10B981 0%, #4DE2C1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Simplify Every Day.
            </span>
          </h1>

          {/* Supporting Description */}
          <p
            style={{
              fontSize: 'clamp(17px, 1.4vw, 20px)',
              lineHeight: 1.62,
              color: 'var(--pub-text-secondary)',
              marginBottom: '34px',
              maxWidth: '560px'
            }}
          >
            Manage society residents, maintenance bills, payments, visitor permissions,
            complaints and everyday operations through one connected platform.
          </p>

          {/* Action Button Group */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              marginBottom: '28px'
            }}
          >
            {user ? (
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                style={{
                  height: '48px',
                  padding: '0 26px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
                }}
                className="sh-btn-luxury"
              >
                <LayoutDashboard size={18} />
                <span>Go to Your Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  style={{
                    height: '48px',
                    padding: '0 26px',
                    fontSize: '15.5px',
                    fontWeight: '600',
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 22px rgba(16, 185, 129, 0.38)'
                  }}
                  className="sh-btn-luxury sh-hero-cta-btn"
                >
                  <span>Get Started</span>
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/features')}
                  style={{
                    height: '48px',
                    padding: '0 22px',
                    fontSize: '15.5px',
                    fontWeight: '500',
                    color: 'var(--pub-text-primary)',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                    border: '1px solid var(--pub-border-subtle)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                  className="sh-btn-luxury sh-hero-cta-btn"
                >
                  <span>Explore Features</span>
                  <ArrowRight size={17} />
                </button>
              </>
            )}
          </div>

          {/* Secondary Quick Links for Admins & Residents */}
          {!user && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: 'var(--pub-text-muted)',
                paddingTop: '20px',
                borderTop: '1px solid var(--pub-border-subtle)'
              }}
            >
              <span>
                Secretary or Manager?{' '}
                <Link
                  to="/register-society"
                  style={{
                    color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Register a new society &rarr;
                </Link>
              </span>
              <span style={{ color: 'var(--pub-border-subtle)' }}>•</span>
              <span>
                Moving in?{' '}
                <Link
                  to="/join-society"
                  style={{
                    color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Join existing society &rarr;
                </Link>
              </span>
            </div>
          )}
        </div>

        {/* Right Column: Floating Residential Image & Glassmorphism Panels */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '560px',
            margin: '0 auto',
            paddingTop: '16px',
            paddingBottom: '16px'
          }}
        >
          {/* Main Visual Frame with Gentle Float Animation */}
          <div
            className="sh-float-main"
            style={{
              position: 'relative',
              borderRadius: '20px',
              overflow: 'hidden',
              border: isDark ? '1px solid rgba(77, 226, 193, 0.2)' : '1px solid var(--pub-border-subtle)',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15)'
                : 'var(--pub-card-shadow)',
              backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#F1F5F9'
            }}
          >
            <img
              src={heroCommunityImg}
              alt="Modern residential gated community in India with landscaped towers and secure entrance gate"
              style={{
                width: '100%',
                height: 'auto',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                display: 'block'
              }}
              loading="eager"
            />

            {/* Subtle Gradient Vignette Overlay for Depth */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: isDark
                  ? 'linear-gradient(180deg, rgba(5, 11, 27, 0.1) 0%, rgba(5, 11, 27, 0.45) 100%)'
                  : 'linear-gradient(180deg, rgba(255, 255, 255, 0) 50%, rgba(15, 23, 42, 0.2) 100%)',
                pointerEvents: 'none'
              }}
            />

            {/* Integrated Glassmorphic Bottom Strip: Gate Clearance */}
            <div
              style={{
                position: 'absolute',
                bottom: '14px',
                left: '14px',
                right: '14px',
                backgroundColor: 'var(--pub-bg-glass)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--pub-border-subtle)',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: isDark
                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                  : '0 10px 20px -5px rgba(15, 23, 42, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    border: isDark ? '1px solid rgba(77, 226, 193, 0.25)' : '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pub-accent-emerald)',
                    flexShrink: 0
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--pub-text-primary)',
                      lineHeight: 1.2
                    }}
                  >
                    Digital Gate & Community Access
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--pub-text-muted)', marginTop: '2px' }}>
                    Instant resident authorization & visitor verification
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: isDark ? 'rgba(77, 226, 193, 0.12)' : '#F0FDF4',
                  border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid #BBF7D0',
                  color: isDark ? 'var(--pub-accent-turquoise)' : '#166534',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
                className="sh-hero-badge-desktop"
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--pub-accent-emerald)'
                  }}
                />
                <span>Active Security Protocol</span>
              </div>
            </div>
          </div>

          {/* Floating Glassmorphism Panel 1: Gate Permission (Top-Left Offset) */}
          <div
            className="sh-float-card-1 sh-hero-floating-card-1"
            style={{
              position: 'absolute',
              top: '0px',
              left: '-20px',
              zIndex: 3,
              backgroundColor: 'var(--pub-bg-glass-card)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--pub-border-highlight)',
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: 'var(--pub-card-shadow)',
              maxWidth: '240px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(77, 226, 193, 0.15)' : '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                  flexShrink: 0
                }}
              >
                <Package size={15} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--pub-text-primary)' }}>
                Gate Permission
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--pub-text-primary)', fontWeight: '600', marginBottom: '4px' }}>
              Parcel delivery • Flat 304
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#F5BB45',
                backgroundColor: isDark ? 'rgba(245, 187, 69, 0.12)' : '#FEF3C7',
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              <Clock size={11} />
              <span>Awaiting Resident Approval</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--pub-text-muted)', marginTop: '4px' }}>
              Illustrative preview
            </div>
          </div>

          {/* Floating Glassmorphism Panel 2: Maintenance Overview (Bottom-Right Offset) */}
          <div
            className="sh-float-card-2 sh-hero-floating-card-2"
            style={{
              position: 'absolute',
              bottom: '-12px',
              right: '-16px',
              zIndex: 3,
              backgroundColor: 'var(--pub-bg-glass-card)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(245, 187, 69, 0.3)' : '1px solid var(--pub-border-subtle)',
              borderRadius: '14px',
              padding: '12px 16px',
              boxShadow: 'var(--pub-card-shadow)',
              maxWidth: '250px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: isDark ? 'rgba(245, 187, 69, 0.15)' : '#FFFBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F5BB45',
                  flexShrink: 0
                }}
              >
                <Receipt size={15} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--pub-text-primary)' }}>
                Maintenance Overview
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--pub-text-primary)', fontWeight: '600', marginBottom: '4px' }}>
              Monthly billing & payments
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--pub-accent-emerald)', fontWeight: '600' }}>
              <CheckCircle2 size={12} />
              <span>Instant UPI reconciliation</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--pub-text-muted)', marginTop: '4px' }}>
              Illustrative preview
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Styles: Switch 2-column grid at 992px */}
      <style>{`
        @media (min-width: 992px) {
          .sh-hero-grid {
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr) !important;
          }
          .sh-hero-badge-desktop {
            display: inline-flex !important;
          }
        }
        @media (max-width: 768px) {
          .sh-hero-floating-card-1 {
            position: relative !important;
            top: auto !important;
            left: auto !important;
            margin-bottom: 12px !important;
            max-width: 100% !important;
          }
          .sh-hero-floating-card-2 {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
            margin-top: 12px !important;
            max-width: 100% !important;
          }
        }
        @media (max-width: 600px) {
          .sh-hero-cta-btn {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
