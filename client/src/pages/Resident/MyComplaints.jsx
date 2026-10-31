import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { Plus, Search, FileText, X, Filter } from 'lucide-react';

const MyComplaints = () => {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchComplaints = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const activeSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
      const activeStatus = overrides.status !== undefined ? overrides.status : statusFilter;

      const params = {};
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();
      if (activeStatus && activeStatus !== 'All') params.status = activeStatus;

      const res = await api.get('/complaints/my', { params });
      setComplaints(res.data?.data || []);
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh complaints');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, toast]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'Assigned': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'InProgress': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Completed': return { bg: '#dcfce7', text: '#166534' };
      case 'Resolved': return { bg: '#dcfce7', text: '#166534' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading && complaints.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loader">Loading complaints...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: 0 }}>My Complaints</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <RefreshButton
            onClick={() => fetchComplaints(true)}
            refreshing={refreshing}
            loading={loading && complaints.length === 0}
            title="Refresh my complaints"
          />
          <Link to="/resident/complaints/new" style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#0f172a', color: 'white', border: 'none',
              padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '500', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
            >
              <Plus size={18} />
              New Complaint
            </button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input
            type="text"
            placeholder="Search complaints by title, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
                fetchComplaints(false, { search: '' });
              }}
              style={{
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ position: 'relative', minWidth: '180px' }}>
          <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              boxSizing: 'border-box'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="InProgress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {complaints.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <FileText size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No complaints filed</h3>
            <p style={{ margin: 0 }}>You haven't raised any complaints yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>ID</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Title</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Category</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Date</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Priority</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => {
                  const statusColors = getStatusColor(c.status);
                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                        #{c._id.slice(-6).toUpperCase()}
                      </td>
                      <td style={{ padding: '16px 24px', fontWeight: '500', color: '#0f172a' }}>
                        {c.title}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155' }}>
                        {c.category}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem' }}>
                        <span style={{ 
                          color: c.priority === 'High' ? '#ef4444' : c.priority === 'Medium' ? '#f59e0b' : '#10b981',
                          fontWeight: '500'
                        }}>
                          {c.priority}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          backgroundColor: statusColors.bg, 
                          color: statusColors.text, 
                          padding: '4px 12px', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600',
                          display: 'inline-block'
                        }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyComplaints;
