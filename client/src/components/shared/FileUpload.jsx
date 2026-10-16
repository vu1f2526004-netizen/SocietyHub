import React, { useState } from 'react';
import { FileText } from 'lucide-react';

const FileUpload = ({ label, onFileSelect, accept = ".pdf,.jpg,.jpeg,.png,image/*,application/pdf" }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      setError('');
      if (onFileSelect) onFileSelect(null);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB');
      setSelectedFile(null);
      setPreview(null);
      if (onFileSelect) onFileSelect(null);
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
    if (!allowed.includes(ext) && !file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Unsupported file type. Allowed formats: PDF, JPG, PNG');
      setSelectedFile(null);
      setPreview(null);
      if (onFileSelect) onFileSelect(null);
      return;
    }

    setError('');
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>{label}</label>}
      <input type="file" accept={accept} onChange={handleFileChange} style={{ display: 'block', width: '100%' }} />
      {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '6px 0 0 0' }}>{error}</p>}
      
      {selectedFile && !preview && (
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <FileText size={20} color="#3b82f6" />
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b' }}>
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
        </div>
      )}

      {preview && (
        <div style={{ marginTop: '12px' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
