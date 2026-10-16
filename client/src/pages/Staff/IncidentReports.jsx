import React, { useState } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import { AlertTriangle, MapPin, AlignLeft, Camera, Send } from 'lucide-react';

const IncidentReports = () => {
  const [formData, setFormData] = useState({ issueType: 'Incident', title: '', description: '', location: '', vehicleNumber: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) data.append('photo', file);

      // Using the community issues API for general reporting
      await api.post('/issues', data);

      alert('Incident reported successfully. Admin will review it.');
      setFormData({ issueType: 'Incident', title: '', description: '', location: '', vehicleNumber: '' });
      setFile(null);
    } catch (err) {
      alert('Failed to report incident');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={24} color="#ef4444" /> Report Security Incident
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Submit an operational security report directly to the Admin</p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Incident Type*</label>
            <select
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontSize: '1rem' }}
            >
              <option value="">Select Type...</option>
              <option value="Suspicious Visitor">Suspicious Visitor</option>
              <option value="Security Issue">Security Issue</option>
              <option value="Gate Issue">Gate Issue</option>
              <option value="Emergency">Emergency</option>
              <option value="Property Damage">Property Damage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Location*
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              placeholder="E.g., Main Gate, Tower A Lobby"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlignLeft size={16} /> Detailed Description*
            </label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '120px', resize: 'vertical' }}
              placeholder="Describe exactly what happened..."
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={16} /> Vehicle / Person Details (Optional)
            </label>
            <input
              type="text"
              value={formData.vehicleNumber}
              onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
              placeholder="E.g., MH-12-AB-1234 or Person name"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} /> Photo Evidence (Optional)
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
                width: '100%', padding: '16px', backgroundColor: '#ef4444', color: 'white',
                border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '700',
                cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Send size={20} /> {submitting ? 'Submitting Report...' : 'Submit Incident Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentReports;
