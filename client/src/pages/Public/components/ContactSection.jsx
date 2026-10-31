import React, { useState, useRef } from 'react';
import { Send, Building2, ShieldCheck, MailCheck, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import Alert from '../../../components/ui/Alert';
import societyHeroImage from '../../../assets/society-hero.jpg';

const INQUIRY_CATEGORIES = [
  'Society Onboarding & Setup',
  'Feature Overview & Capabilities',
  'Billing & Payment Inquiries',
  'Gate Operations & Security Staff',
  'General Inquiry'
];

const ContactSection = () => {
  const toast = useToast();
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: INQUIRY_CATEGORIES[0],
    subject: INQUIRY_CATEGORIES[0],
    message: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Please provide your full name';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = 'Please provide your email address';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email format';
    }

    const effectiveSubject = (formData.subject || formData.category || '').trim();
    if (!effectiveSubject) {
      errors.subject = 'Please specify an inquiry subject';
    } else if (effectiveSubject.length < 3) {
      errors.subject = 'Subject must be at least 3 characters';
    }

    if (!formData.message.trim()) {
      errors.message = 'Please provide message details';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // If category changes and subject is still the default category, update subject
      if (field === 'category' && (prev.subject === prev.category || !prev.subject)) {
        next.subject = value;
      }
      return next;
    });

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    if (!validate()) {
      if (toast && typeof toast.error === 'function') {
        toast.error('Please complete all required fields correctly before submitting.', 'Validation Error');
      }
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setServerError('');
      setSuccessMessage('');

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: (formData.subject || formData.category).trim(),
        message: formData.message.trim()
      };

      const response = await api.post('/contact', payload);
      if (response.data?.success) {
        const msg =
          response.data.message ||
          'Thank you for reaching out! Your inquiry has been sent to our operations desk.';
        setSuccessMessage(msg);
        if (toast && typeof toast.success === 'function') {
          toast.success(msg, 'Inquiry Sent');
        }
        // Only reset form on genuine success
        setFormData({
          name: '',
          email: '',
          category: INQUIRY_CATEGORIES[0],
          subject: INQUIRY_CATEGORIES[0],
          message: ''
        });
        setFieldErrors({});
      } else {
        throw new Error(response.data?.error || 'Failed to submit inquiry.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Unable to submit your inquiry at this moment. Please try again later.';
      setServerError(msg);
      if (toast && typeof toast.error === 'function') {
        toast.error(msg, 'Submission Failed');
      }
      // Never clear user-entered formData on failure so their typed message is not lost
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      style={{
        padding: 'clamp(40px, 4.5vw, 64px) var(--sh-space-6) clamp(56px, 6vw, 80px)',
        backgroundColor: 'var(--pub-bg-main)',
        transition: 'background-color 200ms ease'
      }}
    >
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* Responsive 2-Column Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'clamp(32px, 4vw, 48px)',
            alignItems: 'start'
          }}
          className="sh-contact-grid"
        >
          {/* LEFT COLUMN: Visual Panel & Direct Operational Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Visual Header */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(77, 226, 193, 0.12)',
                  border: '1px solid rgba(77, 226, 193, 0.25)',
                  color: 'var(--pub-accent-turquoise)',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '12px'
                }}
              >
                <span>Direct Communication</span>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: 'clamp(26px, 2.6vw, 34px)',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  marginBottom: '12px'
                }}
              >
                Bring Your Society Operations Together
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: 'var(--pub-text-secondary)',
                  margin: 0
                }}
              >
                Whether you are a Society Management Committee evaluating onboarding, an existing
                resident seeking portal guidance, or looking to streamline community gate operations,
                our team is ready to assist.
              </p>
            </div>

            {/* Compact Community Image Panel */}
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid var(--pub-border-subtle)',
                boxShadow: 'var(--pub-card-shadow)',
                maxHeight: '260px'
              }}
            >
              <img
                src={societyHeroImage}
                alt="Modern residential community visual representation"
                style={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover',
                  display: 'block'
                }}
                loading="lazy"
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(5, 11, 27, 0.2) 0%, rgba(5, 11, 27, 0.85) 100%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '16px 20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--pub-accent-emerald)',
                      boxShadow: '0 0 8px var(--pub-accent-emerald)'
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#ffffff',
                      letterSpacing: '0.02em'
                    }}
                  >
                    SocietyHub Support Desk • Operational Inquiries
                  </span>
                </div>
              </div>
            </div>

            {/* Factual Support Channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: 'var(--pub-bg-surface)',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--pub-accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--pub-text-primary)',
                      margin: '0 0 4px 0'
                    }}
                  >
                    Society Onboarding & Committees
                  </h4>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--pub-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5
                    }}
                  >
                    Society Secretaries and committee members can register an entire community
                    directly through the portal self-service onboarding flow.
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--pub-bg-surface)',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(77, 226, 193, 0.12)',
                    color: 'var(--pub-accent-turquoise)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--pub-text-primary)',
                      margin: '0 0 4px 0'
                    }}
                  >
                    Existing Residents & Security Staff
                  </h4>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--pub-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5
                    }}
                  >
                    For flat maintenance billing, payment receipts, or gate clearance tickets, please
                    log in directly to your dedicated portal.
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--pub-bg-surface)',
                  border: '1px solid var(--pub-border-subtle)',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 187, 69, 0.12)',
                    color: 'var(--pub-accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <MailCheck size={18} />
                </div>
                <div>
                  <h4
                    style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--pub-text-primary)',
                      margin: '0 0 4px 0'
                    }}
                  >
                    Direct Operational Queue
                  </h4>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--pub-text-secondary)',
                      margin: 0,
                      lineHeight: 1.5
                    }}
                  >
                    Inquiries submitted via this form are dispatched directly to our operational queue
                    for prompt team review.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Polished Contact / Inquiry Card */}
          <div
            style={{
              backgroundColor: 'var(--pub-bg-glass-card)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--pub-border-subtle)',
              borderRadius: '18px',
              padding: 'clamp(24px, 3.5vw, 36px)',
              boxShadow: 'var(--pub-card-shadow)'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: '22px',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.015em'
                }}
              >
                Send Us an Inquiry
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--pub-text-secondary)',
                  margin: 0,
                  lineHeight: 1.5
                }}
              >
                Fill out the form below and our operations desk will review your submission.
              </p>
            </div>

            {successMessage && (
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <CheckCircle2
                    size={20}
                    style={{ color: 'var(--pub-accent-emerald)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <div
                      style={{
                        fontWeight: '700',
                        fontSize: '14px',
                        color: 'var(--pub-accent-emerald)',
                        marginBottom: '4px'
                      }}
                    >
                      Inquiry Received
                    </div>
                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--pub-text-secondary)',
                        lineHeight: 1.5
                      }}
                    >
                      {successMessage}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {serverError && (
              <div style={{ marginBottom: '20px' }}>
                <Alert
                  variant="danger"
                  title="Submission Error"
                  onClose={() => setServerError('')}
                >
                  {serverError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="contact-name"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '6px'
                  }}
                >
                  Full Name <span style={{ color: 'var(--pub-accent-emerald)' }}>*</span>
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Rajesh Mehra"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'var(--pub-bg-surface)',
                    color: 'var(--pub-text-primary)',
                    border: fieldErrors.name ? '1px solid #ef4444' : '1px solid var(--pub-border-subtle)',
                    transition: 'all 150ms ease'
                  }}
                />
                {fieldErrors.name && (
                  <p id="contact-name-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', margin: '5px 0 0 0' }}>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="contact-email"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '6px'
                  }}
                >
                  Email Address <span style={{ color: 'var(--pub-accent-emerald)' }}>*</span>
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="e.g. rajesh@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'var(--pub-bg-surface)',
                    color: 'var(--pub-text-primary)',
                    border: fieldErrors.email ? '1px solid #ef4444' : '1px solid var(--pub-border-subtle)',
                    transition: 'all 150ms ease'
                  }}
                />
                {fieldErrors.email && (
                  <p id="contact-email-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', margin: '5px 0 0 0' }}>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Inquiry Category Dropdown */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="contact-category"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '6px'
                  }}
                >
                  Inquiry Category <span style={{ color: 'var(--pub-accent-emerald)' }}>*</span>
                </label>
                <select
                  id="contact-category"
                  name="category"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'var(--pub-bg-surface)',
                    color: 'var(--pub-text-primary)',
                    border: '1px solid var(--pub-border-subtle)',
                    transition: 'all 150ms ease'
                  }}
                >
                  {INQUIRY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Subject */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="contact-subject"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '6px'
                  }}
                >
                  Subject Title <span style={{ color: 'var(--pub-accent-emerald)' }}>*</span>
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  placeholder="e.g. Society Onboarding Inquiry for 150 Flats"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={fieldErrors.subject ? 'contact-subject-error' : undefined}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'var(--pub-bg-surface)',
                    color: 'var(--pub-text-primary)',
                    border: fieldErrors.subject ? '1px solid #ef4444' : '1px solid var(--pub-border-subtle)',
                    transition: 'all 150ms ease'
                  }}
                />
                {fieldErrors.subject && (
                  <p id="contact-subject-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', margin: '5px 0 0 0' }}>
                    {fieldErrors.subject}
                  </p>
                )}
              </div>

              {/* Message Details */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="contact-message"
                  style={{
                    display: 'block',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--pub-text-primary)',
                    marginBottom: '6px'
                  }}
                >
                  Message Details <span style={{ color: 'var(--pub-accent-emerald)' }}>*</span>
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  placeholder="Please describe your housing society, location, or any specific questions you have..."
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    lineHeight: 1.5,
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    backgroundColor: 'var(--pub-bg-surface)',
                    color: 'var(--pub-text-primary)',
                    border: fieldErrors.message ? '1px solid #ef4444' : '1px solid var(--pub-border-subtle)',
                    transition: 'all 150ms ease'
                  }}
                />
                {fieldErrors.message && (
                  <p id="contact-message-error" role="alert" style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px', margin: '5px 0 0 0' }}>
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="sh-btn-luxury"
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--pub-accent-emerald)',
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: '700',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Submitting Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Submit Inquiry</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 960px) {
          .sh-contact-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};

export default ContactSection;
