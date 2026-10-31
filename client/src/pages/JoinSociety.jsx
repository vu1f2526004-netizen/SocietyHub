import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatErrorMessage } from '../utils/formatError';
import PublicNavbar from './Public/components/PublicNavbar';
import {
  KeyRound,
  User,
  Mail,
  Phone,
  Home,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  ArrowRight,
  Clock,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import societyJoinImg from '../assets/society-join.jpg';

const JoinSociety = () => {
  const [formData, setFormData] = useState({
    joinCode: '',
    name: '',
    email: '',
    mobile: '',
    flatNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { joinSociety, user } = useContext(AuthContext);
  const { theme, isDark } = useTheme();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Resident') navigate('/resident');
      else if (user.role === 'SecurityStaff') navigate('/staff');
    }
  }, [user, navigate]);

  const validateField = (name, value, allValues = formData) => {
    switch (name) {
      case 'joinCode':
        if (!value.trim()) return 'Society Join Code is required';
        if (value.trim().length < 4) return 'Please enter a valid Join Code (e.g. SOC-XXXXXX)';
        return '';
      case 'name':
        if (!value.trim()) return 'Full name is required';
        return '';
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(value.trim())) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'mobile':
        if (!value.trim()) return 'Mobile number is required';
        if (!/^\+?[0-9]{10,15}$/.test(value.trim())) {
          return 'Enter a valid mobile number (10 to 15 digits)';
        }
        return '';
      case 'flatNumber':
        if (!value.trim()) return 'Flat number is required';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== allValues.password) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === 'joinCode' ? value.toUpperCase() : value;
    const nextFormData = { ...formData, [name]: formattedValue };
    setFormData(nextFormData);

    if (fieldErrors[name]) {
      const error = validateField(name, formattedValue, nextFormData);
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
    if (name === 'password' && formData.confirmPassword) {
      const confirmErr = validateField('confirmPassword', formData.confirmPassword, nextFormData);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value, formData);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const errors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key], formData);
      if (err) errors[key] = err;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateAll()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await joinSociety({
        joinCode: formData.joinCode.trim().toUpperCase(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        flatNumber: formData.flatNumber.trim(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim()
      });
      setSuccessData(res);
    } catch (err) {
      setServerError(
        formatErrorMessage(err, 'Registration failed. Please check your details and try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`sh-public-site ${isDark ? 'sh-dark' : 'sh-light'}`}
      data-theme={theme}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--sh-font-sans)',
        backgroundColor: 'var(--pub-bg-main)',
        color: 'var(--pub-text-primary)',
        overflowX: 'hidden',
        width: '100%',
        transition: 'background-color 250ms ease, color 250ms ease'
      }}
    >
      {/* Shared Public Navbar */}
      <PublicNavbar />

      {/* Main Split Screen Container */}
      <div className="sh-auth-container">
        <div
          className="sh-auth-card-grid"
          style={{
            backgroundColor: isDark ? 'var(--pub-bg-surface)' : '#FFFFFF',
            border: '1px solid var(--pub-border-subtle)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.1)'
              : 'var(--pub-card-shadow)'
          }}
        >
          {/* LEFT PANEL: Residential Visual & Floating Information Badges */}
          <div
            className="sh-auth-image-column"
            style={{
              backgroundColor: isDark ? '#050B1B' : '#F8FAFC'
            }}
          >
            {/* Visual Image with Floating Animation */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden'
              }}
            >
              <img
                src={societyJoinImg}
                alt="Modern gated Indian residential apartment community entrance and landscaped courtyard"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
                className="sh-float-auth-image"
                loading="eager"
              />
              {/* Rich Vignette Gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: isDark
                    ? 'linear-gradient(180deg, rgba(5, 11, 27, 0.42) 0%, rgba(5, 11, 27, 0.88) 100%)'
                    : 'linear-gradient(180deg, rgba(15, 23, 42, 0.22) 0%, rgba(15, 23, 42, 0.84) 100%)'
                }}
              />
            </div>

            {/* Top Pill on Image */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(5, 11, 27, 0.75)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(77, 226, 193, 0.3)',
                  color: '#4DE2C1',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              >
                <Sparkles size={14} />
                <span>Verified Resident Onboarding</span>
              </div>
            </div>

            {/* Bottom Glassmorphism Hero Message */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div
                style={{
                  backgroundColor: 'rgba(13, 22, 41, 0.82)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '24px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                }}
              >
                <h3
                  style={{
                    fontFamily: 'var(--sh-font-heading)',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#ffffff',
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3
                  }}
                >
                  Find Your Community on SocietyHub.
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#CBD5E1',
                    margin: '0 0 16px 0'
                  }}
                >
                  Connect to your existing housing society through its verified Join Code.
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#6EE7B7',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}
                  >
                    <ShieldCheck size={13} />
                    Verified Flat Access
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(77, 226, 193, 0.15)',
                      border: '1px solid rgba(77, 226, 193, 0.35)',
                      color: '#A7F3D0',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}
                  >
                    <KeyRound size={13} />
                    Join Code Verification
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 187, 69, 0.15)',
                      border: '1px solid rgba(245, 187, 69, 0.35)',
                      color: '#FDE68A',
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}
                  >
                    <Home size={13} />
                    Tenant & Owner
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Join Society Form */}
          <div
            style={{
              padding: 'clamp(28px, 3.5vw, 44px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '22px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  border: isDark ? '1px solid rgba(77, 226, 193, 0.25)' : '1px solid #A7F3D0',
                  color: isDark ? '#4DE2C1' : '#059669',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                <span>Resident Onboarding</span>
              </div>
              <h2
                style={{
                  fontFamily: 'var(--sh-font-heading)',
                  fontSize: 'clamp(24px, 2.5vw, 30px)',
                  fontWeight: '700',
                  color: 'var(--pub-text-primary)',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em'
                }}
              >
                Join Your Society
              </h2>
              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--pub-text-secondary)',
                  margin: 0,
                  lineHeight: 1.5
                }}
              >
                Enter your residential society's Join Code to submit your resident registration.
              </p>
            </div>

            {/* Informational Notice */}
            {!successData && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  backgroundColor: isDark ? 'rgba(77, 226, 193, 0.08)' : '#F0FDF4',
                  border: isDark ? '1px solid rgba(77, 226, 193, 0.22)' : '1px solid #BBF7D0',
                  borderRadius: '10px',
                  color: isDark ? '#A7F3D0' : '#166534',
                  fontSize: '13px',
                  marginBottom: '18px',
                  lineHeight: 1.45
                }}
              >
                <KeyRound size={17} style={{ flexShrink: 0, marginTop: '2px', color: isDark ? '#4DE2C1' : '#15803D' }} />
                <span>
                  <strong>Have your Join Code ready:</strong> Provided by your society secretary or RWA. Upon submission, your resident request is sent for administrator approval.
                </span>
              </div>
            )}

            {/* Server Error Alert */}
            {serverError && (
              <div
                id="join-society-error-alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 16px',
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#EF4444',
                  fontSize: '13.5px',
                  marginBottom: '18px'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{typeof serverError === 'string' ? serverError : formatErrorMessage(serverError)}</span>
              </div>
            )}

            {/* Success Card */}
            {successData ? (
              <div id="join-society-success-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(245, 187, 69, 0.16)' : '#FEF3C7',
                    color: '#F5BB45',
                    marginBottom: '18px',
                    border: '1px solid rgba(245, 187, 69, 0.3)'
                  }}
                >
                  <Clock size={36} />
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--sh-font-heading)',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--pub-text-primary)',
                    margin: '0 0 10px 0'
                  }}
                >
                  Registration Request Submitted!
                </h3>

                <p style={{ color: 'var(--pub-text-secondary)', fontSize: '14px', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                  Your account request for <strong>{successData.user?.societyName || 'your society'}</strong> (Flat: <strong>{successData.user?.flatNumber}</strong>) has been submitted.
                </p>

                <div
                  style={{
                    backgroundColor: isDark ? 'rgba(245, 187, 69, 0.1)' : '#FFFBEB',
                    border: isDark ? '1px solid rgba(245, 187, 69, 0.25)' : '1px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isDark ? '#FDE68A' : '#92400E', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>
                    <CheckCircle2 size={16} />
                    <span>Status: Pending Approval</span>
                  </div>
                  <p style={{ color: isDark ? '#CBD5E1' : '#78350F', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                    Your society administrator will review and approve your account. Once approved, you can log in with <strong>{successData.user?.email}</strong> and your password.
                  </p>
                </div>

                <button
                  id="join-proceed-to-login-btn"
                  onClick={() =>
                    navigate('/login', {
                      state: {
                        email: successData.user?.email,
                        successMessage: 'Registration submitted. Please log in once your society administrator approves your account.'
                      }
                    })
                  }
                  style={{
                    width: '100%',
                    height: '46px',
                    backgroundColor: 'var(--pub-accent-emerald)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                    transition: 'all 200ms ease'
                  }}
                  className="sh-btn-luxury"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Society Join Code */}
                <div>
                  <label
                    htmlFor="joinCode"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#CBD5E1' : '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Society Join Code <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                    <input
                      id="joinCode"
                      name="joinCode"
                      type="text"
                      placeholder="e.g. SOC-8K4M9P"
                      value={formData.joinCode}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 12px 0 38px',
                        borderRadius: '10px',
                        fontSize: '14.5px',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        letterSpacing: '0.05em',
                        outline: 'none',
                        boxSizing: 'border-box',
                        borderColor: fieldErrors.joinCode ? '#EF4444' : undefined
                      }}
                    />
                  </div>
                  {fieldErrors.joinCode && (
                    <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.joinCode}
                    </span>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="join-name"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#CBD5E1' : '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Full Name <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                    <input
                      id="join-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 12px 0 38px',
                        borderRadius: '10px',
                        fontSize: '14.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        borderColor: fieldErrors.name ? '#EF4444' : undefined
                      }}
                    />
                  </div>
                  {fieldErrors.name && (
                    <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="join-email"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: isDark ? '#CBD5E1' : '#334155',
                      marginBottom: '6px'
                    }}
                  >
                    Email Address <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                    <input
                      id="join-email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        height: '44px',
                        padding: '0 12px 0 38px',
                        borderRadius: '10px',
                        fontSize: '14.5px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        borderColor: fieldErrors.email ? '#EF4444' : undefined
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                {/* Mobile & Flat Number Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label
                      htmlFor="join-mobile"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Mobile <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                      <input
                        id="join-mobile"
                        name="mobile"
                        type="tel"
                        placeholder="9876543210"
                        value={formData.mobile}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 12px 0 38px',
                          borderRadius: '10px',
                          fontSize: '14.5px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.mobile ? '#EF4444' : undefined
                        }}
                      />
                    </div>
                    {fieldErrors.mobile && (
                      <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {fieldErrors.mobile}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="join-flatNumber"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Flat Number <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Home size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                      <input
                        id="join-flatNumber"
                        name="flatNumber"
                        type="text"
                        placeholder="e.g. A-101"
                        value={formData.flatNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 12px 0 38px',
                          borderRadius: '10px',
                          fontSize: '14.5px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.flatNumber ? '#EF4444' : undefined
                        }}
                      />
                    </div>
                    {fieldErrors.flatNumber && (
                      <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {fieldErrors.flatNumber}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label
                      htmlFor="join-password"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Password <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                      <input
                        id="join-password"
                        name="password"
                        type="password"
                        placeholder="Min 6 chars"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 12px 0 38px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.password ? '#EF4444' : undefined
                        }}
                      />
                    </div>
                    {fieldErrors.password && (
                      <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {fieldErrors.password}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="join-confirmPassword"
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: isDark ? '#CBD5E1' : '#334155',
                        marginBottom: '6px'
                      }}
                    >
                      Confirm <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={17} style={{ position: 'absolute', top: '14px', left: '13px', color: '#94A3B8' }} />
                      <input
                        id="join-confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Repeat"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 12px 0 38px',
                          borderRadius: '10px',
                          fontSize: '14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.confirmPassword ? '#EF4444' : undefined
                        }}
                      />
                    </div>
                    {fieldErrors.confirmPassword && (
                      <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {fieldErrors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="join-society-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: '8px',
                    height: '48px',
                    backgroundColor: isSubmitting ? '#059669' : undefined,
                    background: isSubmitting ? undefined : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15.5px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                    transition: 'all 200ms ease'
                  }}
                  className="sh-btn-luxury"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Join Request</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Navigation */}
            <div
              style={{
                marginTop: '22px',
                paddingTop: '18px',
                borderTop: '1px solid var(--pub-border-subtle)',
                fontSize: '13.5px',
                color: 'var(--pub-text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>Already registered with your society?</span>
                <Link
                  id="join-to-login-link"
                  to="/login"
                  style={{
                    color: isDark ? '#4DE2C1' : '#059669',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Sign In &rarr;
                </Link>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>Registering a new housing society?</span>
                <Link
                  id="join-to-register-society-link"
                  to="/register-society"
                  style={{
                    color: isDark ? '#4DE2C1' : '#059669',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Register Society &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSociety;
