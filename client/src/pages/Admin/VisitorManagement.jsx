import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { UserCheck, Search, Filter, Phone, LogIn, LogOut, Clock, CalendarDays, AlertTriangle, X } from 'lucide-react';

const VisitorManagement = () => {
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchVisitors = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const activeSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
      const activeStatus = overrides.status !== undefined ? overrides.status : filterStatus;

      const params = {};
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();
      if (activeStatus && activeStatus !== 'All') params.status = activeStatus;

      const res = await api.get('/visitors/admin', { params }).catch(() => api.get('/visitors', { params })); 
      setVisitors(res.data?.data || []);
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh visitor logs');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filterStatus, toast]);

  useEffect(() => {
    fetchVisitors();
  }, []);

  // Refetch when search or status filter changes
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    fetchVisitors(false, { search: debouncedSearch, status: filterStatus });
  }, [debouncedSearch, filterStatus]);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Entered': return { bg: '#dcfce7', text: '#166534', icon: LogIn };
      case 'Exited': return { bg: '#f1f5f9', text: '#475569', icon: LogOut };
      case 'Expected': return { bg: '#e0e7ff', text: '#4338ca', icon: Clock };
      case 'Denied': return { bg: '#fee2e2', text: '#dc2626', icon: AlertTriangle };
      case 'Cancelled': return { bg: '#fef3c7', text: '#d97706', icon: AlertTriangle };
      default: return { bg: '#f1f5f9', text: '#475569', icon: UserCheck };
    }
  };

  const filteredVisitors = visitors.filter(v => {
    const searchString = `${v.name} ${v.mobile} ${v.residentId?.name} ${v.residentId?.flatNumber}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && visitors.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loader">Loading visitors...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Visitor Logs</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Society-wide visitor history and activity reports</p>
        </div>
        <RefreshButton
          onClick={() => fetchVisitors(true)}
          refreshing={refreshing}
          loading={loading && visitors.length === 0}
          title="Refresh visitor logs"
        />
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by visitor name, host name, or flat..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative', minWidth: '200px' }}>
          <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', appearance: 'none', boxSizing: 'border-box' }}
          >
            <option value="All">All Statuses</option>
            <option value="Expected">Expected</option>
            <option value="Entered">Entered</option>
            <option value="Exited">Exited</option>
            <option value="Denied">Denied</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {filteredVisitors.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <UserCheck size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No visitors found</h3>
            <p style={{ margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Visitor Details</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Host Resident</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Schedule</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Gate Activity</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map(v => {
                  const { bg, text, icon: StatusIcon } = getStatusDisplay(v.status);
                  return (
                    <tr key={v._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem', marginBottom: '4px' }}>{v.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {v.mobile}
                        </div>
                        {v.purpose && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>Purpose: {v.purpose}</div>}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '0.875rem' }}>{v.residentId?.name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Flat: {v.residentId?.flatNumber || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ color: '#0f172a', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <CalendarDays size={14} color="#64748b" />
                          {v.expectedDate ? new Date(v.expectedDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {v.expectedTime || 'Any Time'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.75rem' }}>
                        {v.entryTimestamp && (
                          <div style={{ color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <LogIn size={12} /> IN: {new Date(v.entryTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        {v.exitTimestamp && (
                          <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <LogOut size={12} /> OUT: {new Date(v.exitTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                        {!v.entryTimestamp && !v.exitTimestamp && (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', 
                          fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                        }}>
                          <StatusIcon size={12} />
                          {v.status}
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

export default VisitorManagement;
