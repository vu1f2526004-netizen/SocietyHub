import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import { AlertTriangle, MapPin, Camera, Shield, Eye, Info, Car } from 'lucide-react';

const CommunityIssues = () => {
  const [issues, setIssues] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', issueType: '', description: '', location: '', vehicleNumber: '' });
  const [file, setFile] = useState(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/issues');
      setIssues(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIssues(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) data.append('photo', file);
      
      await api.post('/issues', data);
      alert('Issue reported successfully. It will be public after Admin approval.');
      setShowForm(false);
      setFormData({ title: '', issueType: '', description: '', location: '', vehicleNumber: '' });
      setFile(null);
      fetchIssues();
    } catch (err) {
      alert(err.response?.data?.error || 'Error submitting issue');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'Approved': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Resolved': return { bg: '#dcfce7', text: '#166534' };
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading issues...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Community Issues</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>View and report common society problems</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#f59e0b', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '600', transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#d97706'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#f59e0b'}
        >
          <AlertTriangle size={18} />
          {showForm ? 'View Feed' : 'Report Issue'}
        </button>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Report a Community Issue</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '24px', color: '#64748b', fontSize: '0.875rem' }}>
            <Shield size={16} />
            <span>Your identity is kept completely private and will not be visible in the public feed.</span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Issue Title*</label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Garbage dumped in hallway" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Issue Type*</label>
              <select required value={formData.issueType} onChange={e => setFormData({...formData, issueType: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                <option value="">Select Category</option>
                <option value="Wrong Parking">Wrong Parking</option>
                <option value="Garbage Problem">Garbage Problem</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Common Area Damage">Common Area Damage</option>
                <option value="Other Society Issue">Other Society Issue</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Location*</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#94a3b8' }}><MapPin size={18} /></div>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required style={{ padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} placeholder="E.g., Block B Ground Floor" />
              </div>
            </div>

            {formData.issueType === 'Wrong Parking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Vehicle Number (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#94a3b8' }}><Car size={18} /></div>
                  <input type="text" value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} style={{ padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} placeholder="E.g., MH 12 AB 1234" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Description*</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required rows="4" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} placeholder="Please provide details about the issue..." />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Photo Evidence</label>
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <FileUpload onFileSelect={setFile} />
              </div>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              Submit for Approval
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {issues.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Eye size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No community issues</h3>
              <p style={{ margin: 0 }}>There are no approved community issues in the feed right now.</p>
            </div>
          ) : (
            issues.map(issue => {
              const statusColors = getStatusColor(issue.status);
              return (
                <div key={issue._id} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                  {issue.photoUrl ? (
                    <div style={{ height: '200px', width: '100%', overflow: 'hidden' }}>
                      <img src={issue.photoUrl} alt="Issue" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: '120px', width: '100%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <Camera size={40} />
                    </div>
                  )}
                  
                  <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {issue.issueType}
                      </span>
                      <span style={{ backgroundColor: statusColors.bg, color: statusColors.text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {issue.status}
                      </span>
                    </div>
                    
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{issue.title}</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#475569', flex: 1 }}>{issue.description}</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={16} color="#94a3b8" />
                        <span>{issue.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} color="#94a3b8" />
                        <span>Reported on {new Date(issue.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityIssues;
