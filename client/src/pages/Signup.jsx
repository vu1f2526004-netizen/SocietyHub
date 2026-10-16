import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, Home, Lock, AlertCircle, CheckCircle2, Loader2, Building2 } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    flatNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'Admin') navigate('/admin');
      else if (user.role === 'Resident') navigate('/resident');
      else if (user.role === 'SecurityStaff') navigate('/staff');
    }
  }, [user, navigate]);

  const validateField = (name, value, allValues = formData) => {
    switch (name) {
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
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);

    // Validate on change if there was already an error
    if (fieldErrors[name]) {
      const error = validateField(name, value, updatedForm);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }

    if (name === 'password' && fieldErrors.confirmPassword) {
      const confirmErr = validateField('confirmPassword', updatedForm.confirmPassword, updatedForm);
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value, formData);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const errors = {};
    Object.keys(formData).forEach(field => {
      const err = validateField(field, formData[field], formData);
      if (err) errors[field] = err;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError('');
    setSuccessMessage('');

    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        flatNumber: formData.flatNumber.trim(),
        password: formData.password.trim(),
        confirmPassword: formData.confirmPassword.trim()
      });

      setSuccessMessage(res.message || 'Account created successfully! Redirecting to login...');
      
      // Navigate to login after 1.5 seconds, passing email and success message in state
      setTimeout(() => {
        navigate('/login', {
          state: {
            successMessage: 'Registration successful! Please login with your credentials.',
            email: formData.email.trim()
          }
        });
      }, 1500);

    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
      setServerError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
        border: '1px solid #e2e8f0',
        padding: '36px 32px',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            marginBottom: '16px'
          }}>
            <Building2 size={28} />
          </div>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: '700',
            color: '#0f172a',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            Create Your SocietyHub Account
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#64748b',
            margin: 0
          }}>
            Register to access your society services.
          </p>
        </div>

        {/* Join Society Direct Notice */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e40af' }}>
              Joining with a Society Join Code?
            </div>
            <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '2px' }}>
              Join your specific community on the dedicated page.
            </div>
          </div>
          <Link
            id="signup-to-join-society-banner-btn"
            to="/join-society"
            style={{
              padding: '6px 12px',
              backgroundColor: '#2563eb',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: '600',
              borderRadius: '6px',
              textDecoration: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Join Society →
          </Link>
        </div>

        {/* Global Error Banner */}
        {serverError && (
          <div style={{
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
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#16a34a',
            fontSize: '0.875rem',
            marginBottom: '20px'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
              <input
                id="signup-name"
                type="text"
                name="name"
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: `1px solid ${fieldErrors.name ? '#ef4444' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {fieldErrors.name && (
              <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
              <input
                id="signup-email"
                type="email"
                name="email"
                placeholder="e.g. resident@society.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '8px',
                  border: `1px solid ${fieldErrors.email ? '#ef4444' : '#cbd5e1'}`,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {fieldErrors.email && (
              <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Mobile & Flat Number Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Mobile Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                <input
                  id="signup-mobile"
                  type="tel"
                  name="mobile"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.mobile ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.mobile && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                  {fieldErrors.mobile}
                </p>
              )}
            </div>

            {/* Flat Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                Flat Number
              </label>
              <div style={{ position: 'relative' }}>
                <Home size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                <input
                  id="signup-flat"
                  type="text"
                  name="flatNumber"
                  placeholder="e.g. B-204"
                  value={formData.flatNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.flatNumber ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.flatNumber && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                  {fieldErrors.flatNumber}
                </p>
              )}
            </div>
          </div>

          {/* Password & Confirm Password Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                <input
                  id="signup-password"
                  type="password"
                  name="password"
                  placeholder="Min 6 chars"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.password ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.password && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                <input
                  id="signup-confirmpassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: `1px solid ${fieldErrors.confirmPassword ? '#ef4444' : '#cbd5e1'}`,
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '4px', textAlign: 'left' }}>
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="signup-submit-btn"
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '10px',
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
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          <div>
            <span>Already have an account? </span>
            <Link
              id="signup-to-login-link"
              to="/login"
              style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
            >
              Login
            </Link>
          </div>
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span>Registering a new housing society? </span>
            <Link
              id="signup-to-register-society-link"
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

export default Signup;
