import React, { useContext, useState } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { User, Mail, Shield, Smartphone, Save } from 'lucide-react';

const StaffProfile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({ name: user.name, email: user.email, mobile: user.mobile || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.put('/users/me', formData);
      setUser(res.data.data);
      alert('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>My Profile</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Manage your personal details</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ backgroundColor: '#1e293b', height: '100px' }}></div>
        <div style={{ padding: '0 32px 32px 32px', position: 'relative' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#3b82f6', 
            border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: 'white', fontSize: '2rem', fontWeight: '700', marginTop: '-40px', marginBottom: '24px' 
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Full Name
              </label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={16} /> Email Address
              </label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                required 
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} /> Mobile Number (Optional)
              </label>
              <input 
                type="text" 
                value={formData.mobile} 
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Role
              </label>
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '1rem', color: '#64748b', fontWeight: '500' }}>
                {user.role}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '12px', padding: '12px', backgroundColor: '#10b981', color: 'white', 
                border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', 
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Save size={18} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
