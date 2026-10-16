import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { User, Mail, Home, Phone, Car } from 'lucide-react';

const ResidentProfile = () => {
  const { user } = useContext(AuthContext);

  const ProfileField = ({ icon: Icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#64748b' }}>{label}</p>
        <p style={{ margin: 0, fontWeight: '500', color: '#1e293b' }}>{value || 'Not provided'}</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '24px' }}>My Profile</h2>
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ backgroundColor: '#1e293b', height: '120px', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', bottom: '-40px', left: '32px', width: '80px', height: '80px', 
            borderRadius: '50%', backgroundColor: '#e0f2fe', border: '4px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '2rem', fontWeight: 'bold'
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
        
        <div style={{ padding: '50px 32px 32px 32px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{user?.name}</h3>
            <span style={{ display: 'inline-block', padding: '4px 10px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
              {user?.role}
            </span>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <ProfileField icon={User} label="Full Name" value={user?.name} />
            <ProfileField icon={Mail} label="Email Address" value={user?.email} />
            <ProfileField icon={Home} label="Flat Number" value={user?.flatNumber} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentProfile;
