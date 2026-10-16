import React, { useState } from 'react';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import FileUpload from '../../components/shared/FileUpload';
import { ArrowLeft, MessageSquareWarning } from 'lucide-react';

const CreateComplaint = () => {
  const [formData, setFormData] = useState({ title: '', category: '', description: '', location: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) data.append('photo', file);

      await api.post('/complaints', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Your complaint has been submitted successfully!', 'Complaint Created');
      navigate('/resident/complaints');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to submit complaint', 'Complaint Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/resident/complaints" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', marginBottom: '16px', fontSize: '0.875rem', fontWeight: '500' }}>
          <ArrowLeft size={16} /> Back to Complaints
        </Link>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>Create Complaint</h2>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ padding: '10px', backgroundColor: '#fef2f2', color: '#ef4444', borderRadius: '8px' }}>
            <MessageSquareWarning size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Complaint Details</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Please provide accurate details for faster resolution.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Issue Title*</label>
            <input placeholder="E.g., Broken pipe in kitchen" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Category*</label>
            <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
              <option value="">Select Category</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Description*</label>
            <textarea placeholder="Describe the issue in detail..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="4" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Location*</label>
            <input placeholder="E.g., Kitchen, Living Room" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Photo Evidence (Optional)</label>
            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '16px', backgroundColor: '#f8fafc' }}>
              <FileUpload onFileSelect={setFile} accept="image/*" />
            </div>
          </div>
          
          <button type="submit" disabled={loading} style={{ 
            marginTop: '12px', padding: '12px', backgroundColor: loading ? '#94a3b8' : '#0f172a', 
            color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateComplaint;
