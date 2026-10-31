import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { Wrench, Plus, CheckCircle, Search, Filter, MapPin, Clock, AlertCircle, X } from 'lucide-react';

const RepairsManagement = () => {
  const toast = useToast();
  const [repairs, setRepairs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [formData, setFormData] = useState({ title: '', category: '', description: '', location: '', assignedTo: '' });

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = useCallback(async (isRefresh = false, overrides = {}) => {
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

      const [resRepairs, resUsers] = await Promise.all([
        api.get('/repairs/admin', { params }),
        api.get('/users')
      ]);
      setRepairs(resRepairs.data?.data || []);
      setStaff((resUsers.data?.data || []).filter(u => u.role === 'SecurityStaff'));
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh repair tasks');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, filterStatus, toast]);

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Refetch when search or status filter changes
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    fetchData(false, { search: debouncedSearch, status: filterStatus });
  }, [debouncedSearch, filterStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/repairs/admin', formData);
      toast.success('Repair task created and assigned successfully', 'Task Assigned');
      setShowForm(false);
      setFormData({ title: '', category: '', description: '', location: '', assignedTo: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create repair task', 'Task Error');
    }
  };

  const closeRepair = async (id) => {
    try {
      await api.patch(`/repairs/admin/${id}/close`);
      toast.success('Repair task closed successfully', 'Task Closed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to close repair', 'Close Error');
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Closed': return { bg: '#dcfce7', text: '#166534' };
      case 'Completed': return { bg: '#bbf7d0', text: '#15803d' };
      case 'In Progress': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Assigned': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.assignedTo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && repairs.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loader">Loading repairs...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Repairs & Maintenance</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Create and track society repair tasks</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <RefreshButton
            onClick={() => fetchData(true)}
            refreshing={refreshing}
            loading={loading && repairs.length === 0}
            title="Refresh repairs list"
          />
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
            {showForm ? <Wrench size={18} /> : <Plus size={18} />}
            {showForm ? 'View Repairs' : 'Create Task'}
          </button>
        </div>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Create Repair Task</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Title*</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Broken Lift Button" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Category*</label>
                <input type="text" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Electrical" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Location*</label>
              <input type="text" required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Tower A Lobby" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Description*</label>
              <textarea required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '80px', resize: 'vertical' }} placeholder="Provide task details..."></textarea>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Assign To Staff*</label>
              <select required value={formData.assignedTo} onChange={e => setFormData({ ...formData, assignedTo: e.target.value })} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                <option value="">Select Staff...</option>
                {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: 'blue', color: 'white', border: 'none', borderRadius: '80px', fontWeight: '6000', cursor: 'pointer', marginTop: '8px' }}>
              Create Task
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
              <input
                type="text"
                placeholder="Search tasks, locations, or staff..."
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
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredRepairs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Wrench size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No repair tasks found</h3>
                <p style={{ margin: 0 }}>Try adjusting your filters or create a new task.</p>
              </div>
            ) : (
              filteredRepairs.map(r => {
                const statusColor = getStatusDisplay(r.status);
                return (
                  <div key={r._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>{r.title}</h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span style={{ backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {r.status}
                      </span>
                    </div>

                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: '#334155' }}>
                        <MapPin size={16} color="#64748b" />
                        <span>{r.location}</span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                        {r.description}
                      </div>
                      <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Assigned To</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>{r.assignedTo?.name || 'Unassigned'}</span>
                        </div>
                        {r.status === 'Completed' && (
                          <button
                            onClick={() => closeRepair(r._id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                              backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px',
                              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer'
                            }}
                          >
                            <CheckCircle size={16} /> Verify & Close
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RepairsManagement;
