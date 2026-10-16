import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
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
  Clock
} from 'lucide-react';

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
        err.response?.data?.error || 'Registration failed. Please check your details and try again.'
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
        padding: '24px 16px'
      }}
    >
      <div
        style={{
          maxWidth: '560px',
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
            <Building2 size={30} />
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: '700',
              color: '#0f172a',
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em'
            }}
          >
            Join Your Society
          </h1>
          <p
            style={{
              fontSize: '0.925rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Enter your residential society's Join Code to request resident registration.
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
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              color: '#0369a1',
              fontSize: '0.85rem',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            <KeyRound size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Have your Join Code ready:</strong> Obtained from your society secretary or management committee. Upon submission, your account will be pending administrator approval.
            </span>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div
            id="join-society-error-alert"
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
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{serverError}</span>
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
                backgroundColor: '#fef3c7',
                color: '#d97706',
                marginBottom: '18px'
              }}
            >
              <Clock size={36} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>
              Registration Request Submitted!
            </h3>

            <p style={{ color: '#4b5563', fontSize: '0.925rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Your account request for <strong>{successData.user?.societyName || 'your society'}</strong> (Flat: <strong>{successData.user?.flatNumber}</strong>) has been submitted.
            </p>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '24px',
                textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>
                <CheckCircle2 size={16} />
                <span>Status: Pending Approval</span>
              </div>
              <p style={{ color: '#78350f', fontSize: '0.825rem', margin: 0, lineHeight: 1.5 }}>
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
              <span>Back to Login</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Society Join Code */}
            <div>
              <label
                htmlFor="joinCode"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
              >
                Society Join Code <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.joinCode ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.95rem',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.joinCode && (
                <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.joinCode}
                </span>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
              >
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.name ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.name && (
                <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
              >
                Email Address <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.email ? '#dc2626' : '#cbd5e1'}`,
                    outline: 'none',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.email && (
                <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Mobile & Flat Number Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="mobile"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
                >
                  Mobile Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.mobile ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {fieldErrors.mobile && (
                  <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.mobile}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="flatNumber"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
                >
                  Flat Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Home size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.flatNumber ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {fieldErrors.flatNumber && (
                  <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.flatNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Password & Confirm Password Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label
                  htmlFor="password"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
                >
                  Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
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
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.password ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {fieldErrors.password && (
                  <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    {fieldErrors.password}
                  </span>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}
                >
                  Confirm Password <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                  <input
                    id="join-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '8px',
                      border: `1px solid ${fieldErrors.confirmPassword ? '#dc2626' : '#cbd5e1'}`,
                      outline: 'none',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <span style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
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
                padding: '12px 20px',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: 'white',
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
                  <span>Submitting Join Request...</span>
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
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          <div>
            <span>Already have an account? </span>
            <Link
              id="join-to-login-link"
              to="/login"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
            >
              Log in
            </Link>
          </div>
          <div style={{ marginTop: '8px' }}>
            <span>Registering a new housing society instead? </span>
            <Link
              id="join-to-register-society-link"
              to="/register-society"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
            >
              Register Society
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSociety;
