import React from 'react';
import {
  ShieldCheck,
  Receipt,
  CreditCard,
  PieChart,
  Wrench,
  Vote,
  Calendar,
  FileText,
  CheckCircle2
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const featuresData = [
  {
    icon: <ShieldCheck size={24} color="var(--sh-primary-600)" />,
    iconBg: 'var(--sh-primary-50)',
    title: 'Gate Security & Visitor Permissions',
    badge: 'Security Staff & Residents',
    badgeVariant: 'success',
    description:
      'Real-time resident approval for walk-in visitors and delivery parcels. Digital gate check-in/out logs with secure pre-approved guest codes.'
  },
  {
    icon: <Receipt size={24} color="#0284c7" />,
    iconBg: '#e0f2fe',
    title: 'Monthly Maintenance Billing',
    badge: 'Finance & Accounts',
    badgeVariant: 'info',
    description:
      'Automated recurring billing across eligible flats with itemized utility charges, late-fee policies, and downloadable invoice PDFs.'
  },
  {
    icon: <CreditCard size={24} color="#16a34a" />,
    iconBg: '#dcfce7',
    title: 'Razorpay Online Payments',
    badge: 'Instant Reconciliation',
    badgeVariant: 'success',
    description:
      'Seamless online payments via UPI, credit/debit cards, and net banking. Automatic webhook ledger reconciliation and immediate payment receipts.'
  },
  {
    icon: <PieChart size={24} color="#7c3aed" />,
    iconBg: '#ede9fe',
    title: 'Expense & Account Transparency',
    badge: 'Audit Trail',
    badgeVariant: 'purple',
    description:
      'Democratized financial transparency. Residents inspect society collections, approved vendor expenditures, and monthly operating ledgers.'
  },
  {
    icon: <Wrench size={24} color="#ea580c" />,
    iconBg: '#ffedd5',
    title: 'Helpdesk & Complaints Management',
    badge: 'Issue Tracking',
    badgeVariant: 'warning',
    description:
      'Submit maintenance tickets with priority levels and photo attachments. Administrative assignment to duty staff and real-time status tracking.'
  },
  {
    icon: <Vote size={24} color="#0d9488" />,
    iconBg: '#ccfbf1',
    title: 'Community Polls & Democratic Voting',
    badge: 'Governance',
    badgeVariant: 'info',
    description:
      'Democratic society decision-making. Secret ballot polls with automatic voter qualification, quorum tracking, and verifiable results.'
  },
  {
    icon: <Calendar size={24} color="#db2777" />,
    iconBg: '#fce7f3',
    title: 'Events & RSVP Coordination',
    badge: 'Community Life',
    badgeVariant: 'purple',
    description:
      'Organize society festivals, annual general meetings (AGM), and sports events with real-time attendee RSVP tracking and headcounts.'
  },
  {
    icon: <FileText size={24} color="#475569" />,
    iconBg: '#f1f5f9',
    title: 'Document Repository & Notices',
    badge: 'Compliance & Records',
    badgeVariant: 'neutral',
    description:
      'Centralized cloud repository for society bylaws, AGM minutes, auditing balance sheets, and administrative notice board circulars.'
  }
];

const FeaturesSection = () => {
  return (
    <section
      id="features"
      style={{
        padding: 'var(--sh-space-20) var(--sh-space-6)',
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--sh-slate-200)',
        borderBottom: '1px solid var(--sh-slate-200)'
      }}
    >
      <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sh-space-16)', maxWidth: '720px', margin: '0 auto var(--sh-space-16)' }}>
          <div style={{ display: 'inline-flex', marginBottom: 'var(--sh-space-3)' }}>
            <Badge variant="info" size="md">
              Operational Capabilities
            </Badge>
          </div>
          <h2
            style={{
              fontFamily: 'var(--sh-font-heading)',
              fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)',
              fontWeight: '800',
              color: 'var(--sh-slate-900)',
              letterSpacing: '-0.02em',
              marginBottom: 'var(--sh-space-4)'
            }}
          >
            Everything Your Housing Society Needs
          </h2>
          <p
            style={{
              fontSize: 'var(--sh-text-base)',
              lineHeight: 1.6,
              color: 'var(--sh-slate-600)'
            }}
          >
            Built from real residential operational requirements. Every tool connects administrators,
            residents, and security personnel in a unified workflow.
          </p>
        </div>

        {/* Features 8-Card Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--sh-space-6)'
          }}
        >
          {featuresData.map((feature, idx) => (
            <Card
              key={idx}
              hoverable
              padding="lg"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                transition: 'transform var(--sh-transition-base), box-shadow var(--sh-transition-base)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--sh-space-4)'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--sh-radius-lg)',
                    backgroundColor: feature.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {feature.icon}
                </div>
                <Badge variant={feature.badgeVariant} size="sm">
                  {feature.badge}
                </Badge>
              </div>

              <h3
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: 'var(--sh-text-lg)',
                  fontWeight: '700',
                  color: 'var(--sh-slate-900)',
                  marginBottom: 'var(--sh-space-2)'
                }}
              >
                {feature.title}
              </h3>

              <p
                style={{
                  fontSize: 'var(--sh-text-sm)',
                  lineHeight: 1.6,
                  color: 'var(--sh-slate-600)',
                  flexGrow: 1
                }}
              >
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
