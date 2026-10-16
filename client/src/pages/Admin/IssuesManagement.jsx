import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AlertTriangle, CheckCircle, XCircle, Search, Filter, Image as ImageIcon, MapPin } from 'lucide-react';

const IssuesManagement = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

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

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/issues/admin/${id}`, { status });
      fetchIssues();
    } catch (err) {
      alert('Failed to update issue status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'Approved': return { bg: '#dcfce7', text: '#166534' };
      case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' };
      case 'Resolved': return { bg: '#dbeafe', text: '#2563eb' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const filteredIssues = issues.filter(issue => {
    const searchString = `${issue.title} ${issue.issueType} ${issue.reporterId?.name} ${issue.reporterId?.flatNumber}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || issue.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading issues...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Community Issues & Parking</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Review and approve resident-reported community issues</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by title, type, or reporter..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative', minWidth: '200px' }}>
          <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', appearance: 'none', boxSizing: 'border-box' }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {filteredIssues.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No issues found</h3>
            <p style={{ margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          filteredIssues.map(issue => {
            const statusColor = getStatusColor(issue.status);
            return (
              <div key={issue._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{issue.title}</h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{issue.issueType}</span>
                    </div>
                    <span style={{ backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                      {issue.status}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
                    <MapPin size={16} />
                    <span>{issue.location}</span>
                  </div>
                  
                  {issue.vehicleNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.875rem', fontWeight: '600', marginBottom: '8px' }}>
                      <span>Vehicle: {issue.vehicleNumber}</span>
                    </div>
                  )}

                  <p style={{ margin: '12px 0 0 0', fontSize: '0.875rem', color: '#334155', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                    {issue.description}
                  </p>
                </div>

                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Reporter</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>{issue.reporterId?.name || 'Unknown'} <span style={{ color: '#64748b', fontWeight: '400' }}>({issue.reporterId?.flatNumber})</span></span>
                  </div>
                  
                  {issue.photoUrl && (
                    <a href={issue.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>
                      <ImageIcon size={14} /> View Photo
                    </a>
                  )}
                </div>

                {issue.status === 'Pending' && (
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => updateStatus(issue._id, 'Approved')}
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button 
                      onClick={() => updateStatus(issue._id, 'Rejected')}
                      style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
                {issue.status === 'Approved' && (
                  <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderTop: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#065f46', textAlign: 'center' }}>
                    This issue is currently public and visible to residents.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IssuesManagement;
