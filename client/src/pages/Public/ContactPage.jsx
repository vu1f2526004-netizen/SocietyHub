import React from 'react';
import ContactSection from './components/ContactSection';
import { MessageSquareText } from 'lucide-react';

const ContactPage = () => {
  return (
    <div style={{ width: '100%', backgroundColor: 'var(--pub-bg-main)', minHeight: '80vh', transition: 'background-color 200ms ease' }}>
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
            <MessageSquareText size={14} />
            <span>Direct Inquiries & Assistance</span>
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
            Get in Touch with SocietyHub
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
            Have questions regarding residential society onboarding, administrative tools, or gate operations?
            Our operations team is available to assist you.
          </p>
        </div>
      </section>

      {/* Actual Working Contact Form & Direct Support Cards */}
      <ContactSection />
    </div>
  );
};

export default ContactPage;
