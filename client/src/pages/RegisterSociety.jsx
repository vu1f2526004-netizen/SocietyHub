import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PublicNavbar from './Public/components/PublicNavbar';
import {
  Building2,
  MapPin,
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import societyRegisterImg from '../assets/society-register.jpg';

const RegisterSociety = () => {
  const [formData, setFormData] = useState({
    societyName: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { registerSociety, user } = useContext(AuthContext);
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

  const validateField = (fieldName, value, allValues = formData) => {
    switch (fieldName) {
      case 'societyName':
        if (!value.trim()) return 'Society name is required';
        if (value.trim().length > 100) return 'Society name cannot exceed 100 characters';
        return '';
      case 'address':
        if (!value.trim()) return 'Street address is required';
        return '';
      case 'city':
        if (!value.trim()) return 'City is required';
        return '';
      case 'state':
        if (!value.trim()) return 'State is required';
        return '';
      case 'postalCode':
        if (!value.trim()) return 'Postal / PIN code is required';
        if (!/^[0-9]{4,10}$/.test(value.trim())) return 'Enter a valid postal code (4 to 10 digits)';
        return '';
      case 'name':
        if (!value.trim()) return 'Secretary full name is required';
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
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    if (fieldErrors[name]) {
      const error = validateField(name, value, nextFormData);
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
      const res = await registerSociety(formData);
      setSuccessData(res);
    } catch (err) {
      setServerError(
        err.response?.data?.error || 'Registration failed. Please verify your details and try again.'
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
          className="sh-auth-card-grid sh-auth-card-grid-wide"
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
                src={societyRegisterImg}
                alt="Contemporary luxury residential society towers with grand clubhouse pavilion"
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
                <span>Society Digital Workspace</span>
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
                  Create Your Society's Digital Home.
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#CBD5E1',
                    margin: '0 0 16px 0'
                  }}
                >
                  Set up your society workspace and submit your registration for the appropriate approval process.
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
                    <Building2 size={13} />
                    Complete Complex Setup
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
                    <ShieldCheck size={13} />
                    Secretary Portal
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
                    <KeyRound size={13} />
                    Instant Join Code
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Register Society Form */}
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
                <span>RWA & Management Committee</span>
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
                Register Your Society
              </h2>
              <p
                style={{
                  fontSize: '14.5px',
                  color: 'var(--pub-text-secondary)',
                  margin: 0,
                  lineHeight: 1.5
                }}
              >
                Set up an independent digital community hub for your residential complex and establish the founding administrator account.
              </p>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div
                id="register-society-error-alert"
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
                  marginBottom: '20px'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{serverError}</span>
              </div>
            )}

            {/* Success Screen with Join Code */}
            {successData ? (
              <div id="register-society-success-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#DCFCE7',
                    color: '#10B981',
                    marginBottom: '18px',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <CheckCircle2 size={36} />
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
                  Society Registered Successfully!
                </h3>
                <p style={{ color: 'var(--pub-text-secondary)', fontSize: '14.5px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                  <strong>{successData.society?.name}</strong> has been created with administrator{' '}
                  <strong>{successData.user?.email}</strong>.
                </p>

                {/* Join Code Highlight Box */}
                <div
                  style={{
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4',
                    border: isDark ? '1px solid rgba(77, 226, 193, 0.25)' : '1px solid #BBF7D0',
                    borderRadius: '14px',
                    padding: '20px',
                    marginBottom: '24px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: isDark ? '#4DE2C1' : '#15803D',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '10px'
                    }}
                  >
                    <KeyRound size={17} />
                    <span>Official Society Join Code</span>
                  </div>
                  <div
                    id="registered-join-code-display"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1.9rem',
                      fontWeight: '800',
                      letterSpacing: '0.12em',
                      color: isDark ? '#A7F3D0' : '#166534',
                      padding: '10px 20px',
                      backgroundColor: isDark ? '#050B1B' : '#FFFFFF',
                      borderRadius: '10px',
                      border: isDark ? '1px dashed rgba(77, 226, 193, 0.4)' : '1px dashed #86EFAC',
                      display: 'inline-block'
                    }}
                  >
                    {successData.society?.joinCode}
                  </div>
                  <p style={{ color: 'var(--pub-text-secondary)', fontSize: '13px', marginTop: '12px', marginBottom: 0 }}>
                    Residents of your society will use this unique code to submit registration requests.
                  </p>
                </div>

                <button
                  id="proceed-to-login-btn"
                  onClick={() =>
                    navigate('/login', {
                      state: {
                        email: successData.user?.email,
                        successMessage: `Society registered! Sign in with ${successData.user?.email}.`
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
              <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Section 1: Society Details */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--pub-border-subtle)',
                      marginBottom: '14px'
                    }}
                  >
                    <Building2 size={17} color={isDark ? '#4DE2C1' : '#10B981'} />
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: 'var(--pub-text-primary)' }}>
                      1. Residential Society Details
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Society Name */}
                    <div>
                      <label
                        htmlFor="societyName"
                        style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                      >
                        Society Name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        id="societyName"
                        name="societyName"
                        type="text"
                        placeholder="e.g. Royal Palms Residential Complex"
                        value={formData.societyName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 12px',
                          borderRadius: '10px',
                          fontSize: '14.5px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.societyName ? '#EF4444' : undefined
                        }}
                      />
                      {fieldErrors.societyName && (
                        <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {fieldErrors.societyName}
                        </span>
                      )}
                    </div>

                    {/* Street Address */}
                    <div>
                      <label
                        htmlFor="address"
                        style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                      >
                        Street Address <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        placeholder="e.g. Plot 42, Sector 15, Palm Boulevard"
                        value={formData.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 12px',
                          borderRadius: '10px',
                          fontSize: '14.5px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.address ? '#EF4444' : undefined
                        }}
                      />
                      {fieldErrors.address && (
                        <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {fieldErrors.address}
                        </span>
                      )}
                    </div>

                    {/* City, State, Postal Code Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label
                          htmlFor="city"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          City <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={formData.city}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.city ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.city && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.city}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="state"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          State <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="state"
                          name="state"
                          type="text"
                          placeholder="e.g. Maharashtra"
                          value={formData.state}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.state ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.state && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.state}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="postalCode"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          Postal Code <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="postalCode"
                          name="postalCode"
                          type="text"
                          placeholder="e.g. 400001"
                          value={formData.postalCode}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.postalCode ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.postalCode && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.postalCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Secretary / Admin Account */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid var(--pub-border-subtle)',
                      marginBottom: '14px'
                    }}
                  >
                    <ShieldCheck size={17} color={isDark ? '#4DE2C1' : '#10B981'} />
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: 'var(--pub-text-primary)' }}>
                      2. Administrator / Secretary Account
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="name"
                        style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                      >
                        Secretary Full Name <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          height: '42px',
                          padding: '0 12px',
                          borderRadius: '10px',
                          fontSize: '14.5px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          borderColor: fieldErrors.name ? '#EF4444' : undefined
                        }}
                      />
                      {fieldErrors.name && (
                        <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>

                    {/* Email & Mobile Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label
                          htmlFor="email"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          Email Address <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="secretary@society.com"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.email ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.email && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.email}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="mobile"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          Mobile Number <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="mobile"
                          name="mobile"
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={formData.mobile}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.mobile ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.mobile && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.mobile}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Password & Confirm Password Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label
                          htmlFor="password"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          Password (min 6 chars) <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.password ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.password && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.password}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="confirmPassword"
                          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: isDark ? '#CBD5E1' : '#334155', marginBottom: '6px' }}
                        >
                          Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={isSubmitting}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            borderColor: fieldErrors.confirmPassword ? '#EF4444' : undefined
                          }}
                        />
                        {fieldErrors.confirmPassword && (
                          <span style={{ color: '#EF4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                            {fieldErrors.confirmPassword}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="register-society-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    marginTop: '4px',
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
                      <span>Registering Society...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Society & Admin Account</span>
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
                  id="register-to-login-link"
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
                <span>Are you a resident joining an existing society?</span>
                <Link
                  id="register-to-join-link"
                  to="/join-society"
                  style={{
                    color: isDark ? '#4DE2C1' : '#059669',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Join Existing Society &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSociety;
