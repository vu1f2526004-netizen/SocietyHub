import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import { FileText, Plus, Eye, Lock, Globe, Trash2, CalendarDays } from 'lucide-react';

const DocumentsManagement = () => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', category: '', visibility: 'AdminOnly' });
  const [file, setFile] = useState(null);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      setDocs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to upload');
      return;
    }
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      data.append('document', file);
      
      await api.post('/documents', data);
      alert('Document uploaded successfully');
      setFormData({ title: '', category: '', visibility: 'AdminOnly' });
      setFile(null);
      setShowForm(false);
      fetchDocs();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    }
  };

  const deleteDoc = async (id) => {
    if(window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/documents/${id}`);
        fetchDocs();
      } catch (err) {
        alert('Failed to delete document');
      }
    }
  };

  const getVisibilityIcon = (visibility) => {
    return visibility === 'ResidentVisible' ? <Globe size={14} color="#10b981" /> : <Lock size={14} color="#ef4444" />;
  };

  const getDocViewUrl = (doc) => {
    if (!doc) return '#';
    if (doc.url && /\.(jpg|jpeg|png|webp)$/i.test(doc.url)) {
      return doc.url;
    }
    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiBase}/documents/${doc._id}/file?token=${encodeURIComponent(token || '')}`;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading documents...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Documents Management</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Upload and manage society rules, policies, and files</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#10b981', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '600', transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          {showForm ? <FileText size={18} /> : <Plus size={18} />}
          {showForm ? 'View Documents' : 'Upload Document'}
        </button>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Upload New Document</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Document Title*</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Society By-Laws 2026" />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Category*</label>
                <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Rules & Regulations" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Visibility*</label>
                <select required value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="AdminOnly">Admin Only (Private)</option>
                  <option value="ResidentVisible">Resident Visible (Public)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>File*</label>
              <div style={{ padding: '16px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <FileUpload onFileSelect={setFile} />
              </div>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              Upload
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {docs.length === 0 ? (
             <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <FileText size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
               <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No documents found</h3>
               <p style={{ margin: 0 }}>Upload a document to get started.</p>
             </div>
          ) : (
            docs.map(doc => (
              <div key={doc._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{doc.title}</h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{doc.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '9999px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', fontWeight: '500', color: '#475569', whiteSpace: 'nowrap' }}>
                      {getVisibilityIcon(doc.visibility)}
                      {doc.visibility === 'ResidentVisible' ? 'Public' : 'Private'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem', marginTop: '16px' }}>
                    <CalendarDays size={14} />
                    Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={getDocViewUrl(doc)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#eff6ff'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Eye size={14} /> View
                  </a>
                  <button 
                    onClick={() => deleteDoc(doc._id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentsManagement;
