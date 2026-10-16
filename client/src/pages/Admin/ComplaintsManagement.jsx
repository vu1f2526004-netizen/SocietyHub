import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MessageSquareWarning, Search, Eye, Filter, CheckCircle, Clock } from 'lucide-react';

const ComplaintsManagement = () => {
  const toast = useToast();
  const [complaints, setComplaints] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    fetchComplaints();
    fetchStaff();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await api.get('/complaints/admin');
      setComplaints(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/users');
      setStaff(res.data.data.filter(u => u.role === 'SecurityStaff'));
    } catch (err) {
      console.error(err);
    }
  };

  const updateComplaint = async (id, updates) => {
    try {
      await api.patch(`/complaints/admin/${id}`, updates);
      toast.success('Complaint updated successfully', 'Complaint Updated');
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error updating complaint', 'Update Failed');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fef3c7', text: '#d97706' };
      case 'Assigned': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'In Progress': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Completed': return { bg: '#dcfce7', text: '#166534' };
      case 'Resolved': return { bg: '#dcfce7', text: '#166534' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.createdBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.createdBy?.flatNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading complaints...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Complaints Management</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Review, assign, and track resident complaints</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by title, resident, or flat..." 
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
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {filteredComplaints.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <MessageSquareWarning size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No complaints found</h3>
            <p style={{ margin: 0 }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Resident</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Title / Category</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Assigned Staff</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map(c => {
                  const statusColors = getStatusColor(c.status);
                  return (
                    <tr key={c._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{c.createdBy?.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Flat: {c.createdBy?.flatNumber}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '500', color: '#0f172a', fontSize: '0.875rem' }}>{c.title}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{c.category}</div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <select 
                          value={c.status} 
                          onChange={e => updateComplaint(c._id, { status: e.target.value })}
                          style={{ 
                            padding: '6px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', 
                            backgroundColor: statusColors.bg, color: statusColors.text, border: 'none', cursor: 'pointer',
                            outline: 'none', appearance: 'none', paddingRight: '24px'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <select 
                          value={c.assignedTo?._id || ''} 
                          onChange={e => updateComplaint(c._id, { assignedTo: e.target.value, status: c.status === 'Pending' ? 'Assigned' : c.status })}
                          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', cursor: 'pointer' }}
                        >
                          <option value="">Unassigned</option>
                          {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button 
                          onClick={() => alert(`Location: ${c.location}\nDescription: ${c.description}\nReported: ${new Date(c.createdAt).toLocaleString()}`)}
                          style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Eye size={14} /> View
                        </button>
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

export default ComplaintsManagement;
