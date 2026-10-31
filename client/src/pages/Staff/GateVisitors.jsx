import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { 
  UserCheck, 
  Search, 
  Filter, 
  Phone, 
  LogIn, 
  LogOut, 
  Clock, 
  CalendarDays, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  X, 
  UserPlus, 
  Package, 
  Car, 
  Building, 
  ShieldAlert,
  Check
} from 'lucide-react';

const GateVisitors = () => {
  const toast = useToast();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [availableFlats, setAvailableFlats] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);

  const [walkInForm, setWalkInForm] = useState({
    name: '',
    mobile: '',
    destinationFlat: '',
    visitType: 'Guest',
    purpose: '',
    vehicleNumber: ''
  });

  // Debounce search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchFlats = useCallback(async () => {
    try {
      setLoadingFlats(true);
      const res = await api.get('/visitors/flats');
      setAvailableFlats(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load flats', err);
    } finally {
      setLoadingFlats(false);
    }
  }, []);

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

      const res = await api.get('/visitors/staff', { params });
      
      const sorted = (res.data?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setVisitors(sorted);
      if (isRefresh) {
        toast.success('Visitor records updated');
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
  }, [debouncedSearch, filterStatus, toast]);

  useEffect(() => {
    fetchVisitors();
    fetchFlats();

    // Auto-polling every 20 seconds for gate operational freshness
    const interval = setInterval(() => {
      fetchVisitors(false);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchVisitors, fetchFlats]);

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    if (!walkInForm.name.trim() || !walkInForm.destinationFlat.trim() || !walkInForm.purpose.trim()) {
      toast.error('Please fill in required fields: Visitor Name, Flat, and Purpose');
      return;
    }

    try {
      setSubmittingWalkIn(true);
      const res = await api.post('/visitors/walk-in', walkInForm);
      toast.success(
        `Permission requested for Flat ${walkInForm.destinationFlat} (Ref: ${res.data?.data?.requestRef})`,
        'Walk-in Logged'
      );
      setShowWalkInModal(false);
      setWalkInForm({
        name: '',
        mobile: '',
        destinationFlat: '',
        visitType: 'Guest',
        purpose: '',
        vehicleNumber: ''
      });
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create walk-in request');
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/visitors/${id}/status`, { status });
      const actionName = status === 'Entered' ? 'checked in' : status === 'Exited' ? 'checked out' : status.toLowerCase();
      toast.success(`Visitor successfully ${actionName}`, 'Gate Security');
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update visitor status', 'Gate Error');
    }
  };

  const recordParcelHandover = async (id) => {
    try {
      await api.patch(`/visitors/${id}/parcel-handover`);
      toast.success('Parcel successfully handed over to resident', 'Gate Security');
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record parcel handover', 'Gate Error');
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Pending':
        return { bg: '#fffbeb', text: '#b45309', label: 'Pending Approval', icon: Clock };
      case 'Approved':
        return { bg: '#ecfdf5', text: '#047857', label: 'Approved — Ready for Entry', icon: CheckCircle };
      case 'Entered':
      case 'CheckedIn':
        return { bg: '#dcfce7', text: '#166534', label: 'Entered (Inside)', icon: LogIn };
      case 'Exited':
      case 'CheckedOut':
        return { bg: '#f1f5f9', text: '#475569', label: 'Exited', icon: LogOut };
      case 'Expected':
        return { bg: '#e0e7ff', text: '#4338ca', label: 'Expected (Pre-Approved)', icon: Clock };
      case 'ParcelAtGate':
        return { bg: '#f5f3ff', text: '#6d28d9', label: 'Parcel at Gate Desk', icon: Package };
      case 'ParcelCollected':
        return { bg: '#eff6ff', text: '#1d4ed8', label: 'Parcel Collected', icon: Check };
      case 'Denied':
        return { bg: '#fee2e2', text: '#dc2626', label: 'Denied Entry', icon: XCircle };
      case 'Cancelled':
        return { bg: '#fef3c7', text: '#d97706', label: 'Cancelled', icon: AlertTriangle };
      case 'Expired':
        return { bg: '#f1f5f9', text: '#94a3b8', label: 'Expired', icon: Clock };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: status, icon: UserCheck };
    }
  };

  const filteredVisitors = visitors.filter(v => {
    const searchString = `${v.name} ${v.mobile} ${v.residentId?.name} ${v.destinationFlat || v.residentId?.flatNumber} ${v.vehicleNumber} ${v.requestRef} ${v.visitType}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Gate Operations</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Manage walk-in visitors, parcel approvals, and pre-approved entries</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshButton onRefresh={() => fetchVisitors(true)} loading={refreshing} title="Refresh visitors list" />
          <button
            onClick={() => {
              fetchFlats();
              setShowWalkInModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
            }}
          >
            <UserPlus size={16} />
            New Walk-in Visitor
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by visitor name, flat, mobile, vehicle, or ref..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
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
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', boxSizing: 'border-box' }}
          >
            <option value="All">All Records</option>
            <option value="Pending">Pending Resident Approval</option>
            <option value="Approved">Approved — Awaiting Check-in</option>
            <option value="Entered">Entered (Currently Inside)</option>
            <option value="ParcelAtGate">Parcels at Gate Desk</option>
            <option value="ParcelCollected">Parcels Collected</option>
            <option value="Expected">Expected (Pre-Approved)</option>
            <option value="Exited">Exited / Checked Out</option>
            <option value="Denied">Denied Entry</option>
            <option value="Expired">Expired Requests</option>
          </select>
        </div>
      </div>

      {/* Visitor Cards Grid */}
      {loading && visitors.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="loader">Loading visitors...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredVisitors.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <UserCheck size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No visitors found</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Use "New Walk-in Visitor" above to log and request resident permission.</p>
            </div>
          ) : (
            filteredVisitors.map(v => {
              const { bg, text, label, icon: StatusIcon } = getStatusDisplay(v.status);
              const isWalkIn = v.entryType === 'WalkIn';
              const targetFlat = v.destinationFlat || v.residentId?.flatNumber || 'N/A';

              return (
                <div key={v._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>{v.name}</h3>
                          {isWalkIn ? (
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: '600' }}>
                              Walk-in
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: '600' }}>
                              Pre-Approved
                            </span>
                          )}
                        </div>
                        {v.mobile && (
                          <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} /> {v.mobile}
                          </div>
                        )}
                        {v.requestRef && (
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                            Ref: <code>{v.requestRef}</code>
                          </div>
                        )}
                      </div>

                      <span style={{ 
                        backgroundColor: bg, color: text, padding: '5px 10px', borderRadius: '9999px', 
                        fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' 
                      }}>
                        <StatusIcon size={14} />
                        {label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Visiting Flat:</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>Flat {targetFlat}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Host Resident:</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{v.residentId?.name || 'Resident'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Category / Type:</span>
                        <span style={{ fontWeight: '600', color: '#2563eb' }}>{v.visitType || 'Guest'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: '#64748b' }}>Purpose:</span>
                        <span style={{ fontWeight: '500', color: '#0f172a' }}>{v.purpose || 'N/A'}</span>
                      </div>
                      {v.vehicleNumber && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                          <span style={{ color: '#64748b' }}>Vehicle:</span>
                          <span style={{ fontWeight: '600', color: '#0f172a', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                            {v.vehicleNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {v.createdAt && (
                        <div>Logged: {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {v.entryTimestamp && (
                        <div style={{ color: '#166534', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LogIn size={13} /> Checked In: {new Date(v.entryTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {v.exitTimestamp && (
                        <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <LogOut size={13} /> Checked Out: {new Date(v.exitTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {v.decision?.decisionAction && (
                        <div style={{ color: '#2563eb' }}>
                          Decision: {v.decision.decisionAction} at {new Date(v.decision.decisionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Walk-in Approved -> Check In allowed */}
                      {v.status === 'Approved' && (
                        <button
                          onClick={() => updateStatus(v._id, 'Entered')}
                          style={{
                            flex: 1, padding: '10px 14px', backgroundColor: '#10b981', color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                          }}
                        >
                          <CheckCircle size={16} /> ALLOW ENTRY (CHECK IN)
                        </button>
                      )}

                      {/* Walk-in Pending -> Check In strictly blocked */}
                      {v.status === 'Pending' && (
                        <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1, padding: '9px 12px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '0.8rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={15} /> Awaiting Resident Approval
                          </div>
                          <button
                            onClick={() => updateStatus(v._id, 'Denied')}
                            style={{ padding: '9px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem' }}
                            title="Visitor left before approval or gate refusal"
                          >
                            Refuse
                          </button>
                        </div>
                      )}

                      {/* Parcel Left at Gate -> Handover control */}
                      {v.status === 'ParcelAtGate' && (
                        <button
                          onClick={() => recordParcelHandover(v._id)}
                          style={{
                            width: '100%', padding: '10px 14px', backgroundColor: '#7c3aed', color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem'
                          }}
                        >
                          <Package size={16} /> HAND OVER PARCEL TO RESIDENT
                        </button>
                      )}

                      {/* Pre-Approved Expected visitor */}
                      {v.status === 'Expected' && (
                        <>
                          <button 
                            onClick={() => updateStatus(v._id, 'Entered')}
                            style={{ flex: 1, padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                          >
                            <CheckCircle size={16} /> ALLOW ENTRY
                          </button>
                          <button 
                            onClick={() => updateStatus(v._id, 'Denied')}
                            style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            DENY
                          </button>
                        </>
                      )}

                      {/* Currently Inside -> Check Out control */}
                      {(v.status === 'Entered' || v.status === 'CheckedIn') && (
                        <button 
                          onClick={() => updateStatus(v._id, 'Exited')}
                          style={{ width: '100%', padding: '10px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                          <LogOut size={16} /> RECORD EXIT (CHECK OUT)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* New Walk-in Visitor Modal */}
      {showWalkInModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingWalkIn) setShowWalkInModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#dbeafe', color: '#2563eb' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>New Walk-in Visitor</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Request entry permission from destination resident</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                disabled={submittingWalkIn}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Destination Flat*
                </label>
                <select
                  value={walkInForm.destinationFlat}
                  onChange={(e) => setWalkInForm({ ...walkInForm, destinationFlat: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}
                >
                  <option value="">Select Destination Flat...</option>
                  {availableFlats.map(f => (
                    <option key={f.flatNumber} value={f.flatNumber}>
                      Flat {f.flatNumber} ({f.residentNames?.join(', ') || 'Resident'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Visitor Name*
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe / Delivery Person"
                    value={walkInForm.name}
                    onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={walkInForm.mobile}
                    onChange={(e) => setWalkInForm({ ...walkInForm, mobile: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Visitor Type*
                  </label>
                  <select
                    value={walkInForm.visitType}
                    onChange={(e) => setWalkInForm({ ...walkInForm, visitType: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white' }}
                  >
                    <option value="Guest">Guest</option>
                    <option value="Parcel/Delivery">Parcel / Delivery</option>
                    <option value="Service Provider">Service Provider</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL-01-AB-1234"
                    value={walkInForm.vehicleNumber}
                    onChange={(e) => setWalkInForm({ ...walkInForm, vehicleNumber: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Purpose of Visit*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personal visit, Amazon package, Plumbing repair"
                  value={walkInForm.purpose}
                  onChange={(e) => setWalkInForm({ ...walkInForm, purpose: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  disabled={submittingWalkIn}
                  onClick={() => setShowWalkInModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: submittingWalkIn ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  {submittingWalkIn ? 'Requesting Permission...' : 'Request Resident Permission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateVisitors;
