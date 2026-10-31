import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { Users, Search, Home, Mail, Phone, CalendarDays, X } from 'lucide-react';

const ResidentsManagement = () => {
  const toast = useToast();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchResidents = useCallback(async (isRefresh = false, searchVal = debouncedSearch) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const params = { role: 'Resident' };
      if (searchVal && searchVal.trim()) {
        params.search = searchVal.trim();
      }
      const res = await api.get('/users', { params });
      setResidents(res.data?.data || []);
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh residents list');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    fetchResidents();
  }, []);

  // Refetch when search changes
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    fetchResidents(false, debouncedSearch);
  }, [debouncedSearch]);

  if (loading && residents.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loader">Loading residents...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--sh-slate-900)', margin: '0 0 4px 0' }}>Resident Directory</h2>
          <p style={{ margin: 0, color: 'var(--sh-slate-500)', fontSize: '0.875rem' }}>Manage all registered society residents</p>
        </div>
        <RefreshButton
          onClick={() => fetchResidents(true)}
          refreshing={refreshing}
          loading={loading && residents.length === 0}
          title="Refresh resident list"
        />
      </div>

      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--sh-slate-400)" style={{ position: 'absolute', top: '11px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by name, flat, email, or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 36px 10px 40px', 
              borderRadius: '8px', 
              border: '1px solid var(--sh-slate-300)', 
              backgroundColor: 'var(--sh-white)',
              color: 'var(--sh-slate-900)',
              fontSize: '0.875rem', 
              boxSizing: 'border-box',
              outline: 'none',
              boxShadow: 'var(--sh-shadow-xs)'
            }}
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
                color: 'var(--sh-slate-400)',
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
      </div>

      <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', boxShadow: 'var(--sh-shadow-sm)', border: '1px solid var(--sh-slate-200)', overflow: 'hidden' }}>
        {residents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
            <Users size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--sh-slate-700)', margin: '0 0 8px 0' }}>No residents found</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Resident</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Contact</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Flat</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Joined</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {residents.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--sh-slate-200)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--sh-slate-100)', color: 'var(--sh-slate-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {r.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--sh-slate-900)', fontSize: '0.875rem' }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sh-slate-500)', fontSize: '0.875rem' }}>
                          <Mail size={14} /> {r.email}
                        </div>
                        {r.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sh-slate-500)', fontSize: '0.875rem' }}>
                            <Phone size={14} /> {r.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sh-slate-700)', fontSize: '0.875rem', fontWeight: '500' }}>
                        <Home size={16} color="var(--sh-slate-400)" /> {r.flatNumber || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--sh-slate-500)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={14} /> {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        backgroundColor: 'var(--sh-badge-success-bg, #dcfce7)', 
                        color: 'var(--sh-badge-success-text, #166534)', 
                        border: '1px solid var(--sh-badge-success-border, #86efac)',
                        padding: '4px 10px', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600' 
                      }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidentsManagement;
