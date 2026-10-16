import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { User, Mail, Shield, CheckCircle } from 'lucide-react';

const AdminProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        setProfile(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  if (!profile) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading profile...</div></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 24px 0' }}>Admin Profile</h2>
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', color: '#0f172a' }}>{profile.name}</h3>
            <span style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>{profile.role}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
              <User size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Full Name</p>
              <p style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>{profile.name}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
              <Mail size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Email Address</p>
              <p style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>{profile.email}</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
              <Shield size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>Role & Privileges</p>
              <p style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>Full Society Access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
