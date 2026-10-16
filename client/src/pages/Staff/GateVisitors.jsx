import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { UserCheck, Search, Filter, Phone, LogIn, LogOut, Clock, CalendarDays, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const GateVisitors = () => {
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      // Staff uses dedicated staff endpoint for gate operations
      const res = await api.get('/visitors/staff');
      
      // Filter for operational relevance (recent or expected)
      // We will load all and filter locally for search, but default sort by date
      const sorted = res.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setVisitors(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVisitors(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/visitors/${id}/status`, { status });
      toast.success(`Visitor marked as ${status}`, 'Gate Security');
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update visitor status', 'Gate Error');
    }
  };

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
    const searchString = `${v.name} ${v.mobile} ${v.residentId?.name} ${v.residentId?.flatNumber} ${v.vehicleNumber}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    
    // Default operational view: If no search/filter, show active ones or today's
    // But since they might want to search past, we just filter.
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading visitors...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Gate Operations</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Manage visitor entry and exit at the society gate</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search visitor, host flat, or vehicle..." 
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
            <option value="Expected">Expected</option>
            <option value="Entered">Entered (Currently Inside)</option>
            <option value="Exited">Exited</option>
            <option value="Denied">Denied</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {filteredVisitors.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <UserCheck size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No visitors found</h3>
          </div>
        ) : (
          filteredVisitors.map(v => {
            const { bg, text, icon: StatusIcon } = getStatusDisplay(v.status);
            return (
              <div key={v._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{v.name}</h3>
                      <div style={{ color: '#64748b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} /> {v.mobile}
                      </div>
                    </div>
                    <span style={{ 
                      backgroundColor: bg, color: text, padding: '6px 12px', borderRadius: '9999px', 
                      fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' 
                    }}>
                      <StatusIcon size={14} />
                      {v.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: '#64748b' }}>Visiting Flat:</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{v.residentId?.flatNumber || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: '#64748b' }}>Host Name:</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>{v.residentId?.name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: '#64748b' }}>Purpose:</span>
                      <span style={{ fontWeight: '500', color: '#0f172a' }}>{v.purpose || 'N/A'}</span>
                    </div>
                    {v.vehicleNumber && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                         <span style={{ color: '#64748b' }}>Vehicle:</span>
                         <span style={{ fontWeight: '600', color: '#0f172a', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{v.vehicleNumber}</span>
                       </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {v.expectedDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={14} /> Exp: {new Date(v.expectedDate).toLocaleDateString()} {v.expectedTime}
                      </div>
                    )}
                    {v.entryTimestamp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534' }}>
                        <LogIn size={14} /> IN: {new Date(v.entryTimestamp).toLocaleString()}
                      </div>
                    )}
                    {v.exitTimestamp && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <LogOut size={14} /> OUT: {new Date(v.exitTimestamp).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {v.status === 'Expected' && (
                      <>
                        <button 
                          onClick={() => updateStatus(v._id, 'Entered')}
                          style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <CheckCircle size={18} /> ALLOW ENTRY
                        </button>
                        <button 
                          onClick={() => updateStatus(v._id, 'Denied')}
                          style={{ flex: 1, padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <XCircle size={18} /> DENY
                        </button>
                      </>
                    )}
                    {v.status === 'Entered' && (
                      <button 
                        onClick={() => updateStatus(v._id, 'Exited')}
                        style={{ width: '100%', padding: '12px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <LogOut size={18} /> RECORD EXIT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GateVisitors;
