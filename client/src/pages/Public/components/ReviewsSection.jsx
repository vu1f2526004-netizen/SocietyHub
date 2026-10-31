import React from 'react';
import { MessageSquareQuote, CheckCircle2, ShieldCheck, Vote } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';

const ReviewsSection = () => {
  return (
    <section
      id="reviews"
      style={{
        padding: 'var(--sh-space-20) var(--sh-space-6)',
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--sh-slate-200)',
        borderBottom: '1px solid var(--sh-slate-200)'
      }}
    >
      <div style={{ maxWidth: 'var(--sh-container-xl)', margin: '0 auto' }}>
        {/* Section Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 'var(--sh-space-12)',
            maxWidth: '720px',
            margin: '0 auto var(--sh-space-12)'
          }}
        >
          <div style={{ display: 'inline-flex', marginBottom: 'var(--sh-space-3)' }}>
            <Badge variant="neutral" size="md">
              Resident Voice & Transparency
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
            Community Feedback & Resident Insights
          </h2>
          <p
            style={{
              fontSize: 'var(--sh-text-base)',
              lineHeight: 1.6,
              color: 'var(--sh-slate-600)'
            }}
          >
            Authentic, verifiable perspectives from resident communities and administrative committees.
          </p>
        </div>

        {/* Honest Disclosure Container */}
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <Card padding="xl" style={{ border: '1px dashed var(--sh-slate-300)', backgroundColor: '#fafafa' }}>
            <EmptyState
              icon={<MessageSquareQuote size={40} color="var(--sh-primary-600)" />}
              title="Verified Resident Feedback Awaiting Publication"
              description="SocietyHub values genuine, verified community sentiment. Public testimonials and resident ratings will be featured here as participating housing societies publish approved feedback through authorized resident channels."
            />

            {/* In-Platform Feedback Architecture Highlights */}
            <div
              style={{
                marginTop: 'var(--sh-space-8)',
                paddingTop: 'var(--sh-space-6)',
                borderTop: '1px solid var(--sh-slate-200)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--sh-space-4)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sh-space-3)' }}>
                <CheckCircle2 size={18} color="var(--sh-primary-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: 'var(--sh-text-sm)', fontWeight: '600', color: 'var(--sh-slate-900)', margin: '0 0 4px 0' }}>
                    Authentic Governance
                  </h4>
                  <p style={{ fontSize: 'var(--sh-text-xs)', color: 'var(--sh-slate-500)', margin: 0, lineHeight: 1.5 }}>
                    Resident feedback is collected through verified flat logins, never anonymous reviews.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sh-space-3)' }}>
                <Vote size={18} color="#0284c7" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: 'var(--sh-text-sm)', fontWeight: '600', color: 'var(--sh-slate-900)', margin: '0 0 4px 0' }}>
                    Democratic Polls
                  </h4>
                  <p style={{ fontSize: 'var(--sh-text-xs)', color: 'var(--sh-slate-500)', margin: 0, lineHeight: 1.5 }}>
                    Decisions are governed by transparent, quorum-verified polls in the Resident portal.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sh-space-3)' }}>
                <ShieldCheck size={18} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: 'var(--sh-text-sm)', fontWeight: '600', color: 'var(--sh-slate-900)', margin: '0 0 4px 0' }}>
                    No Fabricated Data
                  </h4>
                  <p style={{ fontSize: 'var(--sh-text-xs)', color: 'var(--sh-slate-500)', margin: 0, lineHeight: 1.5 }}>
                    SocietyHub does not display synthetic star ratings or invented customer testimonials.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
