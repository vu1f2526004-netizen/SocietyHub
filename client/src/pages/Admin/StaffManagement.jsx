import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Mail,
  Phone,
  Calendar,
  Eye,
  Edit2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  UserX,
  Copy,
  Check
} from 'lucide-react';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    mobile: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    mobile: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Status toggle loading
  const [statusTogglingId, setStatusTogglingId] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/admin/staff', { params });
      setStaffList(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStaff();
  };

  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      email: '',
      mobile: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setFormError('');
    setCreatedResult(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.mobile.trim()) {
      setFormError('Please fill in Name, Email, and Mobile number.');
      return;
    }

    if (createForm.password && createForm.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (createForm.password && createForm.password !== createForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/admin/staff', {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        mobile: createForm.mobile.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password.trim() || undefined,
        confirmPassword: createForm.confirmPassword.trim() || undefined
      });

      setCreatedResult({
        user: res.data.data,
        emailStatus: res.data.emailStatus,
        setupPassword: res.data.data.temporarySetupPassword || (createForm.password ? '(As specified)' : null)
      });
      setSuccessMessage(`Security staff account for "${res.data.data.name}" created successfully!`);
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create security staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (staff) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name || '',
      mobile: staff.mobile || '',
      phone: staff.phone || ''
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.mobile.trim()) {
      setFormError('Name and Mobile number are required.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await api.patch(`/admin/staff/${selectedStaff._id}`, {
        name: editForm.name.trim(),
        mobile: editForm.mobile.trim(),
        phone: editForm.phone.trim()
      });
      setIsEditOpen(false);
      setSuccessMessage('Staff details updated successfully.');
      fetchStaff();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to update staff details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff) => {
    const nextStatus = staff.status === 'Active' ? 'Suspended' : 'Active';
    const actionName = nextStatus === 'Active' ? 'activate' : 'deactivate (suspend)';

    if (!window.confirm(`Are you sure you want to ${actionName} account for ${staff.name}?`)) {
      return;
    }

    try {
      setStatusTogglingId(staff._id);
      setSuccessMessage('');
      setError('');
      await api.patch(`/admin/staff/${staff._id}/status`, { status: nextStatus });
      setSuccessMessage(`Account for ${staff.name} is now ${nextStatus}.`);
      fetchStaff();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update status for ${staff.name}`);
    } finally {
      setStatusTogglingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === 'Active').length;
  const suspendedStaff = staffList.filter((s) => s.status === 'Suspended').length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck color="#10b981" size={28} />
            Security & Staff Management
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Manage security guards, gate staff, and duty personnel for your society
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
          }}
        >
          <UserPlus size={18} />
          Add Security Staff
        </button>
      </div>

      {/* Alert Messages */}
      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} color="#ef4444" />
          <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Total Staff Members</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#0f172a' }}>{totalStaff}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#059669', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Active On Duty</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#059669' }}>{activeStaff}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Suspended / Inactive</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#d97706' }}>{suspendedStaff}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          {['All', 'Active', 'Suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                backgroundColor: statusFilter === status ? 'white' : 'transparent',
                color: statusFilter === status ? '#0f172a' : '#64748b',
                boxShadow: statusFilter === status ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {status === 'All' ? 'All Staff' : status}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '360px', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
            <input
              type="text"
              placeholder="Search by name, email, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              backgroundColor: '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Staff Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px auto' }} />
            <div>Loading staff accounts...</div>
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <ShieldAlert size={48} color="#94a3b8" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 6px 0' }}>No staff members found</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              {searchTerm ? 'No results matched your search criteria.' : 'Click "Add Security Staff" above to create an account for security personnel.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Staff Member</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Contact</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Role</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Registered</th>
                  <th style={{ padding: '14px 20px', fontSize: '0.85rem', fontWeight: '600', color: '#64748b', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: staff.status === 'Active' ? '#e0f2fe' : '#f1f5f9',
                          color: staff.status === 'Active' ? '#0369a1' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.95rem'
                        }}>
                          {staff.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{staff.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {staff.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.85rem' }}>
                          <Phone size={13} color="#64748b" /> {staff.mobile || 'N/A'}
                        </div>
                        {staff.phone && (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Alt: {staff.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0'
                      }}>
                        <ShieldCheck size={12} /> SecurityStaff
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: staff.status === 'Active' ? '#ecfdf5' : '#fffbeb',
                        color: staff.status === 'Active' ? '#047857' : '#b45309',
                        border: staff.status === 'Active' ? '1px solid #a7f3d0' : '1px solid #fde68a'
                      }}>
                        {staff.status === 'Active' ? <UserCheck size={12} /> : <UserX size={12} />}
                        {staff.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} />
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setIsViewOpen(true);
                          }}
                          title="View Details"
                          style={{
                            padding: '6px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#475569'
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(staff)}
                          title="Edit Details"
                          style={{
                            padding: '6px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: '#2563eb'
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          disabled={statusTogglingId === staff._id}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: '1px solid',
                            backgroundColor: staff.status === 'Active' ? '#fff1f2' : '#ecfdf5',
                            borderColor: staff.status === 'Active' ? '#fecdd3' : '#a7f3d0',
                            color: staff.status === 'Active' ? '#be123c' : '#047857'
                          }}
                        >
                          {statusTogglingId === staff._id ? (
                            <Loader2 size={12} className="spin" />
                          ) : staff.status === 'Active' ? (
                            'Suspend'
                          ) : (
                            'Activate'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck color="#10b981" size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Provision Security Staff</h3>
                  <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Create a new staff login for gate operations</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {createdResult ? (
              <div style={{ marginTop: '16px' }}>
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: '600', marginBottom: '8px' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    Staff Account Created Successfully
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5' }}>
                    <div><strong>Name:</strong> {createdResult.user.name}</div>
                    <div><strong>Login Email:</strong> {createdResult.user.email}</div>
                    <div><strong>Role:</strong> {createdResult.user.role}</div>
                    <div><strong>Status:</strong> {createdResult.user.status}</div>
                  </div>

                  {createdResult.setupPassword && (
                    <div style={{ marginTop: '14px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>Initial Login Password</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <code style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{createdResult.setupPassword}</code>
                        <button
                          onClick={() => copyToClipboard(createdResult.setupPassword)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#f1f5f9',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}
                        >
                          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748b' }}>
                    {createdResult.emailStatus?.sent ? (
                      <span style={{ color: '#047857' }}>✓ An activation email with instructions was dispatched.</span>
                    ) : (
                      <span style={{ color: '#d97706' }}>
                        ℹ️ Note: SMTP email service is unconfigured on the server ({createdResult.emailStatus?.reason || 'unconfigured'}). Please communicate the login credentials to the staff member directly.
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setIsCreateOpen(false);
                      setCreatedResult(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit}>
                {formError && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
                    {formError}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="guard@society.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={createForm.mobile}
                      onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Landline / Gate Intercom"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Initial Password
                    </label>
                    <input
                      type="password"
                      placeholder="Leave blank to auto-generate"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter password"
                      value={createForm.confirmPassword}
                      onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                  <Lock size={16} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    Password will be hashed securely with bcrypt. If left blank, a cryptographically random temporary password is created and shown on the next step.
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    style={{
                      padding: '9px 16px',
                      backgroundColor: 'transparent',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 18px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitting && <Loader2 size={16} className="spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {isEditOpen && selectedStaff && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>Update Staff Details</h3>
              <button onClick={() => setIsEditOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={selectedStaff.email}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#94a3b8', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                  Alternate Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting && <Loader2 size={14} className="spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isViewOpen && selectedStaff && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {selectedStaff.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>{selectedStaff.name}</h3>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{selectedStaff.role}</div>
                </div>
              </div>
              <button onClick={() => setIsViewOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>{selectedStaff.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Mobile Phone</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>{selectedStaff.mobile || 'N/A'}</div>
              </div>
              {selectedStaff.phone && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Alternate Phone</div>
                  <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>{selectedStaff.phone}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Account Status</div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: selectedStaff.status === 'Active' ? '#ecfdf5' : '#fffbeb',
                    color: selectedStaff.status === 'Active' ? '#047857' : '#b45309',
                    border: selectedStaff.status === 'Active' ? '1px solid #a7f3d0' : '1px solid #fde68a'
                  }}>
                    {selectedStaff.status}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Registered Date</div>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '500' }}>
                  {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsViewOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#334155',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
