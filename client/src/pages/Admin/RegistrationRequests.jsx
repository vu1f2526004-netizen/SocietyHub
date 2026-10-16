import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  Home,
  Calendar,
  Filter,
  Eye,
  X
} from 'lucide-react';

const RegistrationRequests = () => {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PendingApproval');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchRequests = async (status = statusFilter) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/admin/registration-requests?status=${status}`);
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter);
  }, [statusFilter]);

  const handleApprove = async (id, name) => {
    if (!window.confirm(`Are you sure you want to approve registration for ${name}?`)) {
      return;
    }
    try {
      setProcessingId(id);
      setActionMessage(null);
      const res = await api.patch(`/admin/registration-requests/${id}/approve`);
      const msg = res.data.message || `${name} approved successfully!`;
      setActionMessage({ type: 'success', text: msg });
      toast.success(msg, 'Registration Approved');
      fetchRequests(statusFilter);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to approve registration request';
      setActionMessage({
        type: 'error',
        text: errMsg
      });
      toast.error(errMsg, 'Approval Failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to reject registration request for ${name}?`)) {
      return;
    }
    try {
      setProcessingId(id);
      setActionMessage(null);
      const res = await api.patch(`/admin/registration-requests/${id}/reject`);
      const msg = res.data.message || `${name} rejected.`;
      setActionMessage({ type: 'warning', text: msg });
      toast.warning(msg, 'Registration Rejected');
      fetchRequests(statusFilter);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to reject registration request';
      setActionMessage({
        type: 'error',
        text: errMsg
      });
      toast.error(errMsg, 'Rejection Failed');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PendingApproval':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <Clock size={13} />
            <span>Pending Approval</span>
          </span>
        );
      case 'Active':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#dcfce7',
            color: '#15803d',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <CheckCircle2 size={13} />
            <span>Active</span>
          </span>
        );
      case 'Rejected':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <UserX size={13} />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span style={{
            backgroundColor: '#f1f5f9',
            color: '#475569',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '500'
          }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>
          Resident Registration Requests
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Review, approve, or reject new resident registration requests for your residential society.
        </p>
      </div>

      {/* Action Banners */}
      {actionMessage && (
        <div
          id="registration-request-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            backgroundColor: actionMessage.type === 'success' ? '#f0fdf4' : actionMessage.type === 'warning' ? '#fffbeb' : '#fef2f2',
            border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : actionMessage.type === 'warning' ? '#fde68a' : '#fecaca'}`,
            color: actionMessage.type === 'success' ? '#16a34a' : actionMessage.type === 'warning' ? '#b45309' : '#dc2626'
          }}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '0.9rem',
            marginBottom: '20px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        {[
          { key: 'PendingApproval', label: 'Pending Approval' },
          { key: 'Active', label: 'Approved (Active)' },
          { key: 'Rejected', label: 'Rejected' },
          { key: 'All', label: 'All Requests' }
        ].map((tab) => (
          <button
            key={tab.key}
            id={`filter-tab-${tab.key.toLowerCase()}`}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: statusFilter === tab.key ? '#2563eb' : '#f1f5f9',
              color: statusFilter === tab.key ? '#ffffff' : '#475569',
              fontSize: '0.875rem',
              fontWeight: statusFilter === tab.key ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table / List */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
            <p style={{ margin: 0 }}>Loading registration requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <UserCheck size={40} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#334155', margin: '0 0 6px 0' }}>
              No {statusFilter === 'All' ? '' : statusFilter} Requests Found
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
              There are currently no resident registrations matching this filter.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Resident</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Contact</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Flat</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Registered On</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr
                    key={req._id}
                    id={`request-row-${req._id}`}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {/* Name */}
                    <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: '600' }}>
                      {req.name}
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '14px 16px', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="#94a3b8" />
                        <span>{req.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.825rem', color: '#64748b' }}>
                        <Phone size={14} color="#94a3b8" />
                        <span>{req.mobile || req.phone || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Flat */}
                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        <Home size={13} color="#64748b" />
                        <span>{req.flatNumber}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(req.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(req.status)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        {/* View Details */}
                        <button
                          id={`view-btn-${req._id}`}
                          onClick={() => setSelectedUser(req)}
                          title="View Details"
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                          }}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>

                        {/* Approve & Reject buttons for Pending Approval */}
                        {req.status === 'PendingApproval' && (
                          <>
                            <button
                              id={`approve-btn-${req._id}`}
                              disabled={processingId === req._id}
                              onClick={() => handleApprove(req._id, req.name)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: processingId === req._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              {processingId === req._id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <UserCheck size={14} />
                              )}
                              <span>Approve</span>
                            </button>

                            <button
                              id={`reject-btn-${req._id}`}
                              disabled={processingId === req._id}
                              onClick={() => handleReject(req._id, req.name)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: processingId === req._id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}
                            >
                              <UserX size={14} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedUser && (
        <div
          id="details-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            id="details-modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>
                Resident Request Details
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Full Name</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Email Address</span>
                <span style={{ color: '#0f172a' }}>{selectedUser.email}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Mobile Number</span>
                <span style={{ color: '#0f172a' }}>{selectedUser.mobile || selectedUser.phone || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Flat Number</span>
                <strong style={{ color: '#2563eb' }}>{selectedUser.flatNumber}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Registration Date</span>
                <span style={{ color: '#0f172a' }}>{new Date(selectedUser.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Account Status</span>
                <div style={{ marginTop: '4px' }}>{getStatusBadge(selectedUser.status)}</div>
              </div>
            </div>

            {selectedUser.status === 'PendingApproval' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  id="modal-approve-btn"
                  onClick={() => {
                    const u = selectedUser;
                    setSelectedUser(null);
                    handleApprove(u._id, u.name);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Approve Resident
                </button>
                <button
                  id="modal-reject-btn"
                  onClick={() => {
                    const u = selectedUser;
                    setSelectedUser(null);
                    handleReject(u._id, u.name);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Reject Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationRequests;
