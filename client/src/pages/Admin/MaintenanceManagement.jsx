import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  WalletCards, 
  Plus, 
  Search, 
  Filter, 
  IndianRupee, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Eye,
  Calendar
} from 'lucide-react';

const MaintenanceManagement = () => {
  const [bills, setBills] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Navigation tabs: 'bills' | 'bulk' | 'single'
  const [activeTab, setActiveTab] = useState('bills');

  // Single Bill Form State (Preserved)
  const [formData, setFormData] = useState({ 
    residentId: '', 
    amount: '', 
    dueDate: '', 
    month: '', 
    type: 'Maintenance', 
    description: '' 
  });
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Bulk Billing Form State
  const today = new Date();
  const defaultMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const defaultDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 15).toISOString().slice(0, 10);

  const [bulkForm, setBulkForm] = useState({
    month: defaultMonthStr,
    amount: '',
    dueDate: defaultDueDate,
    type: 'Maintenance',
    description: '',
    excludedFlatNumbers: []
  });

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [bulkError, setBulkError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBills, resUsers] = await Promise.all([
        api.get('/bills/admin'),
        api.get('/users')
      ]);
      setBills(resBills.data.data || []);
      setResidents((resUsers.data.data || []).filter(u => u.role === 'Resident'));
    } catch (err) {
      console.error('Failed to fetch billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Format month input for display (e.g. "2026-11" -> "November 2026")
  const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return '';
    if (/^\d{4}-\d{2}$/.test(monthStr)) {
      const [year, monthNum] = monthStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
      return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    return monthStr;
  };

  // Handle single bill creation (Preserved)
  const handleSingleGenerate = async (e) => {
    e.preventDefault();
    setSingleSubmitting(true);
    try {
      const formattedMonth = formatMonthDisplay(formData.month);
      await api.post('/bills/admin', { ...formData, month: formattedMonth });
      alert('Single bill generated successfully');
      setFormData({ residentId: '', amount: '', dueDate: '', month: '', type: 'Maintenance', description: '' });
      setActiveTab('bills');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate single bill');
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Handle Bulk Preview
  const handlePreviewBulk = async (e) => {
    if (e) e.preventDefault();
    setBulkError(null);
    setGenerationResult(null);

    const amountNum = Number(bulkForm.amount);
    if (!amountNum || amountNum <= 0) {
      setBulkError('Please enter a valid standard maintenance amount greater than ₹0.');
      return;
    }

    if (!bulkForm.month) {
      setBulkError('Please select a billing month.');
      return;
    }

    if (!bulkForm.dueDate) {
      setBulkError('Please select a payment due date.');
      return;
    }

    try {
      setPreviewLoading(true);
      const formattedMonth = formatMonthDisplay(bulkForm.month);
      const res = await api.post('/bills/admin/bulk-preview', {
        month: formattedMonth,
        amount: amountNum,
        dueDate: bulkForm.dueDate,
        excludedFlatNumbers: bulkForm.excludedFlatNumbers
      });

      if (res.data?.success) {
        setPreviewData(res.data.data);
      } else {
        setBulkError(res.data?.message || 'Failed to generate preview.');
      }
    } catch (err) {
      console.error('Preview error:', err);
      setBulkError(err.response?.data?.error || err.response?.data?.message || 'Failed to preview monthly bills.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Bulk Generation Confirmation
  const handleConfirmBulkGenerate = async () => {
    if (!previewData) return;
    setBulkError(null);

    try {
      setGenerating(true);
      const formattedMonth = formatMonthDisplay(bulkForm.month);
      const res = await api.post('/bills/admin/bulk-generate', {
        month: formattedMonth,
        amount: Number(bulkForm.amount),
        dueDate: bulkForm.dueDate,
        type: bulkForm.type || 'Maintenance',
        description: bulkForm.description || `Monthly Maintenance for ${formattedMonth}`,
        excludedFlatNumbers: bulkForm.excludedFlatNumbers,
        confirmed: true
      });

      if (res.data?.success) {
        setGenerationResult(res.data.data);
        setPreviewData(null);
        fetchData();
      } else {
        setBulkError(res.data?.message || 'Generation failed.');
      }
    } catch (err) {
      console.error('Bulk generation error:', err);
      setBulkError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate monthly bills.');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Paid': return { bg: '#dcfce7', text: '#166534', icon: CheckCircle };
      case 'Pending': return { bg: '#fef3c7', text: '#d97706', icon: Clock };
      case 'Overdue': return { bg: '#fee2e2', text: '#dc2626', icon: AlertCircle };
      case 'Failed': return { bg: '#fee2e2', text: '#dc2626', icon: AlertCircle };
      case 'PaymentInitiated': return { bg: '#e0e7ff', text: '#4338ca', icon: Clock };
      default: return { bg: '#f1f5f9', text: '#475569', icon: FileText };
    }
  };

  const filteredBills = bills.filter(b => {
    const searchTarget = `${b.residentId?.name || ''} ${b.flatNumber || b.residentId?.flatNumber || ''} ${b.month || ''}`.toLowerCase();
    const matchesSearch = searchTerm === '' || searchTarget.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalOutstandingDues = bills
    .filter(b => ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'].includes(b.status))
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  const totalCollected = bills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <RefreshCw size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Loading society maintenance records...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Maintenance & Billing Management
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Automated monthly bulk billing, individual assessments & resident payment tracking
          </p>
        </div>

        {/* View Mode Tabs */}
        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => { setActiveTab('bills'); setPreviewData(null); setGenerationResult(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: activeTab === 'bills' ? 'white' : 'transparent',
              color: activeTab === 'bills' ? '#0f172a' : '#64748b',
              border: 'none', padding: '8px 14px', borderRadius: '7px',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
              boxShadow: activeTab === 'bills' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <WalletCards size={16} /> All Bills ({bills.length})
          </button>

          <button
            onClick={() => { setActiveTab('bulk'); setGenerationResult(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: activeTab === 'bulk' ? '#10b981' : 'transparent',
              color: activeTab === 'bulk' ? 'white' : '#64748b',
              border: 'none', padding: '8px 14px', borderRadius: '7px',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
              boxShadow: activeTab === 'bulk' ? '0 1px 3px rgba(16,185,129,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={16} /> Monthly Bulk Billing
          </button>

          <button
            onClick={() => { setActiveTab('single'); setPreviewData(null); setGenerationResult(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: activeTab === 'single' ? 'white' : 'transparent',
              color: activeTab === 'single' ? '#0f172a' : '#64748b',
              border: 'none', padding: '8px 14px', borderRadius: '7px',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
              boxShadow: activeTab === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} /> Single Bill
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MONTHLY BULK BILLING SECTION                      */}
      {/* ======================================================== */}
      {activeTab === 'bulk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Generation Result Banner */}
          {generationResult && (
            <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="#059669" />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#065f46', fontWeight: '700' }}>
                  Bulk Monthly Bills Generated Successfully!
                </h4>
              </div>
              <p style={{ margin: 0, color: '#047857', fontSize: '0.9rem' }}>
                Generated <strong>{generationResult.createdCount}</strong> maintenance bills for <strong>{generationResult.month}</strong> totalling <strong>₹{generationResult.totalBilledAmount?.toLocaleString()}</strong>.
                {generationResult.skippedCount > 0 && ` Skipped ${generationResult.skippedCount} previously billed flats.`}
                {' '}Residents have been sent in-app & email billing notifications.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button
                  onClick={() => { setActiveTab('bills'); setGenerationResult(null); }}
                  style={{
                    backgroundColor: '#059669', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem',
                    fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  View Generated Bills in Ledger <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setGenerationResult(null)}
                  style={{
                    backgroundColor: 'white', color: '#065f46', border: '1px solid #a7f3d0',
                    padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem',
                    fontWeight: '500', cursor: 'pointer'
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Bulk Parameter Configuration Form */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: '700' }}>
                1. Configure Monthly Billing Parameters
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                Specify billing month, standard maintenance amount, and due date. Preview eligible flats before confirming generation.
              </p>
            </div>

            {bulkError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', color: '#991b1b', fontSize: '0.875rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} />
                <span>{bulkError}</span>
              </div>
            )}

            <form onSubmit={handlePreviewBulk} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                
                {/* Billing Month */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                    Billing Month & Year *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    <input 
                      type="month" 
                      required 
                      value={bulkForm.month} 
                      onChange={e => {
                        setBulkForm({ ...bulkForm, month: e.target.value });
                        setPreviewData(null);
                      }} 
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Selected: <strong>{formatMonthDisplay(bulkForm.month) || 'None'}</strong>
                  </span>
                </div>

                {/* Standard Amount */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                    Standard Maintenance Rate (₹) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <IndianRupee size={16} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    <input 
                      type="number" 
                      required 
                      min="1"
                      step="50"
                      placeholder="e.g. 2500"
                      value={bulkForm.amount} 
                      onChange={e => {
                        setBulkForm({ ...bulkForm, amount: e.target.value });
                        setPreviewData(null);
                      }} 
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Fixed rate charged to each eligible occupied flat
                  </span>
                </div>

                {/* Due Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                    Payment Due Date *
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={bulkForm.dueDate} 
                    onChange={e => {
                      setBulkForm({ ...bulkForm, dueDate: e.target.value });
                      setPreviewData(null);
                    }} 
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Due date shown on resident invoice & reminder emails
                  </span>
                </div>
              </div>

              {/* Bill Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                  Billing Description / Purpose (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder={`Monthly Society Maintenance Fee for ${formatMonthDisplay(bulkForm.month) || 'selected month'}`}
                  value={bulkForm.description} 
                  onChange={e => setBulkForm({ ...bulkForm, description: e.target.value })} 
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }} 
                />
              </div>

              {/* Preview Trigger Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={previewLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    backgroundColor: '#4f46e5', color: 'white', border: 'none',
                    padding: '11px 22px', borderRadius: '8px', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(79,70,229,0.3)',
                    opacity: previewLoading ? 0.7 : 1
                  }}
                >
                  {previewLoading ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Calculating Eligible Flats...
                    </>
                  ) : (
                    <>
                      <Eye size={16} /> Preview Monthly Bills
                    </>
                  )}
                </button>

                {previewData && (
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    style={{
                      backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1',
                      padding: '11px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem'
                    }}
                  >
                    Reset Preview
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ======================================================== */}
          {/* STEP 2: BILLING PREVIEW CARD                             */}
          {/* ======================================================== */}
          {previewData && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', border: '2px solid #6366f1', boxShadow: '0 4px 6px -1px rgba(99,102,241,0.1)' }}>
              
              {/* Preview Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', marginBottom: '6px' }}>
                    <Eye size={12} /> VERIFIED PREVIEW
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: '700' }}>
                    Billing Preview for {previewData.month}
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                    Review eligible flats, skipped existing bills, and exclusions before final confirmation.
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Billed Amount</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#059669' }}>
                    ₹{previewData.totalAmountToBill?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 4 Summary Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600' }}>Eligible Flats</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#15803d', marginTop: '2px' }}>
                    {previewData.eligibleCount} Flats
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
                    {previewData.eligibleResidentCount} active resident accounts
                  </div>
                </div>

                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: '600' }}>Standard Rate</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1d4ed8', marginTop: '2px' }}>
                    ₹{previewData.standardAmount?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '2px' }}>
                    Per flat due {new Date(previewData.dueDate).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: '600' }}>Skipped (Already Billed)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#b45309', marginTop: '2px' }}>
                    {previewData.skippedCount} Bills
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '2px' }}>
                    Protected from duplicate charges
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>Excluded Flats</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155', marginTop: '2px' }}>
                    {previewData.excludedCount} Flats
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Vacant or ambiguous residents
                  </div>
                </div>
              </div>

              {/* Eligible Flats Table */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#0f172a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="#059669" /> Eligible Flats to be Billed ({previewData.eligible.length})
                </h4>

                {previewData.eligible.length === 0 ? (
                  <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                    No eligible flats available for billing. (All flats may already have bills for this month).
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <tr>
                          <th style={{ padding: '10px 16px' }}>Flat Number</th>
                          <th style={{ padding: '10px 16px' }}>Responsible Resident</th>
                          <th style={{ padding: '10px 16px' }}>Resident Email</th>
                          <th style={{ padding: '10px 16px' }}>Billed Amount</th>
                          <th style={{ padding: '10px 16px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.eligible.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', fontWeight: '600', color: '#0f172a' }}>
                              Flat {item.flatNumber}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#334155' }}>
                              {item.residentName}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#64748b' }}>
                              {item.residentEmail}
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: '600', color: '#059669' }}>
                              ₹{previewData.standardAmount?.toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '600' }}>
                                Ready to Generate
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Skipped Bills (Duplicate Prevention) Table */}
              {previewData.skipped.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#b45309', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} color="#d97706" /> Skipped Bills — Duplicate Protection ({previewData.skipped.length})
                  </h4>
                  <div style={{ border: '1px solid #fde68a', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fffdf5' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#fef3c7', borderBottom: '1px solid #fde68a', color: '#92400e' }}>
                        <tr>
                          <th style={{ padding: '10px 16px' }}>Flat Number</th>
                          <th style={{ padding: '10px 16px' }}>Resident</th>
                          <th style={{ padding: '10px 16px' }}>Existing Status</th>
                          <th style={{ padding: '10px 16px' }}>Reason Skipped</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.skipped.map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #fef3c7' }}>
                            <td style={{ padding: '10px 16px', fontWeight: '600', color: '#78350f' }}>
                              Flat {s.flatNumber}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#92400e' }}>
                              {s.residentName || 'N/A'}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ backgroundColor: '#fde68a', color: '#78350f', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                                {s.existingStatus || 'Existing'} (₹{s.existingAmount})
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', color: '#b45309', fontSize: '0.8rem' }}>
                              {s.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Excluded Flats (Vacant or Ambiguous) Table */}
              {previewData.excluded.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#64748b', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={16} color="#94a3b8" /> Excluded Flats / Accounts ({previewData.excluded.length})
                  </h4>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                        <tr>
                          <th style={{ padding: '10px 16px' }}>Flat / Account</th>
                          <th style={{ padding: '10px 16px' }}>Exclusion Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.excluded.map((x, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px', fontWeight: '600', color: '#475569' }}>
                              Flat {x.flatNumber || 'N/A'} {x.residentName ? `(${x.residentName})` : ''}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.8rem' }}>
                              {x.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Explicit Confirmation Action Box */}
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                    Ready to generate {previewData.eligible.length} maintenance bills?
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                    Bills will be set to Pending and queued for resident notifications. Existing bills will remain untouched.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    style={{
                      backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1',
                      padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.875rem', fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmBulkGenerate}
                    disabled={generating || previewData.eligible.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      backgroundColor: previewData.eligible.length === 0 ? '#94a3b8' : '#10b981',
                      color: 'white', border: 'none', padding: '10px 24px',
                      borderRadius: '8px', cursor: previewData.eligible.length === 0 ? 'not-allowed' : 'pointer',
                      fontWeight: '700', fontSize: '0.9rem',
                      boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
                      opacity: generating ? 0.7 : 1
                    }}
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Generating Bills...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} /> Confirm & Generate Bills
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SINGLE BILL GENERATOR (Preserved)                 */}
      {/* ======================================================== */}
      {activeTab === 'single' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: '700' }}>
            Generate Single Resident Bill
          </h3>
          <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.875rem' }}>
            Create an individual assessment for a specific resident (e.g. late penalty, club house fee, or special repair).
          </p>

          <form onSubmit={handleSingleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Resident (Flat)*</label>
              <select required value={formData.residentId} onChange={e => setFormData({...formData, residentId: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                <option value="">Select Resident...</option>
                {residents.map(r => <option key={r._id} value={r._id}>{r.name} - Flat {r.flatNumber}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Bill Type*</label>
                <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Penalty">Penalty</option>
                  <option value="Event Fee">Event Fee</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Amount (₹)*</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                  <input type="number" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Billing Month*</label>
                <input type="month" required value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Due Date*</label>
                <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Description (Optional)</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Clubhouse booking fee for reception" />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                type="submit" 
                disabled={singleSubmitting}
                style={{ 
                  flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', 
                  border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  opacity: singleSubmitting ? 0.7 : 1
                }}
              >
                {singleSubmitting ? 'Generating...' : 'Generate Single Bill'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bills')}
                style={{
                  padding: '12px 18px', backgroundColor: 'transparent', color: '#64748b',
                  border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ALL SOCIETY BILLS (Main Ledger View)             */}
      {/* ======================================================== */}
      {activeTab === 'bills' && (
        <>
          {/* Quick Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Bills Issued</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{bills.length}</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600', textTransform: 'uppercase' }}>Outstanding Dues</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#d97706', marginTop: '4px' }}>₹{totalOutstandingDues.toLocaleString()}</div>
            </div>

            <div style={{ backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Collected Income</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534', marginTop: '4px' }}>₹{totalCollected.toLocaleString()}</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
              <input 
                type="text" 
                placeholder="Search by resident name, flat number, or billing month..." 
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
                style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', boxSizing: 'border-box' }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="PaymentInitiated">Payment Initiated</option>
                <option value="Overdue">Overdue</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {filteredBills.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                <WalletCards size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No bills found</h3>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Try adjusting your search criteria or generate monthly bills using the tab above.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Resident / Flat</th>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Bill Type</th>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Month</th>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Due Date</th>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Amount</th>
                      <th style={{ padding: '16px 20px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map(b => {
                      const { bg, text, icon: StatusIcon } = getStatusDisplay(b.status);
                      return (
                        <tr key={b._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                              {b.residentId?.name || 'Resident'}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                              Flat: {b.flatNumber || b.residentId?.flatNumber || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}>
                            {b.type}
                            {b.description && (
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {b.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#64748b' }}>
                            {b.month}
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: '#dc2626', fontWeight: '500' }}>
                            {new Date(b.dueDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>
                            ₹{b.amount?.toLocaleString()}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', 
                              fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                            }}>
                              <StatusIcon size={12} />
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default MaintenanceManagement;
