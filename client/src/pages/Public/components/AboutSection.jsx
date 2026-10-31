import React from 'react';
import {
  Users,
  Building,
  Shield,
  Eye,
  CheckCircle,
  Award,
  Lock,
  Smartphone
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const stakeholderGroups = [
  {
    icon: <Users size={28} color="var(--sh-primary-600)" />,
    title: 'Residents & Flat Owners',
    description:
      'Manage home maintenance dues online, grant instant permissions for guests and couriers from your smartphone, report issues directly, and participate in community voting.'
  },
  {
    icon: <Building size={28} color="#0284c7" />,
    title: 'Society Secretaries & Committee',
    description:
      'Run end-to-end society operations. Automate monthly billing, reconcile bank payments via Razorpay, maintain vendor ledgers, and resolve resident complaints with full auditability.'
  },
  {
    icon: <Shield size={28} color="#7c3aed" />,
    title: 'Security Staff & Gatekeepers',
    description:
      'Streamline entry desks. Verify walk-in visitors and delivery agents via real-time resident approval, log parcel custody securely, and manage gate observations without paper logs.'
  }
];

const corePillars = [
  {
    icon: <Lock size={20} color="var(--sh-primary-600)" />,
    title: 'Privacy by Architecture',
    text: 'Resident mobile numbers and emails are never exposed at the security gate or in public listings. Communications and approvals flow through secure channels.'
  },
  {
    icon: <Eye size={20} color="#0284c7" />,
    title: 'Financial Accountability',
    text: 'Every rupee collected from maintenance and every rupee disbursed to maintenance vendors is tracked with transparent ledgers accessible to every resident.'
  },
  {
    icon: <Smartphone size={20} color="#7c3aed" />,
    title: 'Simplicity on Any Device',
    text: 'Designed for accessibility across desktops, tablets, and mobile screens. Intuitive interfaces that require zero technical training for committee members or guards.'
  },
  {
    icon: <CheckCircle size={20} color="#16a34a" />,
    title: 'Multi-Society Isolation',
    text: 'Each registered housing society maintains strict tenant data isolation, role-based access control, and independent financial ledgers.'
  }
];

const AboutSection = () => {
  return (
    <section
      id="about"
      style={{
        padding: 'var(--sh-space-20) var(--sh-space-6)',
        backgroundColor: '#f8fafc'
      }}
    >
      <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto' }}>
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--sh-space-16)',
            maxWidth: '720px',
            margin: '0 auto var(--sh-space-16)'
          }}
        >
          <div style={{ display: 'inline-flex', marginBottom: 'var(--sh-space-3)' }}>
            <Badge variant="purple" size="md">
              About SocietyHub
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
            Built for Modern Residential Communities
          </h2>
          <p
            style={{
              fontSize: 'var(--sh-text-base)',
              lineHeight: 1.6,
              color: 'var(--sh-slate-600)'
            }}
          >
            SocietyHub is an integrated management platform designed to replace fragmented WhatsApp groups,
            paper gate registers, and offline ledgers with a single, transparent digital system.
          </p>
        </div>

        {/* Stakeholder 3-Card Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 'var(--sh-space-8)',
            marginBottom: 'var(--sh-space-16)'
          }}
        >
          {stakeholderGroups.map((group, idx) => (
            <Card
              key={idx}
              padding="lg"
              style={{
                backgroundColor: 'var(--sh-white)',
                border: '1px solid var(--sh-slate-200)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--sh-radius-xl)',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--sh-space-5)'
                }}
              >
                {group.icon}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: 'var(--sh-text-xl)',
                  fontWeight: '700',
                  color: 'var(--sh-slate-900)',
                  marginBottom: 'var(--sh-space-3)'
                }}
              >
                {group.title}
              </h3>
              <p
                style={{
                  fontSize: 'var(--sh-text-sm)',
                  lineHeight: 1.65,
                  color: 'var(--sh-slate-600)',
                  flexGrow: 1
                }}
              >
                {group.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Core Architectural Pillars */}
        <div
          style={{
            backgroundColor: 'var(--sh-white)',
            borderRadius: 'var(--sh-radius-2xl)',
            border: '1px solid var(--sh-slate-200)',
            padding: 'var(--sh-space-10) var(--sh-space-8)',
            boxShadow: 'var(--sh-shadow-sm)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--sh-space-8)' }}>
            <h3
              style={{
                fontFamily: 'var(--sh-font-heading)',
                fontSize: 'var(--sh-text-2xl)',
                fontWeight: '700',
                color: 'var(--sh-slate-900)',
                marginBottom: 'var(--sh-space-2)'
              }}
            >
              Core Principles of Our Platform
            </h3>
            <p style={{ fontSize: 'var(--sh-text-sm)', color: 'var(--sh-slate-500)' }}>
              Engineered with integrity, security, and everyday practical usability at the center.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--sh-space-6)'
            }}
          >
            {corePillars.map((pillar, idx) => (
              <div
                key={idx}
                style={{
                  padding: 'var(--sh-space-4)',
                  borderRadius: 'var(--sh-radius-lg)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--sh-slate-100)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sh-space-3)',
                    marginBottom: 'var(--sh-space-2)'
                  }}
                >
                  {pillar.icon}
                  <span
                    style={{
                      fontFamily: 'var(--sh-font-heading)',
                      fontSize: 'var(--sh-text-base)',
                      fontWeight: '700',
                      color: 'var(--sh-slate-900)'
                    }}
                  >
                    {pillar.title}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--sh-text-xs)', lineHeight: 1.6, color: 'var(--sh-slate-600)', margin: 0 }}>
                  {pillar.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
