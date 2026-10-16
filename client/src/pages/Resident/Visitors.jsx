import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, UserCheck, UserX, Clock, Car, FileText } from 'lucide-react';

const Visitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    expectedDate: '',
    expectedTime: '',
    purpose: '',
    vehicleNumber: ''
  });

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await api.get('/visitors/my');
      setVisitors(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisitors(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/visitors', formData);
      alert('Visitor expected request created');
      setShowForm(false);
      setFormData({ name: '', mobile: '', expectedDate: '', expectedTime: '', purpose: '', vehicleNumber: '' });
      fetchVisitors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create visitor request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Expected': return { bg: '#fef3c7', text: '#d97706', icon: Clock };
      case 'Entered': return { bg: '#dcfce7', text: '#166534', icon: UserCheck };
      case 'Exited': return { bg: '#f1f5f9', text: '#475569', icon: Clock };
      case 'Denied': return { bg: '#fee2e2', text: '#dc2626', icon: UserX };
      case 'Cancelled': return { bg: '#f1f5f9', text: '#94a3b8', icon: UserX };
      default: return { bg: '#f1f5f9', text: '#475569', icon: UserCheck };
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading visitors...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>My Visitors</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#0f172a', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '500', transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#334155'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
        >
          {showForm ? <FileText size={18} /> : <UserPlus size={18} />}
          {showForm ? 'View List' : 'Add Visitor'}
        </button>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Pre-approve a Visitor</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Visitor Name*</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Mobile Number*</label>
              <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Expected Date*</label>
              <input type="date" name="expectedDate" value={formData.expectedDate} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Expected Time</label>
              <input type="time" name="expectedTime" value={formData.expectedTime} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Purpose of Visit*</label>
              <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Vehicle Number (Optional)</label>
              <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                Submit Visitor Request
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {visitors.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <UserPlus size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No visitors found</h3>
              <p style={{ margin: 0 }}>You have no expected or past visitors.</p>
            </div>
          ) : (
            visitors.map(v => {
              const { bg, text, icon: StatusIcon } = getStatusColor(v.status);
              return (
                <div key={v._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>{v.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '500', color: '#334155' }}>Purpose:</span> {v.purpose}
                      </p>
                    </div>
                    <span style={{ backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <StatusIcon size={12} />
                      {v.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#94a3b8" />
                      <span>{new Date(v.expectedDate).toLocaleDateString()} {v.expectedTime && `at ${v.expectedTime}`}</span>
                    </div>
                    {v.vehicleNumber && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Car size={16} color="#94a3b8" />
                        <span>{v.vehicleNumber}</span>
                      </div>
                    )}
                  </div>
                  
                  {(v.entryTimestamp || v.exitTimestamp) && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      {v.entryTimestamp && <span>In: {new Date(v.entryTimestamp).toLocaleTimeString()}</span>}
                      {v.exitTimestamp && <span>Out: {new Date(v.exitTimestamp).toLocaleTimeString()}</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Visitors;
