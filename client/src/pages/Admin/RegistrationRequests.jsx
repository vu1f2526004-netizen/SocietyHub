import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import ConfirmModal from '../../components/shared/ConfirmModal';
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
  X,
  Search
} from 'lucide-react';

const RegistrationRequests = () => {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PendingApproval');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Financial Onboarding Approval Modal State
  const [approvalModalUser, setApprovalModalUser] = useState(null);
  const [approvalEffectiveDate, setApprovalEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  // Accessible Confirm Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'primary',
    onConfirm: null,
    loading: false
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchRequests = async (status = statusFilter, isRefresh = false, searchVal = debouncedSearch) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      const params = { status };
      if (searchVal && searchVal.trim()) {
        params.search = searchVal.trim();
      }
      const res = await api.get('/admin/registration-requests', { params });
      setRequests(res.data.data || []);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load registration requests';
      setError(msg);
      if (isRefresh) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests(statusFilter, false, debouncedSearch);
  }, [statusFilter, debouncedSearch]);

  const handleApprove = (id, name, flatNumber = '') => {
    setApprovalModalUser({ id, name, flatNumber });
    setApprovalEffectiveDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmApprovalWithDate = async () => {
    if (!approvalModalUser) return;
    try {
      setApprovalSubmitting(true);
      setProcessingId(approvalModalUser.id);
      setActionMessage(null);
      const res = await api.patch(`/admin/registration-requests/${approvalModalUser.id}/approve`, {
        financialEffectiveDate: approvalEffectiveDate
      });
      const msg = res.data.message || `${approvalModalUser.name} approved successfully!`;
      setActionMessage({ type: 'success', text: msg });
      toast.success(msg, 'Registration Approved');
      setApprovalModalUser(null);
      fetchRequests(statusFilter, true);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to approve registration request';
      setActionMessage({
        type: 'error',
        text: errMsg
      });
      toast.error(errMsg, 'Approval Failed');
    } finally {
      setApprovalSubmitting(false);
      setProcessingId(null);
    }
  };

  const handleReject = (id, name) => {
    setModalState({
      isOpen: true,
      title: 'Reject Registration',
      message: `Are you sure you want to reject the registration request for "${name}"?`,
      confirmText: 'Reject Request',
      confirmVariant: 'danger',
      loading: false,
      onConfirm: async () => {
        try {
          setModalState(m => ({ ...m, loading: true }));
          setProcessingId(id);
          setActionMessage(null);
          const res = await api.patch(`/admin/registration-requests/${id}/reject`);
          const msg = res.data.message || `${name} rejected.`;
          setActionMessage({ type: 'warning', text: msg });
          toast.warning(msg, 'Registration Rejected');
          setModalState(m => ({ ...m, isOpen: false, loading: false }));
          fetchRequests(statusFilter, true);
        } catch (err) {
          const errMsg = err.response?.data?.error || 'Failed to reject registration request';
          setActionMessage({
            type: 'error',
            text: errMsg
          });
          toast.error(errMsg, 'Rejection Failed');
          setModalState(m => ({ ...m, loading: false }));
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PendingApproval':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--sh-badge-warning-bg, #fef3c7)',
            color: 'var(--sh-badge-warning-text, #b45309)',
            border: '1px solid var(--sh-badge-warning-border, #fde68a)',
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
            backgroundColor: 'var(--sh-badge-success-bg, #dcfce7)',
            color: 'var(--sh-badge-success-text, #166534)',
            border: '1px solid var(--sh-badge-success-border, #86efac)',
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
            backgroundColor: 'var(--sh-badge-danger-bg, #fee2e2)',
            color: 'var(--sh-badge-danger-text, #b91c1c)',
            border: '1px solid var(--sh-badge-danger-border, #fca5a5)',
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
            backgroundColor: 'var(--sh-badge-neutral-bg, #f1f5f9)',
            color: 'var(--sh-badge-neutral-text, #475569)',
            border: '1px solid var(--sh-badge-neutral-border, #e2e8f0)',
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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--sh-slate-900)', margin: '0 0 8px 0' }}>
            Resident Registration Requests
          </h1>
          <p style={{ color: 'var(--sh-slate-500)', fontSize: '0.95rem', margin: 0 }}>
            Review, approve, or reject new resident registration requests for your residential society.
          </p>
        </div>
        <RefreshButton
          onClick={() => fetchRequests(statusFilter, true)}
          refreshing={refreshing}
          loading={loading && requests.length === 0}
          title="Refresh registration requests"
        />
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
            backgroundColor: actionMessage.type === 'success' ? 'var(--sh-badge-success-bg, #f0fdf4)' : actionMessage.type === 'warning' ? 'var(--sh-badge-warning-bg, #fffbeb)' : 'var(--sh-badge-danger-bg, #fef2f2)',
            border: `1px solid ${actionMessage.type === 'success' ? 'var(--sh-badge-success-border, #bbf7d0)' : actionMessage.type === 'warning' ? 'var(--sh-badge-warning-border, #fde68a)' : 'var(--sh-badge-danger-border, #fecaca)'}`,
            color: actionMessage.type === 'success' ? 'var(--sh-badge-success-text, #16a34a)' : actionMessage.type === 'warning' ? 'var(--sh-badge-warning-text, #b45309)' : 'var(--sh-badge-danger-text, #dc2626)'
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
            backgroundColor: 'var(--sh-badge-danger-bg, #fef2f2)',
            border: '1px solid var(--sh-badge-danger-border, #fecaca)',
            borderRadius: '8px',
            color: 'var(--sh-badge-danger-text, #dc2626)',
            fontSize: '0.9rem',
            marginBottom: '20px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Controls: Search and Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={18} color="var(--sh-slate-400)" style={{ position: 'absolute', top: '11px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by resident name, flat, email..." 
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

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              border: statusFilter === tab.key ? '1px solid #2563eb' : '1px solid var(--sh-slate-200)',
              backgroundColor: statusFilter === tab.key ? '#2563eb' : 'var(--sh-slate-100)',
              color: statusFilter === tab.key ? '#ffffff' : 'var(--sh-slate-600)',
              fontSize: '0.875rem',
              fontWeight: statusFilter === tab.key ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'var(--sh-shadow-xs)'
            }}
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {/* Main Table / List */}
      <div
        style={{
          backgroundColor: 'var(--sh-white)',
          borderRadius: '12px',
          border: '1px solid var(--sh-slate-200)',
          boxShadow: 'var(--sh-shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sh-slate-500)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#2563eb' }} />
            <p style={{ margin: 0 }}>Loading registration requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sh-slate-500)' }}>
            <UserCheck size={40} style={{ margin: '0 auto 12px auto', color: 'var(--sh-slate-400)' }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--sh-slate-700)', margin: '0 0 6px 0' }}>
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
                <tr style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)', color: 'var(--sh-slate-500)' }}>
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
                    style={{ borderBottom: '1px solid var(--sh-slate-200)', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Name */}
                    <td style={{ padding: '14px 16px', color: 'var(--sh-slate-900)', fontWeight: '600' }}>
                      {req.name}
                    </td>

                    {/* Contact */}
                    <td style={{ padding: '14px 16px', color: 'var(--sh-slate-500)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="var(--sh-slate-400)" />
                        <span>{req.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.825rem', color: 'var(--sh-slate-500)' }}>
                        <Phone size={14} color="var(--sh-slate-400)" />
                        <span>{req.mobile || req.phone || 'N/A'}</span>
                      </div>
                    </td>

                    {/* Flat */}
                    <td style={{ padding: '14px 16px', color: 'var(--sh-slate-700)' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'var(--sh-slate-100)',
                        color: 'var(--sh-slate-700)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        <Home size={13} color="var(--sh-slate-400)" />
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
                              onClick={() => handleApprove(req._id, req.name, req.flatNumber)}
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
                    handleApprove(u._id, u.name, u.flatNumber);
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

      {/* Resident Financial Onboarding & Approval Modal */}
      {approvalModalUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                  Approve Resident & Financial Onboarding
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 4px 0', fontWeight: '700', color: '#166534' }}>
                  Resident: {approvalModalUser.name} {approvalModalUser.flatNumber ? `(Flat ${approvalModalUser.flatNumber})` : ''}
                </p>
                <p style={{ margin: 0, color: '#15803d', fontSize: '0.8rem' }}>
                  Approving this resident will grant them access to SocietyHub and establish their financial onboarding timeline.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '700', color: '#334155' }}>
                  Financial Liability Effective Date *
                </label>
                <input
                  type="date"
                  required
                  value={approvalEffectiveDate}
                  onChange={(e) => setApprovalEffectiveDate(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Maintenance dues will only be generated from this date onward. The resident will <strong>never</strong> inherit prior society debts or previous occupants&apos; dues automatically.
                </span>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.78rem', color: '#1e40af' }}>
                <strong>Accounting Rule:</strong> Personal dues start on this date. Society-wide historical accounts remain strictly separate for transparency and are never added to personal dues.
              </div>
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setApprovalModalUser(null)}
                disabled={approvalSubmitting}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovalWithDate}
                disabled={approvalSubmitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: approvalSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {approvalSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Approving...
                  </>
                ) : (
                  <>
                    <UserCheck size={16} /> Confirm Approval
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Action Confirm Modal */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        confirmVariant={modalState.confirmVariant}
        loading={modalState.loading}
        onConfirm={modalState.onConfirm}
        onClose={() => setModalState(m => ({ ...m, isOpen: false }))}
      />
    </div>
  );
};

export default RegistrationRequests;
