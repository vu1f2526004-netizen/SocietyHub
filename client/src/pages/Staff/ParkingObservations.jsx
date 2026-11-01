import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import FileUpload from '../../components/shared/FileUpload';
import RefreshButton from '../../components/shared/RefreshButton';
import { Car, MapPin, AlignLeft, Camera, Send, AlertCircle, Clock, Image as ImageIcon, ShieldAlert } from 'lucide-react';

const ParkingObservations = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({ issueType: 'Parking', title: '', description: '', location: '', vehicleNumber: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecentObservations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await api.get('/issues', { params: { issueType: 'Parking' } });
      setObservations(res.data?.data || []);
      if (isRefresh) {
        toast.success('Parking observations updated');
      }
    } catch (err) {
      console.error('Error fetching parking observations:', err);
      if (isRefresh) {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to refresh parking observations';
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRecentObservations();
  }, [fetchRecentObservations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (file) data.append('photo', file);

      await api.post('/issues', data);
      toast.success('Parking observation reported successfully. Admin will review it.');
      setFormData({ issueType: 'Parking', title: '', description: '', location: '', vehicleNumber: '' });
      setFile(null);
      fetchRecentObservations(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to report parking observation';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'Approved':
        return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Rejected':
        return { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' };
      case 'Resolved':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Car size={24} color="#f59e0b" /> Report Parking Issue
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Log operational parking observations during patrol or gate duties</p>
      </div>

      {/* Observation Form */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ backgroundColor: '#fffbeb', color: '#d97706', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '24px', fontSize: '0.875rem', fontWeight: '500' }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            This is an operational log. Admin will review this observation before it becomes a public community issue or results in a penalty.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Issue Type*</label>
            <select              required              value={formData.title}              onChange={e => setFormData({ ...formData, title: e.target.value })}
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> Location*
              </label>
              <input                type="text"                required                value={formData.location}                onChange={e => setFormData({ ...formData, location: e.target.value })}                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}                placeholder="E.g., Basement B2, Slot 45"              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={16} /> Vehicle Number*
              </label>
              <input                type="text"                required
                value={formData.vehicleNumber}                onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}                placeholder="E.g., MH-12-AB-1234"              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlignLeft size={16} /> Detailed Description*
            </label>
            <textarea              required              value={formData.description}              onChange={e => setFormData({ ...formData, description: e.target.value })}              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', minHeight: '120px', resize: 'vertical' }}              placeholder="Describe the parking violation..."
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
            <button              type="submit"              disabled={submitting}
              aria-busy={submitting}
              style={{                width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: 'white',                border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '700',                cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                opacity: submitting ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              <Send size={20} /> {submitting ? 'Submitting Observation...' : 'Submit Parking Observation'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Parking Observations Log */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="#64748b" /> Recent Parking Observations
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Operational log of parking records for your society
            </p>
          </div>
          <RefreshButton            onClick={() => fetchRecentObservations(true)}
            refreshing={refreshing}
            loading={loading && observations.length === 0}
            title="Refresh observations"
          />
        </div>

        {loading && observations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
            <div className="loader" style={{ margin: '0 auto 12px auto' }}></div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading recent parking observations...</p>
          </div>
        ) : observations.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <ShieldAlert size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5, color: '#f59e0b' }} />
            <p style={{ margin: 0, fontWeight: '600', color: '#334155' }}>No parking observations logged yet</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Submit observations using the form above during patrol</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {observations.map((obs) => {
              const badge = getStatusBadge(obs.status);
              return (
                <div                  key={obs._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    backgroundColor: '#fafaf9'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>{obs.title}</span>
                        {obs.vehicleNumber && (
                          <span style={{ backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.05em' }}>
                            {obs.vehicleNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>
                        <MapPin size={14} />
                        <span>{obs.location}</span>
                      </div>
                    </div>

                    <span                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {obs.status}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    {obs.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <span>
                      Logged on {new Date(obs.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      {obs.reporterId?.name && ` by ${obs.reporterId.name}`}
                    </span>

                    {obs.photoUrl && (
                      <a                        href={obs.photoUrl}                        target="_blank"                        rel="noopener noreferrer"                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: '600', textDecoration: 'none' }}
                      >
                        <ImageIcon size={14} /> View Evidence
                      </a>
                    )}
                  </div>

                  {obs.adminActionTaken && (
                    <div style={{ fontSize: '0.8rem', color: '#047857', backgroundColor: '#ecfdf5', padding: '8px 12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <strong>Admin Action:</strong> {obs.adminActionTaken}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingObservations;
