import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicTheme } from '../../context/PublicThemeContext';
import {
  Building2,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  Smartphone,
  Server,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import heroCommunityImg from '../../assets/society-hero.jpg';

const stakeholders = [
  {
    role: 'Admin & Committee',
    badge: 'Operations & Governance',
    icon: <Building2 size={22} color="var(--pub-accent-turquoise)" />,
    responsibilities: [
      'Automate monthly maintenance billing across all occupied flats',
      'Track real-time Razorpay collection ledgers and bank reconciliations',
      'Assign reported resident complaints to on-duty staff and verify resolution',
      'Organize AGM meetings, broadcast digital notices, and host secret ballot polls'
    ]
  },
  {
    role: 'Residents & Flat Owners',
    badge: 'Home & Community',
    icon: <Users size={22} color="var(--pub-accent-emerald)" />,
    responsibilities: [
      'Approve or deny walk-in visitors and parcel deliveries in real time',
      'Pay maintenance dues instantly via UPI, credit/debit card, or net banking',
      'Submit maintenance tickets with photo evidence and monitor repair progress',
      'Cast confidential votes on society resolutions and inspect monthly expense accounts'
    ]
  },
  {
    role: 'Security Staff & Gate Desk',
    badge: 'Physical Gate Security',
    icon: <Shield size={22} color="#F5BB45" />,
    responsibilities: [
      'Initiate instant walk-in visitor clearance requests without paper registers',
      'Manage parcel delivery custody until resident collection',
      'Maintain an accurate, searchable digital check-in and check-out ledger',
      'Log incident reports and parking violations directly to the administrative desk'
    ]
  }
];

const problemsSolved = [
  {
    problem: 'Manual Paper Gate Registers',
    problemDetail: 'Paper logs are easily bypassed, unreadable, and expose resident phone numbers to any visitor who browses the register.',
    solution: 'Digital Gate Verification with Privacy',
    solutionDetail: 'Security initiates a request; residents approve from their dashboard. Personal contact information remains confidential.'
  },
  {
    problem: 'Delayed Dues & Disputed Receipts',
    problemDetail: 'Offline checks, delayed bank reconciliation, and lost paper receipts create constant friction between residents and treasurers.',
    solution: 'Automated Billing & Razorpay Ledger',
    solutionDetail: 'Itemized invoices are generated automatically with instant payment links and cryptographic webhook confirmation.'
  },
  {
    problem: 'Lost Maintenance Complaints',
    problemDetail: 'Verbal complaints to security guards or messages in crowded chat groups frequently get buried and forgotten.',
    solution: 'Auditable Ticket Helpdesk',
    solutionDetail: 'Every maintenance request is timestamped, categorized, assigned to duty staff, and tracked through to verified completion.'
  },
  {
    problem: 'Financial Opacity & Mistrust',
    problemDetail: 'Residents are often unsure how their maintenance fees are utilized, leading to low compliance and heated AGM disputes.',
    solution: 'Democratic Expense Transparency',
    solutionDetail: 'Verified society expenditures, balance sheets, and maintenance collection charts are visible to every resident.'
  }
];

const architecturePillars = [
  {
    icon: <Lock size={20} color="var(--pub-accent-emerald)" />,
    title: 'Tenant Isolation',
    description: 'Every society operates within an isolated database scope. Data, records, and accounts never leak across societies.'
  },
  {
    icon: <Eye size={20} color="var(--pub-accent-turquoise)" />,
    title: 'Privacy by Architecture',
    description: 'Resident contact numbers and email addresses are hidden at the gate desk to protect personal data from public exposure.'
  },
  {
    icon: <Server size={20} color="#A78BFA" />,
    title: 'Cryptographic Reconciliation',
    description: 'Payments processed through Razorpay are verified through HMAC-SHA256 webhooks to prevent duplicate or falsified transactions.'
  },
  {
    icon: <Smartphone size={20} color="#F5BB45" />,
    title: 'Accessible Responsive UI',
    description: 'Constructed using a unified design token system that runs smoothly across desktop monitors, tablets, and mobile browsers.'
  }
];

const AboutPage = () => {
  const { isDark } = usePublicTheme();
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', backgroundColor: 'var(--pub-bg-main)', color: 'var(--pub-text-primary)', transition: 'background-color 250ms ease' }}>
      {/* Header Banner */}
      <section
        style={{
          padding: 'clamp(52px, 6vw, 76px) var(--sh-space-6) clamp(44px, 5vw, 60px)',
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(77, 226, 193, 0.1) 0%, transparent 70%), var(--pub-bg-main)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%), linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
          borderBottom: '1px solid var(--pub-border-subtle)',
          textAlign: 'center',
          transition: 'background 250ms ease'
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '20px',
              backgroundColor: isDark ? 'rgba(77, 226, 193, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
              color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          >
            <span>About SocietyHub</span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(32px, 3.8vw, 44px)',
              fontWeight: '800',
              color: 'var(--pub-text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.22,
              marginBottom: '16px'
            }}
          >
            Digital Simplicity for Residential Communities
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.62,
              color: 'var(--pub-text-secondary)',
              margin: '0 auto',
              maxWidth: '700px'
            }}
          >
            SocietyHub is a unified management platform designed to replace fragmented communication,
            paper gate registers, and offline ledgers with a transparent, role-based digital system.
          </p>
        </div>
      </section>

      {/* Main Content Sections */}
      <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto', padding: 'clamp(48px, 5vw, 68px) var(--sh-space-6)' }}>
        {/* Section 1: Editorial 2-Column Overview with Community Visual */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(36px, 4vw, 56px)',
            alignItems: 'center',
            marginBottom: '64px'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              Our Mission & Philosophy
            </span>
            <h2
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'clamp(26px, 2.8vw, 34px)',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                marginBottom: '16px',
                lineHeight: 1.25
              }}
            >
              Architected for Everyday Coordination and Trust
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.65, color: 'var(--pub-text-secondary)', marginBottom: '24px' }}>
              Residential societies operate like mini-municipalities. Committees manage infrastructure,
              security staff protect the entry gates, and residents expect seamless living. SocietyHub
              coordinates all three groups into an integrated workflow — bringing security, billing,
              repairs, and governance into a single, high-trust application.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#F8FAFC',
                  border: '1px solid var(--pub-border-subtle)'
                }}
              >
                <CheckCircle2 size={18} color="var(--pub-accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--pub-text-primary)' }}>
                    Audited Financial Integrity
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--pub-text-secondary)', marginTop: '2px' }}>
                    Cryptographic webhook confirmation for Razorpay collections and verifiable society expense balance sheets.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#F8FAFC',
                  border: '1px solid var(--pub-border-subtle)'
                }}
              >
                <ShieldCheck size={18} color="#F5BB45" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--pub-text-primary)' }}>
                    Privacy-Preserving Gate Verification
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--pub-text-secondary)', marginTop: '2px' }}>
                    Security initiates visitor clearance without displaying resident personal phone numbers on public desk screens.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual Image Collage */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--pub-border-subtle)',
                boxShadow: 'var(--pub-card-shadow)',
                position: 'relative'
              }}
            >
              <img
                src={heroCommunityImg}
                alt="Modern housing society complex"
                style={{
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '4 / 3',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  backgroundColor: 'var(--pub-bg-glass)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pub-accent-emerald)',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--pub-text-primary)' }}>
                    Unified Community Ecosystem
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--pub-text-muted)' }}>
                    100% verified flats • Zero synthetic feedback
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Who Uses It (3 Roles) */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              Dedicated Stakeholders
            </span>
            <h3
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                margin: 0
              }}
            >
              Tailored Workspaces for Every Role
            </h3>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '24px'
            }}
          >
            {stakeholders.map((s, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '16px',
                  padding: '26px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxShadow: 'var(--pub-card-shadow)'
                }}
                className="sh-btn-luxury"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--pub-border-subtle)'
                    }}
                  >
                    {s.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: isDark ? 'var(--pub-text-secondary)' : '#475569',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    {s.badge}
                  </span>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--sh-font-heading)',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '14px'
                  }}
                >
                  {s.role}
                </h4>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '14px',
                    color: 'var(--pub-text-secondary)',
                    flexGrow: 1
                  }}
                >
                  {s.responsibilities.map((r, rIdx) => (
                    <li key={rIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle2 size={16} color="var(--pub-accent-emerald)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: 1.55 }}>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: The Society-Management Problems It Addresses */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                marginBottom: '8px'
              }}
            >
              The Everyday Problems We Address
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--pub-text-secondary)', margin: 0 }}>
              From gate security loopholes to disputed billing spreadsheets, SocietyHub brings practical solutions.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px'
            }}
          >
            {problemsSolved.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: 'var(--pub-card-shadow)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={15} color="#ef4444" />
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#ef4444', letterSpacing: '0.04em' }}>
                      Traditional Problem
                    </span>
                  </div>
                  <h4 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--pub-text-primary)', margin: '0 0 6px 0' }}>
                    {item.problem}
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--pub-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {item.problemDetail}
                  </p>
                </div>

                <div style={{ paddingTop: '14px', borderTop: '1px solid var(--pub-border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <CheckCircle2 size={15} color="var(--pub-accent-emerald)" />
                    <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--pub-accent-emerald)', letterSpacing: '0.04em' }}>
                      SocietyHub Solution
                    </span>
                  </div>
                  <h4 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--pub-text-primary)', margin: '0 0 6px 0' }}>
                    {item.solution}
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--pub-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {item.solutionDetail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Architecture & Design Principles */}
        <div
          style={{
            backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#F8FAFC',
            borderRadius: '20px',
            border: '1px solid var(--pub-border-subtle)',
            padding: '36px 32px'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h3
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--pub-text-primary)',
                marginBottom: '8px'
              }}
            >
              How Our System Works Together
            </h3>
            <p style={{ fontSize: '15px', color: 'var(--pub-text-secondary)', margin: 0 }}>
              Built on proven architectural patterns for security, multi-tenant isolation, and high availability.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px'
            }}
          >
            {architecturePillars.map((p, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: isDark ? 'var(--pub-bg-main)' : '#FFFFFF',
                  padding: '22px',
                  borderRadius: '14px',
                  border: '1px solid var(--pub-border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  {p.icon}
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--pub-text-primary)', margin: 0 }}>
                    {p.title}
                  </h4>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--pub-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call to Action Footer */}
      <section
        style={{
          padding: 'clamp(52px, 6vw, 72px) var(--sh-space-6)',
          backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
          borderTop: '1px solid var(--pub-border-subtle)',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(24px, 2.6vw, 30px)',
              fontWeight: '700',
              color: 'var(--pub-text-primary)',
              marginBottom: '12px'
            }}
          >
            Ready to bring order to your residential society?
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--pub-text-secondary)', marginBottom: '28px' }}>
            Join committee members and residents running their societies on SocietyHub.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/register-society')}
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
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)'
              }}
              className="sh-btn-luxury"
            >
              <span>Register a New Society</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/join-society')}
              style={{
                height: '48px',
                padding: '0 24px',
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--pub-text-primary)',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                border: '1px solid var(--pub-border-subtle)',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              className="sh-btn-luxury"
            >
              Join an Existing Society
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
