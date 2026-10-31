import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicTheme } from '../../context/PublicThemeContext';
import {
  ShieldCheck,
  CreditCard,
  Wrench,
  Users,
  Vote,
  Calendar,
  FileText,
  Bell,
  PieChart,
  ArrowRight,
  ShieldAlert,
  Building
} from 'lucide-react';

const featureCategories = [
  {
    categoryTitle: 'Society & Resident Management',
    categoryBadge: 'Administration & Tenancy',
    categoryDescription:
      'Centralize housing society administrative data, flat allocations, verified owner profiles, and tenant registrations.',
    features: [
      {
        icon: <Building size={20} color="var(--pub-accent-emerald)" />,
        title: 'Flat & Occupancy Directory',
        description:
          'Maintain an organized database of occupied flats, verified owners, and registered tenant records with contact isolation.'
      },
      {
        icon: <Users size={20} color="var(--pub-accent-turquoise)" />,
        title: 'Member Verification Workflow',
        description:
          'Managing committees review and approve resident join requests before granting community dashboard permissions.'
      },
      {
        icon: <ShieldCheck size={20} color="#F5BB45" />,
        title: 'Role-Based Access Control',
        description:
          'Dedicated portals for Admins, Residents, and Security Staff safeguard administrative controls and protect resident privacy.'
      }
    ]
  },
  {
    categoryTitle: 'Maintenance Billing & Online Payments',
    categoryBadge: 'Finance & Payments',
    categoryDescription:
      'Eliminate manual collection hassles, automate recurring monthly bills, and maintain audited transparent accounts.',
    features: [
      {
        icon: <FileText size={20} color="#0284c7" />,
        title: 'Recurring Maintenance Invoicing',
        description:
          'Generate monthly or quarterly society bills with automated calculation of water charges, sinking funds, and penalty charges.'
      },
      {
        icon: <CreditCard size={20} color="var(--pub-accent-emerald)" />,
        title: 'Razorpay Online Payments',
        description:
          'Residents pay dues securely using UPI, credit/debit cards, and net banking. Automatic webhook verification reconciles society accounts instantly.'
      },
      {
        icon: <PieChart size={20} color="var(--pub-accent-turquoise)" />,
        title: 'Expense & Account Transparency',
        description:
          'Residents view comprehensive breakdown of society collections, approved vendor disbursements, and monthly operating account balances.'
      }
    ]
  },
  {
    categoryTitle: 'Walk-in Visitor & Parcel Approvals',
    categoryBadge: 'Physical Gate Security',
    categoryDescription:
      'Digitize gatekeeping with real-time resident authorization, delivery vehicle logs, and staff attendance tracking.',
    features: [
      {
        icon: <ShieldCheck size={20} color="var(--pub-accent-emerald)" />,
        title: 'Walk-In & Delivery Verification',
        description:
          'Security staff log visitors with photo and vehicle details, triggering instantaneous mobile approval notifications to resident flats.'
      },
      {
        icon: <Bell size={20} color="var(--pub-accent-turquoise)" />,
        title: 'One-Tap Resident Decision',
        description:
          'Residents can Allow Entry, Deny Entry, or instruct the guard to Leave at Gate with zero telephone delays or guard confusion.'
      },
      {
        icon: <Users size={20} color="#F5BB45" />,
        title: 'Security Staff Duty Management',
        description:
          'Admins assign shifts, track attendance logs, and monitor incident reports filed by gate personnel in real time.'
      }
    ]
  },
  {
    categoryTitle: 'Helpdesk, Repairs & Work Orders',
    categoryBadge: 'Maintenance & Service',
    categoryDescription:
      'Streamline complaints from submission to resolution with assigned staff accountability and live progress tracking.',
    features: [
      {
        icon: <Wrench size={20} color="#ea580c" />,
        title: 'Categorized Complaints & Tickets',
        description:
          'Residents report plumbing, electrical, elevator, or noise issues with priority levels and photo attachments directly from their dashboard.'
      },
      {
        icon: <Users size={20} color="var(--pub-accent-emerald)" />,
        title: 'Staff Task Assignment & Oversight',
        description:
          'Management committees assign incoming repair tickets to facility managers and on-duty technicians, ensuring accountability.'
      },
      {
        icon: <Bell size={20} color="var(--pub-accent-turquoise)" />,
        title: 'Real-Time Status Notifications',
        description:
          'Automatic status updates keep residents and technicians informed at every step as tickets move from submitted to in-progress to resolved.'
      }
    ]
  },
  {
    categoryTitle: 'Community Governance, Documents & Events',
    categoryBadge: 'Governance & Records',
    categoryDescription:
      'Foster high community trust with democratic secret ballots, centralized documentation, and coordinated social gatherings.',
    features: [
      {
        icon: <Vote size={20} color="#7c3aed" />,
        title: 'Democratic Polls & Secret Ballot Voting',
        description:
          'Host society-wide polls with voter qualification, quorum tracking, and verifiable results for community decisions and resolutions.'
      },
      {
        icon: <Calendar size={20} color="#F5BB45" />,
        title: 'Events & RSVP Coordination',
        description:
          'Publish society festivals, cultural celebrations, and Annual General Meetings (AGM) with real-time resident RSVP headcounts.'
      },
      {
        icon: <FileText size={20} color="var(--pub-accent-turquoise)" />,
        title: 'Centralized Document Repository',
        description:
          'Secure storage for society bylaws, registration deeds, AGM minutes, auditing balance sheets, and administrative notice board circulars.'
      }
    ]
  }
];

const FeaturesPage = () => {
  const { isDark } = usePublicTheme();
  const navigate = useNavigate();

  return (
    <div style={{ width: '100%', backgroundColor: 'var(--pub-bg-main)', color: 'var(--pub-text-primary)', transition: 'background-color 250ms ease' }}>
      {/* Header Banner */}
      <section
        style={{
          padding: 'clamp(52px, 6vw, 76px) var(--sh-space-6) clamp(44px, 5vw, 60px)',
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 70%), var(--pub-bg-main)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 70%), linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)',
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
              backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
              border: isDark ? '1px solid rgba(77, 226, 193, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
              color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
              fontSize: '13px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          >
            <span>Full Platform Capabilities</span>
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
            Built for Modern Residential Communities
          </h1>
          <p
            style={{
              fontSize: '17px',
              lineHeight: 1.62,
              color: 'var(--pub-text-secondary)',
              margin: '0 auto',
              maxWidth: '680px'
            }}
          >
            Every feature in SocietyHub is designed around real operational challenges faced by
            managing committees, apartment residents, and security teams.
          </p>
        </div>
      </section>

      {/* Categorized Features Sections */}
      <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto', padding: 'clamp(48px, 5vw, 68px) var(--sh-space-6)' }}>
        {featureCategories.map((cat, catIdx) => (
          <section
            key={catIdx}
            style={{
              marginBottom: catIdx === featureCategories.length - 1 ? 0 : '56px',
              paddingBottom: catIdx === featureCategories.length - 1 ? 0 : '56px',
              borderBottom: catIdx === featureCategories.length - 1 ? 'none' : '1px solid var(--pub-border-subtle)'
            }}
          >
            {/* Category Header */}
            <div style={{ marginBottom: '32px' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isDark ? 'var(--pub-accent-turquoise)' : 'var(--pub-accent-emerald)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px'
                }}
              >
                {cat.categoryBadge}
              </span>
              <h2
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  marginBottom: '10px'
                }}
              >
                {cat.categoryTitle}
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: 'var(--pub-text-secondary)',
                  maxWidth: '720px',
                  margin: 0,
                  lineHeight: 1.6
                }}
              >
                {cat.categoryDescription}
              </p>
            </div>

            {/* 3-Card Grid for this category */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px'
              }}
            >
              {cat.features.map((feat, fIdx) => (
                <div
                  key={fIdx}
                  style={{
                    backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
                    border: '1px solid var(--pub-border-subtle)',
                    borderRadius: '16px',
                    padding: '26px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
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
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                      border: '1px solid var(--pub-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '18px'
                    }}
                  >
                    {feat.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--sh-font-heading)',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: 'var(--pub-text-primary)',
                      marginBottom: '10px'
                    }}
                  >
                    {feat.title}
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
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Call to Action Footer Section */}
      <section
        style={{
          padding: 'clamp(52px, 6vw, 72px) var(--sh-space-6)',
          backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#F8FAFC',
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
            Ready to experience these capabilities in your society?
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--pub-text-secondary)',
              marginBottom: '28px'
            }}
          >
            Register your society today or talk to our onboarding team to get answers to your questions.
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
              <span>Register Your Society</span>
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
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
              Contact Our Team
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeaturesPage;
