import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePublicTheme } from '../../context/PublicThemeContext';
import {
  ShieldCheck,
  Receipt,
  Wrench,
  Vote,
  ArrowRight,
  Info,
  MessageSquareQuote,
  Mail
} from 'lucide-react';
import HeroSection from './components/HeroSection';
import Card from '../../components/ui/Card';

const coreCapabilities = [
  {
    icon: <ShieldCheck size={22} color="var(--pub-accent-emerald)" />,
    title: 'Gate Security & Approvals',
    description: 'Instant resident mobile approvals for walk-in visitors and parcel deliveries, backed by digital logs.'
  },
  {
    icon: <Receipt size={22} color="var(--pub-accent-turquoise)" />,
    title: 'Billing & Online Payments',
    description: 'Automated maintenance invoicing with seamless Razorpay payments and instant ledger reconciliation.'
  },
  {
    icon: <Wrench size={22} color="#F5BB45" />,
    title: 'Complaints & Work Orders',
    description: 'Submit maintenance tickets with photos, assign duty staff, and track resolution milestones.'
  },
  {
    icon: <Vote size={22} color="#A78BFA" />,
    title: 'Polls & Expense Ledgers',
    description: 'Democratic community voting, secret ballot resolutions, and transparent society balance sheets.'
  }
];

const pagePreviews = [
  {
    icon: <Info size={20} color="var(--pub-accent-turquoise)" />,
    title: 'About SocietyHub',
    subtitle: 'Purpose & Architecture',
    description: 'Learn how SocietyHub coordinates secretaries, residents, and gatekeepers in a unified workflow.',
    linkText: 'Our Architecture',
    linkTo: '/about'
  },
  {
    icon: <MessageSquareQuote size={20} color="var(--pub-accent-emerald)" />,
    title: 'Feedback & Reviews',
    subtitle: 'Transparent Resident Voice',
    description: 'Explore our zero-synthetic-reviews philosophy and how verified residents govern community issues.',
    linkText: 'Resident Governance',
    linkTo: '/feedback'
  },
  {
    icon: <Mail size={20} color="#F5BB45" />,
    title: 'Contact & Inquiries',
    subtitle: 'Direct Operational Support',
    description: 'Questions about onboarding your housing society or need technical assistance? Reach our team directly.',
    linkText: 'Contact Support',
    linkTo: '/contact'
  }
];

const HomePage = () => {
  const { isDark } = usePublicTheme();
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', backgroundColor: 'var(--pub-bg-main)', color: 'var(--pub-text-primary)', transition: 'background-color 250ms ease' }}>
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Product Introduction & Features Preview (Luxury Surface Cards) */}
      <section
        style={{
          padding: 'clamp(56px, 6vw, 80px) var(--sh-space-6)',
          backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
          borderTop: '1px solid var(--pub-border-subtle)',
          borderBottom: '1px solid var(--pub-border-subtle)',
          transition: 'background-color 250ms ease, border-color 250ms ease'
        }}
      >
        <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto' }}>
          {/* Section Header */}
          <div
            style={{
              textAlign: 'center',
              maxWidth: '720px',
              margin: '0 auto clamp(36px, 4.5vw, 52px)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '20px',
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
                color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '14px'
              }}
            >
              <span>Core Platform Modules</span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'clamp(28px, 3.2vw, 38px)',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                marginBottom: '14px'
              }}
            >
              Essential Tools for Everyday Society Operations
            </h2>
            <p
              style={{
                fontSize: '17px',
                lineHeight: 1.62,
                color: 'var(--pub-text-secondary)',
                margin: 0
              }}
            >
              Eliminate paper registers, disparate spreadsheets, and chaotic messaging groups.
              Every stakeholder has a purpose-built workspace tailored to their exact responsibilities.
            </p>
          </div>

          {/* 4 Balanced Luxury Capability Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              marginBottom: '44px'
            }}
          >
            {coreCapabilities.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  border: isDark ? '1px solid var(--pub-border-subtle)' : '1px solid #E2E8F0',
                  borderRadius: '16px',
                  backgroundColor: isDark ? 'var(--pub-bg-main)' : '#FFFFFF',
                  padding: '26px',
                  boxShadow: 'var(--pub-card-shadow)',
                  transition: 'all 200ms ease'
                }}
                className="sh-btn-luxury"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(77, 226, 193, 0.4)' : 'rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'var(--pub-border-subtle)' : '#E2E8F0';
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                    border: '1px solid var(--pub-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '18px'
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--sh-font-heading)',
                    fontSize: '19px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '10px'
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--pub-text-secondary)',
                    margin: 0,
                    flexGrow: 1
                  }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Features Route Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/features')}
              style={{
                height: '48px',
                padding: '0 26px',
                fontSize: '15px',
                fontWeight: '500',
                color: 'var(--pub-text-primary)',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                border: '1px solid var(--pub-border-subtle)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
              className="sh-btn-luxury"
            >
              <span>Explore All Platform Capabilities</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Discover SocietyHub Pages (Editorial Glassmorphic Cards) */}
      <section
        style={{
          padding: 'clamp(56px, 6vw, 80px) var(--sh-space-6)',
          backgroundColor: 'var(--pub-bg-main)',
          borderBottom: '1px solid var(--pub-border-subtle)',
          transition: 'background-color 250ms ease'
        }}
      >
        <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto' }}>
          <div
            style={{
              textAlign: 'center',
              maxWidth: '680px',
              margin: '0 auto clamp(32px, 4vw, 48px)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '20px',
                backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F5F3FF',
                border: isDark ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid #DDD6FE',
                color: isDark ? '#C4B5FD' : '#6D28D9',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '12px'
              }}
            >
              <span>Learn More</span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'clamp(26px, 2.8vw, 34px)',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
                marginBottom: '10px'
              }}
            >
              Everything You Need to Know About SocietyHub
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--pub-text-secondary)', margin: 0 }}>
              Explore our architecture, transparent resident policies, or reach out to our team.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '24px'
            }}
          >
            {pagePreviews.map((page, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '16px',
                  padding: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--pub-card-shadow)',
                  transition: 'all 200ms ease'
                }}
                className="sh-btn-luxury"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(77, 226, 193, 0.4)' : 'rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pub-border-subtle)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {page.icon}
                    </div>
                    <div>
                      <h3
                        style={{
                          fontFamily: 'var(--sh-font-heading)',
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'var(--pub-text-primary)',
                          margin: 0
                        }}
                      >
                        {page.title}
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--pub-text-muted)' }}>
                        {page.subtitle}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--pub-text-secondary)', marginBottom: '20px' }}>
                    {page.description}
                  </p>
                </div>

                <Link
                  to={page.linkTo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                    textDecoration: 'none',
                    transition: 'gap 180ms ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.gap = '10px')}
                  onMouseLeave={(e) => (e.currentTarget.style.gap = '6px')}
                >
                  <span>{page.linkText}</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Bottom Call-to-Action Banner */}
      <section
        style={{
          padding: 'clamp(56px, 6vw, 80px) var(--sh-space-6)',
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.15) 0%, transparent 70%), var(--pub-bg-surface)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.1) 0%, transparent 70%), #0F172A',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(28px, 3.2vw, 38px)',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.24,
              marginBottom: '16px'
            }}
          >
            Ready to Bring Digital Transparency to Your Housing Society?
          </h2>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.62,
              color: isDark ? '#94A3B8' : '#CBD5E1',
              marginBottom: '32px'
            }}
          >
            Register your society as an administrator or join your existing community in minutes.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '14px'
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/signup')}
              style={{
                height: '48px',
                padding: '0 28px',
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
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.45)'
              }}
              className="sh-btn-luxury"
            >
              <span>Get Started</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/register-society')}
              style={{
                height: '48px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: '500',
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '10px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
              className="sh-btn-luxury"
            >
              Register New Society
            </button>
            <button
              type="button"
              onClick={() => navigate('/join-society')}
              style={{
                height: '48px',
                padding: '0 22px',
                fontSize: '16px',
                fontWeight: '500',
                color: isDark ? 'var(--pub-accent-turquoise)' : '#CBD5E1',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              className="sh-btn-luxury"
            >
              Join Existing Society
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
