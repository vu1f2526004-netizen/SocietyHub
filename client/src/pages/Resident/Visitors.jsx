import React, { useState, useEffect, useCallback, useId } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock, 
  Car, 
  FileText, 
  Search, 
  X, 
  Filter, 
  ShieldCheck, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Phone,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

const Visitors = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' | 'expected'
  const [visitors, setVisitors] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [decidingId, setDecidingId] = useState(null);

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

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    expectedDate: '',
    expectedTime: '',
    purpose: '',
    vehicleNumber: ''
  });

  const fetchPermissionRequests = useCallback(async (isRefresh = false) => {
    try {
      const res = await api.get('/visitors/permissions/my');
      setPermissionRequests(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch gate permissions', err);
      if (isRefresh) toast.error('Failed to refresh gate permissions');
    }
  }, [toast]);

  const fetchVisitors = useCallback(async (isRefresh = false, overrides = {}) => {
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

      const [myVisitorsRes, permissionsRes] = await Promise.allSettled([
        api.get('/visitors/my', { params }),
        api.get('/visitors/permissions/my')
      ]);

      if (myVisitorsRes.status === 'fulfilled') {
        setVisitors(myVisitorsRes.value.data?.data || []);
      }
      if (permissionsRes.status === 'fulfilled') {
        const perms = permissionsRes.value.data?.data || [];
        setPermissionRequests(perms);
        // If there are pending requests, auto-switch to permissions tab if not user-changed
        const hasPending = perms.some(p => p.status === 'Pending');
        if (hasPending && activeTab !== 'permissions') {
          setActiveTab('permissions');
        }
      }

      if (isRefresh) {
        toast.success('Visitors updated');
      }
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh visitors');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, toast, activeTab]);

  useEffect(() => {
    fetchVisitors();

    // Fresh polling every 15 seconds to receive gate walk-in requests promptly
    const pollInterval = setInterval(() => {
      fetchPermissionRequests(false);
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchVisitors, fetchPermissionRequests]);

  const handleDecision = async (requestId, action, defaultNote = '') => {
    try {
      setDecidingId(requestId);
      await api.patch(`/visitors/${requestId}/permission`, { action, note: defaultNote });

      if (action === 'Approve' || action === 'ParcelToFlat') {
        toast.success('Entry approved for visitor. Security notified.', 'Gate Permission');
      } else if (action === 'ParcelAtGate') {
        toast.info('Parcel designated to be left at the gate security desk.', 'Gate Parcel Drop');
      } else {
        toast.warning('Visitor entry denied. Gate security notified.', 'Gate Permission');
      }

      // Refresh requests immediately
      fetchPermissionRequests();
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit decision', 'Permission Error');
    } finally {
      setDecidingId(null);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/visitors', formData);
      toast.success('Visitor pre-approval created successfully');
      setShowForm(false);
      setFormData({ name: '', mobile: '', expectedDate: '', expectedTime: '', purpose: '', vehicleNumber: '' });
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create visitor request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fffbeb', text: '#b45309', label: 'Pending Your Approval', icon: Clock };
      case 'Approved': return { bg: '#ecfdf5', text: '#047857', label: 'Approved (Awaiting Entry)', icon: CheckCircle2 };
      case 'Expected': return { bg: '#fef3c7', text: '#d97706', label: 'Expected', icon: Clock };
      case 'Entered':
      case 'CheckedIn': return { bg: '#dcfce7', text: '#166534', label: 'Inside Premises', icon: UserCheck };
      case 'Exited':
      case 'CheckedOut': return { bg: '#f1f5f9', text: '#475569', label: 'Exited', icon: Clock };
      case 'ParcelAtGate': return { bg: '#f5f3ff', text: '#6d28d9', label: 'Parcel at Gate Desk', icon: Package };
      case 'ParcelCollected': return { bg: '#eff6ff', text: '#1d4ed8', label: 'Parcel Collected', icon: Check };
      case 'Denied': return { bg: '#fee2e2', text: '#dc2626', label: 'Denied Entry', icon: UserX };
      case 'Cancelled': return { bg: '#f1f5f9', text: '#94a3b8', label: 'Cancelled', icon: UserX };
      case 'Expired': return { bg: '#f1f5f9', text: '#94a3b8', label: 'Expired', icon: Clock };
      default: return { bg: '#f1f5f9', text: '#475569', label: status, icon: UserCheck };
    }
  };

  const pendingRequests = permissionRequests.filter(p => p.status === 'Pending');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Visitor Management</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Review gate entry requests, manage parcels, and pre-approve guests</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshButton onRefresh={() => fetchVisitors(true)} loading={refreshing} title="Refresh visitors list" />
          <button 
            onClick={() => {
              setActiveTab('expected');
              setShowForm(!showForm);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#0f172a', color: 'white', border: 'none',
              padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '500', fontSize: '0.875rem', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
          >
            {showForm ? <FileText size={16} /> : <UserPlus size={16} />}
            {showForm ? 'View List' : 'Pre-Approve Visitor'}
          </button>
        </div>
      </div>

      {/* Urgent Pending Gate Notification Banner */}
      {pendingRequests.length > 0 && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#991b1b' }}>
                Gate Permission Required ({pendingRequests.length} Pending)
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>
                {pendingRequests[0].name} ({pendingRequests[0].visitType || 'Visitor'}) is at the gate requesting entry to your flat.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Review Now
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => { setActiveTab('permissions'); setShowForm(false); }}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeTab === 'permissions' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'permissions' ? '2px solid #2563eb' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldCheck size={18} />
          Gate Permission Requests
          {pendingRequests.length > 0 && (
            <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.75rem', padding: '1px 7px', borderRadius: '999px', fontWeight: '700' }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('expected')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: activeTab === 'expected' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'expected' ? '2px solid #2563eb' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <UserCheck size={18} />
          My Pre-Approved & Past Visitors
        </button>
      </div>

      {/* Tab 1: Gate Permission Requests */}
      {activeTab === 'permissions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {permissionRequests.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <ShieldCheck size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No Gate Requests</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>When a walk-in visitor or delivery person arrives at the gate, their permission request will appear here.</p>
            </div>
          ) : (
            permissionRequests.map((req) => {
              const { bg, text, label, icon: StatusIcon } = getStatusColor(req.status);
              const isPending = req.status === 'Pending';
              const isParcel = req.visitType === 'Parcel/Delivery';
              const isDeciding = decidingId === req._id;

              return (
                <div
                  key={req._id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: isPending ? '2px solid #fca5a5' : '1px solid #e2e8f0',
                    boxShadow: isPending ? '0 4px 12px rgba(239, 68, 68, 0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{req.name}</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                          {req.visitType || 'Walk-in'}
                        </span>
                        {req.requestRef && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Ref: <code>{req.requestRef}</code>
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                        Purpose: <span style={{ fontWeight: '600', color: '#0f172a' }}>{req.purpose}</span>
                      </p>
                    </div>

                    <span style={{
                      backgroundColor: bg,
                      color: text,
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <StatusIcon size={14} />
                      {label}
                    </span>
                  </div>

                  {/* Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Destination:</span>{' '}
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>Flat {req.destinationFlat}</span>
                    </div>
                    {req.mobile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={13} color="#64748b" />
                        <span style={{ color: '#64748b' }}>Mobile:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{req.mobile}</span>
                      </div>
                    )}
                    {req.vehicleNumber && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Car size={13} color="#64748b" />
                        <span style={{ color: '#64748b' }}>Vehicle:</span>{' '}
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{req.vehicleNumber}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748b' }}>Arrival Time:</span>{' '}
                      <span style={{ fontWeight: '500' }}>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {req.handledBy?.name && (
                      <div>
                        <span style={{ color: '#64748b' }}>Security Staff:</span>{' '}
                        <span style={{ fontWeight: '500' }}>{req.handledBy.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Confirmed Decision Summary */}
                  {!isPending && req.decision?.decisionAction && (
                    <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <span>
                        Decided: <strong>{req.decision.decisionAction}</strong> by {req.decision.decisionBy?.name || 'Resident'} at {new Date(req.decision.decisionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons for Pending Request */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {isParcel ? (
                        <>
                          <button
                            disabled={isDeciding}
                            onClick={() => handleDecision(req._id, 'ParcelToFlat')}
                            style={{
                              flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#10b981', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                              cursor: isDeciding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <Check size={16} /> Allow Delivery to Flat
                          </button>
                          <button
                            disabled={isDeciding}
                            onClick={() => handleDecision(req._id, 'ParcelAtGate')}
                            style={{
                              flex: 1, minWidth: '180px', padding: '10px 14px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#7c3aed', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                              cursor: isDeciding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <Package size={16} /> Leave at Gate Desk
                          </button>
                          <button
                            disabled={isDeciding}
                            onClick={() => handleDecision(req._id, 'Deny')}
                            style={{
                              padding: '10px 16px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#ef4444', color: 'white', fontWeight: '600', fontSize: '0.85rem',
                              cursor: isDeciding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <UserX size={16} /> Deny
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            disabled={isDeciding}
                            onClick={() => handleDecision(req._id, 'Approve')}
                            style={{
                              flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#10b981', color: 'white', fontWeight: '600', fontSize: '0.875rem',
                              cursor: isDeciding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <Check size={16} /> Approve Entry
                          </button>
                          <button
                            disabled={isDeciding}
                            onClick={() => handleDecision(req._id, 'Deny')}
                            style={{
                              flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none',
                              backgroundColor: '#ef4444', color: 'white', fontWeight: '600', fontSize: '0.875rem',
                              cursor: isDeciding ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}
                          >
                            <UserX size={16} /> Deny Entry
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 2: Pre-Approved & Past Visitors */}
      {activeTab === 'expected' && (
        <>
          {showForm ? (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Pre-approve a Visitor</h3>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Visitor Name*</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Mobile Number*</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Expected Date*</label>
                  <input type="date" name="expectedDate" value={formData.expectedDate} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Expected Time</label>
                  <input type="time" name="expectedTime" value={formData.expectedTime} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Purpose of Visit*</label>
                  <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Vehicle Number (Optional)</label>
                  <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                    Submit Visitor Request
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Search & Filters */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
                  <input
                    type="text"
                    placeholder="Search visitors by name, mobile, purpose, or vehicle..."
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
                        fetchVisitors(false, { search: '' });
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
                    <option value="Expected">Expected</option>
                    <option value="Entered">Entered</option>
                    <option value="Exited">Exited</option>
                    <option value="Denied">Denied</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Visitors Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {visitors.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <UserPlus size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>
                      {searchTerm ? 'No matching visitors found' : 'No visitors found'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                      {searchTerm ? 'Try adjusting your search terms.' : 'You have no expected or past visitors.'}
                    </p>
                  </div>
                ) : (
                  visitors.map(v => {
                    const { bg, text, label, icon: StatusIcon } = getStatusColor(v.status);
                    return (
                      <div key={v._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>{v.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: '500', color: '#334155' }}>Purpose:</span> {v.purpose}
                            </p>
                          </div>
                          <span style={{ backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <StatusIcon size={12} />
                            {label}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="#94a3b8" />
                            <span>{new Date(v.expectedDate || v.createdAt).toLocaleDateString()} {v.expectedTime && `at ${v.expectedTime}`}</span>
                          </div>
                          {v.vehicleNumber && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Car size={16} color="#94a3b8" />
                              <span>{v.vehicleNumber}</span>
                            </div>
                          )}
                        </div>
                        
                        {(v.entryTimestamp || v.exitTimestamp) && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            {v.entryTimestamp && <span>In: {new Date(v.entryTimestamp).toLocaleTimeString()}</span>}
                            {v.exitTimestamp && <span>Out: {new Date(v.exitTimestamp).toLocaleTimeString()}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Visitors;
