import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';

const PublicFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        backgroundColor: 'var(--pub-bg-main)',
        color: 'var(--pub-text-secondary)',
        borderTop: '1px solid var(--pub-border-subtle)',
        padding: 'clamp(48px, 6vw, 64px) var(--sh-space-6) 28px',
        transition: 'background-color 200ms ease, border-color 200ms ease'
      }}
    >
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* Top 4-Column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'clamp(32px, 4vw, 48px)',
            marginBottom: '48px'
          }}
        >
          {/* Brand Column */}
          <div style={{ maxWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--pub-accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Building2 size={20} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  letterSpacing: '-0.025em'
                }}
              >
                SocietyHub
              </span>
            </div>
            <p
              style={{
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--pub-text-secondary)',
                margin: '0 0 18px 0'
              }}
            >
              Enterprise community-management platform providing secure visitor approval, maintenance
              billing, financial transparency, and operational governance for modern residential societies.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--pub-accent-emerald)',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              <CheckCircle2 size={13} />
              <span>Operational Platform</span>
            </div>
          </div>

          {/* Column 2: Public Navigation */}
          <div>
            <h4
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--pub-text-primary)',
                marginBottom: '16px'
              }}
            >
              Platform Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link
                  to="/"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/features"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Features & Capabilities
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  About SocietyHub
                </Link>
              </li>
              <li>
                <Link
                  to="/feedback"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Feedback & Governance
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Contact Support Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Authenticated Portals */}
          <div>
            <h4
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--pub-text-primary)',
                marginBottom: '16px'
              }}
            >
              Society Portals
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link
                  to="/resident"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Resident Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Admin & Secretary Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/staff"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Gate & Security Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Get Started */}
          <div>
            <h4
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--pub-text-primary)',
                marginBottom: '16px'
              }}
            >
              Get Started
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                <Link
                  to="/login"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Log In to Account
                </Link>
              </li>
              <li>
                <Link
                  to="/join-society"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Join Existing Society
                </Link>
              </li>
              <li>
                <Link
                  to="/register-society"
                  style={{
                    color: 'var(--pub-text-secondary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 150ms ease'
                  }}
                  onMouseEnter={(e) => (e.target.style.color = 'var(--pub-accent-emerald)')}
                  onMouseLeave={(e) => (e.target.style.color = 'var(--pub-text-secondary)')}
                >
                  Register New Society
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid var(--pub-border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontSize: '12.5px',
            color: 'var(--pub-text-muted)'
          }}
        >
          <div>
            &copy; {currentYear} SocietyHub. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={14} color="var(--pub-accent-emerald)" />
              Secure Society Isolation & RBAC
            </span>
            <span>•</span>
            <span>Razorpay Payment Verified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
