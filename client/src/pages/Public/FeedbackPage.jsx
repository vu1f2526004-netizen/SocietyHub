import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import {
  MessageSquareQuote,
  CheckCircle2,
  Vote,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  LogIn,
  UserPlus,
  HelpCircle
} from 'lucide-react';

const governancePillars = [
  {
    icon: <CheckCircle2 size={20} color="var(--pub-accent-emerald)" />,
    title: 'Verified Resident Accounts Only',
    description:
      'All feedback, complaints, and satisfaction assessments are submitted by verified flat owners or tenants. Anonymous external reviews are not permitted in our community ecosystem.'
  },
  {
    icon: <Vote size={20} color="var(--pub-accent-turquoise)" />,
    title: 'Democratic Polls & Quorum',
    description:
      'Community sentiment on society rules, facility upgrades, and committee elections is measured through verifiable, secret ballot polls in the resident portal.'
  },
  {
    icon: <ShieldCheck size={20} color="var(--pub-accent-gold)" />,
    title: 'Zero Fabricated Testimonials',
    description:
      'SocietyHub upholds complete data integrity. We do not invent customer names, fake 5-star ratings, or stock testimonial cards for promotional purposes.'
  },
  {
    icon: <FileCheck size={20} color="var(--pub-accent-emerald)" />,
    title: 'Transparent Resolution Records',
    description:
      'Maintenance complaints and repair requests are logged with full audit trails, allowing residents and committees to monitor actual turnaround times.'
  }
];

const FeedbackPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--pub-bg-main)',
        minHeight: '80vh',
        transition: 'background-color 200ms ease'
      }}
    >
      {/* Header Banner */}
      <section
        style={{
          padding: 'clamp(44px, 5vw, 64px) var(--sh-space-6) clamp(36px, 4vw, 48px)',
          borderBottom: '1px solid var(--pub-border-subtle)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: 'var(--pub-accent-emerald)',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          >
            <ShieldCheck size={14} />
            <span>Resident Voice & Transparency</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(32px, 3.6vw, 42px)',
              fontWeight: '700',
              color: 'var(--pub-text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
              marginBottom: '16px'
            }}
          >
            Community Feedback & Governance
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 1.8vw, 18px)',
              lineHeight: 1.6,
              color: 'var(--pub-text-secondary)',
              margin: '0 auto',
              maxWidth: '680px'
            }}
          >
            Authentic, verifiable perspectives from resident communities and administrative committees.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div
        style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: 'clamp(44px, 5vw, 64px) var(--sh-space-6)'
        }}
      >
        {/* Designed Genuine Empty State Card */}
        <div style={{ maxWidth: '820px', margin: '0 auto clamp(48px, 6vw, 64px)' }}>
          <div
            style={{
              backgroundColor: 'var(--pub-bg-glass-card)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px dashed var(--pub-border-highlight)',
              borderRadius: '20px',
              padding: 'clamp(32px, 4vw, 48px) clamp(24px, 3.5vw, 40px)',
              boxShadow: 'var(--pub-card-shadow)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--pub-accent-emerald)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}
            >
              <MessageSquareQuote size={34} />
            </div>

            <h3
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'clamp(20px, 2.2vw, 24px)',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                marginBottom: '12px',
                letterSpacing: '-0.015em'
              }}
            >
              Verified Resident Feedback Awaiting Publication
            </h3>

            <p
              style={{
                fontSize: '15.5px',
                lineHeight: 1.65,
                color: 'var(--pub-text-secondary)',
                maxWidth: '620px',
                margin: '0 auto 28px'
              }}
            >
              SocietyHub upholds complete data integrity. Public testimonials and resident ratings will
              be featured here as participating housing societies publish approved feedback through
              authorized resident channels.
            </p>

            <div
              style={{
                paddingTop: '24px',
                borderTop: '1px solid var(--pub-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--pub-text-secondary)',
                  marginBottom: '20px'
                }}
              >
                Are you an active resident or committee member? Share feedback or file a service
                request directly inside your portal.
              </p>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    if (user.role === 'Resident') navigate('/resident/complaints');
                    else if (user.role === 'Admin') navigate('/admin');
                    else navigate('/staff');
                  }}
                  className="sh-btn-luxury"
                  style={{
                    height: '46px',
                    padding: '0 24px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: 'var(--pub-accent-emerald)',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <span>Go to Your Portal Feedback Desk</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="sh-btn-luxury"
                    style={{
                      height: '46px',
                      padding: '0 22px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#ffffff',
                      backgroundColor: 'var(--pub-accent-emerald)',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <LogIn size={16} />
                    <span>Log In to Resident Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/join-society')}
                    className="sh-btn-luxury"
                    style={{
                      height: '46px',
                      padding: '0 22px',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: 'var(--pub-text-primary)',
                      backgroundColor: 'var(--pub-bg-surface)',
                      border: '1px solid var(--pub-border-subtle)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <UserPlus size={16} />
                    <span>Join Your Society</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Governance & Authenticity Standards Grid */}
        <div>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'clamp(22px, 2.4vw, 28px)',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                marginBottom: '10px',
                letterSpacing: '-0.02em'
              }}
            >
              Our Feedback Standards & Governance Architecture
            </h2>
            <p
              style={{
                fontSize: '15.5px',
                color: 'var(--pub-text-secondary)',
                margin: '0 auto',
                maxWidth: '600px'
              }}
            >
              How SocietyHub protects housing societies from manufactured opinions and fake ratings.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px'
            }}
          >
            {governancePillars.map((pillar, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--pub-bg-surface)',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '16px',
                  padding: '26px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--pub-card-shadow)',
                  transition: 'transform 200ms ease, border-color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'var(--pub-border-highlight)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--pub-border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {pillar.icon}
                  </div>
                  <h3
                    style={{
                      fontSize: '16.5px',
                      fontWeight: '700',
                      color: 'var(--pub-text-primary)',
                      margin: 0,
                      lineHeight: 1.3
                    }}
                  >
                    {pillar.title}
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'var(--pub-text-secondary)',
                    margin: 0
                  }}
                >
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Support Banner */}
      <section
        style={{
          padding: 'clamp(48px, 5vw, 64px) var(--sh-space-6)',
          backgroundColor: 'var(--pub-bg-surface)',
          borderTop: '1px solid var(--pub-border-subtle)',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(22px, 2.4vw, 28px)',
              fontWeight: '700',
              color: 'var(--pub-text-primary)',
              marginBottom: '10px',
              letterSpacing: '-0.02em'
            }}
          >
            Have a question or operational inquiry?
          </h2>
          <p
            style={{
              fontSize: '15.5px',
              color: 'var(--pub-text-secondary)',
              marginBottom: '24px',
              lineHeight: 1.6
            }}
          >
            Our team is available to assist society secretaries, treasurers, and residents with any questions.
          </p>
          <button
            type="button"
            onClick={() => navigate('/contact')}
            className="sh-btn-luxury"
            style={{
              height: '46px',
              padding: '0 26px',
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--pub-text-primary)',
              backgroundColor: 'var(--pub-bg-surface-elevated)',
              border: '1px solid var(--pub-border-subtle)',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <HelpCircle size={16} />
            <span>Contact SocietyHub Support</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default FeedbackPage;
