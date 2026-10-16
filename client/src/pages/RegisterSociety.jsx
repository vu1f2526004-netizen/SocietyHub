import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
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
  ShieldCheck
} from 'lucide-react';

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
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px'
      }}
    >
      <div
        style={{
          maxWidth: '680px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          border: '1px solid #e2e8f0',
          padding: '36px 32px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              marginBottom: '16px'
            }}
          >
            <Building2 size={32} />
          </div>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Register Your Society
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '480px',
              marginInline: 'auto'
            }}
          >
            Set up an independent digital community hub for your residential complex and create the founding administrator account.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            id="register-society-error-alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '24px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
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
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                marginBottom: '20px'
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
              Society Registered Successfully!
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              <strong>{successData.society?.name}</strong> has been created with administrator{' '}
              <strong>{successData.user?.email}</strong>.
            </p>

            {/* Join Code Highlight Box */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '28px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#15803d',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}
              >
                <KeyRound size={18} />
                <span>OFFICIAL SOCIETY JOIN CODE</span>
              </div>
              <div
                id="registered-join-code-display"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.8rem',
                  fontWeight: '800',
                  letterSpacing: '0.1em',
                  color: '#166534',
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #86efac',
                  display: 'inline-block'
                }}
              >
                {successData.society?.joinCode}
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.825rem', marginTop: '12px', marginBottom: 0 }}>
                Residents of your society will use this unique code to join this society during resident signup.
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
                padding: '12px 20px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <span>Proceed to Login</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Section 1: Society Details */}
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}
              >
                <Building2 size={18} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                  1. Residential Society Details
                </h4>
              </div>

              {/* Society Name */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="societyName"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                >
                  Society Name <span style={{ color: '#dc2626' }}>*</span>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.societyName ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                {fieldErrors.societyName && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.societyName}
                  </span>
                )}
              </div>

              {/* Street Address */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="address"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                >
                  Street Address <span style={{ color: '#dc2626' }}>*</span>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.address ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                {fieldErrors.address && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.address}
                  </span>
                )}
              </div>

              {/* City, State, Postal Code Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="city"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    City <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.city ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.city && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.city}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="state"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    State <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.state ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.state && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.state}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="postalCode"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    Postal Code <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.postalCode ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.postalCode && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.postalCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Secretary / Admin Account */}
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '16px'
                }}
              >
                <ShieldCheck size={18} color="#2563eb" />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                  2. Administrator / Secretary Account
                </h4>
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label
                  htmlFor="name"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                >
                  Secretary Full Name <span style={{ color: '#dc2626' }}>*</span>
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
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.name ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
                {fieldErrors.name && (
                  <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Email & Mobile Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label
                    htmlFor="email"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    Email Address <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.email ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.email && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="mobile"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    Mobile Number <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.mobile ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.mobile && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
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
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    Password (min 6 chars) <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.password ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.password && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.password}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                  >
                    Confirm Password <span style={{ color: '#dc2626' }}>*</span>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.confirmPassword ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {fieldErrors.confirmPassword && (
                    <span style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {fieldErrors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="register-society-submit-btn"
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
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
        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          <div>
            <span>Already have an account? </span>
            <Link
              id="register-to-login-link"
              to="/login"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span>Are you a resident joining an existing society? </span>
            <Link
              id="register-to-signup-link"
              to="/signup"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
            >
              Resident Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSociety;
