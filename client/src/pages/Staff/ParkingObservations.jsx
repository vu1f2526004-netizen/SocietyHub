import React, { useState } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import { Car, MapPin, AlignLeft, Camera, Send, AlertCircle } from 'lucide-react';

const ParkingObservations = () => {
  const [formData, setFormData] = useState({ issueType: 'Parking', title: '', description: '', location: '', vehicleNumber: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) data.append('photo', file);

      await api.post('/issues', data);
      
      alert('Parking observation reported successfully. Admin will review it.');
      setFormData({ issueType: 'Parking', title: '', description: '', location: '', vehicleNumber: '' });
      setFile(null);
    } catch (err) {
      alert('Failed to report parking observation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Car size={24} color="#f59e0b" /> Report Parking Issue
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Log operational parking observations during patrol or gate duties</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', fontSize: '0.875rem', fontWeight: '500' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0 }}>This is an operational log. Admin will review this observation before it becomes a public community issue or results in a penalty.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Issue Type*</label>
            <select 
              required 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '1rem' }}
            >
              <option value="">Select Type...</option>
              <option value="Wrong Parking">Wrong Parking</option>
              <option value="Blocked Gate">Blocked Gate</option>
              <option value="Blocked Driveway">Blocked Driveway</option>
              <option value="Unauthorized Parking">Unauthorized Parking</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> Location*
              </label>
              <input 
                type="text" 
                required 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})} 
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
                placeholder="E.g., Basement B2, Slot 45" 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={16} /> Vehicle Number*
              </label>
              <input 
                type="text" 
                required
                value={formData.vehicleNumber} 
                onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} 
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} 
                placeholder="E.g., MH-12-AB-1234" 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlignLeft size={16} /> Detailed Description*
            </label>
            <textarea 
              required 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '120px', resize: 'vertical' }} 
              placeholder="Describe the parking violation..."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} /> Photo Evidence (Highly Recommended)
            </label>
            <div style={{ padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
              <FileUpload onFileSelect={setFile} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginTop: '8px' }}>
            <button 
              type="submit" 
              disabled={submitting}
              style={{ 
                width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: 'white', 
                border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '700', 
                cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Send size={20} /> {submitting ? 'Submitting...' : 'Submit Parking Observation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParkingObservations;
