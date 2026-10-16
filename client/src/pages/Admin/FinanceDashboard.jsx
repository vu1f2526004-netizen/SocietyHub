import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Wallet, 
  FileText, 
  PieChart, 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink,
  Trash2,
  Upload
} from 'lucide-react';

const SummaryCard = ({ title, value, icon: Icon, color, bg, subtitle }) => (
  <div style={{ padding: '20px 24px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ padding: '8px', backgroundColor: bg, color: color, borderRadius: '8px' }}>
        <Icon size={18} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      <IndianRupee size={22} color="#0f172a" strokeWidth={2.5} />
      <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
        {Number(value || 0).toLocaleString()}
      </span>
    </div>
    {subtitle && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{subtitle}</span>}
  </div>
);

const FinanceDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Enhanced Form State
  const [formData, setFormData] = useState({ 
    type: 'Expense', 
    title: '',
    category: '', 
    amount: '', 
    description: '',
    date: new Date().toISOString().slice(0, 10),
    vendor: '',
    referenceNumber: '',
    paymentStatus: 'Paid',
    receiptUrl: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [ledgers, setLedgers] = useState([]);
  const [payments, setPayments] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('All');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payments' | 'ledger'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSummary, resLedger, resPayments] = await Promise.all([
        api.get('/finance/admin/summary'),
        api.get('/finance/admin/ledger'),
        api.get('/payments/admin')
      ]);

      if (resSummary?.data?.data) {
        setSummary(resSummary.data.data);
      }
      if (resLedger?.data?.data) {
        setLedgers(resLedger.data.data);
      }
      if (resPayments?.data?.data) {
        setPayments(resPayments.data.data);
      }
    } catch (err) {
      console.error('Failed to load finance data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      let res;
      if (selectedFile) {
        const postData = new FormData();
        postData.append('type', formData.type);
        postData.append('title', formData.title || formData.category);
        postData.append('category', formData.category);
        postData.append('amount', formData.amount);
        postData.append('description', formData.description);
        if (formData.date) postData.append('date', formData.date);
        if (formData.vendor) postData.append('vendor', formData.vendor);
        if (formData.referenceNumber) postData.append('referenceNumber', formData.referenceNumber);
        postData.append('paymentStatus', formData.paymentStatus);
        postData.append('receipt', selectedFile);

        res = await api.post('/finance/admin', postData);
      } else {
        res = await api.post('/finance/admin', formData);
      }

      if (res.data?.success) {
        alert('Transaction recorded successfully');
        setShowForm(false);
        setFormData({ 
          type: 'Expense', 
          title: '',
          category: '', 
          amount: '', 
          description: '',
          date: new Date().toISOString().slice(0, 10),
          vendor: '',
          referenceNumber: '',
          paymentStatus: 'Paid',
          receiptUrl: ''
        });
        setSelectedFile(null);
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePaymentStatus = async (item) => {
    const nextStatus = item.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    if (!window.confirm(`Update status of "${item.title || item.category}" to ${nextStatus}?`)) return;

    try {
      await api.patch(`/finance/admin/${item._id}`, { paymentStatus: nextStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to update payment status');
    }
  };

  const handleDeleteLedger = async (item) => {
    if (item.referenceId) {
      alert('Cannot delete verified resident payment transactions from the ledger.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this expense record: "${item.title || item.category}" (₹${item.amount})?`)) return;

    try {
      await api.delete(`/finance/admin/${item._id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete record');
    }
  };

  // Extract available months from monthlyReport and payments
  const availableMonths = summary?.monthlyReport?.map(m => m.month) || [];

  // Filtered payments calculation
  const filteredPayments = payments.filter(p => {
    const pDate = p.paidAt || p.createdAt;
    const pMonthKey = pDate ? new Date(pDate).toISOString().slice(0, 7) : '';
    const matchesMonth = selectedMonth === 'ALL' || pMonthKey === selectedMonth;
    const matchesStatus = paymentStatusFilter === 'All' || p.status === paymentStatusFilter;
    
    const searchTarget = `${p.residentId?.name || ''} ${p.residentId?.email || ''} ${p.residentId?.flatNumber || ''} ${p.receiptNumber || ''} ${p.razorpayOrderId || ''} ${p.billId?.month || ''}`.toLowerCase();
    const matchesSearch = searchQuery === '' || searchTarget.includes(searchQuery.toLowerCase());

    return matchesMonth && matchesStatus && matchesSearch;
  });

  // Filtered ledger calculation
  const filteredLedgers = ledgers.filter(l => {
    const lDate = l.date || l.createdAt;
    const lMonthKey = lDate ? new Date(lDate).toISOString().slice(0, 7) : '';
    const matchesMonth = selectedMonth === 'ALL' || lMonthKey === selectedMonth;
    const matchesCategory = ledgerCategoryFilter === 'All' || l.category === ledgerCategoryFilter;
    const matchesStatus = ledgerStatusFilter === 'All' || (l.paymentStatus || 'Paid') === ledgerStatusFilter;

    const searchTarget = `${l.title || ''} ${l.description || ''} ${l.vendor || ''} ${l.referenceNumber || ''} ${l.category || ''}`.toLowerCase();
    const matchesSearch = searchQuery === '' || searchTarget.includes(searchQuery.toLowerCase());

    return matchesMonth && matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
      case 'Paid':
        return (
          <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> {status === 'Paid' ? 'Paid' : 'Verified Paid'}
          </span>
        );
      case 'Pending':
        return (
          <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> Pending Approval
          </span>
        );
      case 'Failed':
        return (
          <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
            {status}
          </span>
        );
    }
  };

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <RefreshCw size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Loading society financial accounts...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Financial Management & Expense Control
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Society Income, Expense Management, Receipts & Member Transparency
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1',
              padding: '9px 14px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '500', fontSize: '0.875rem'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button 
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#10b981', color: 'white', border: 'none',
              padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.875rem', transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            {showForm ? <PieChart size={16} /> : <Plus size={16} />}
            {showForm ? 'View Ledger & Summary' : 'Record Expense / Income'}
          </button>
        </div>
      </div>

      {showForm ? (
        /* Comprehensive Expense & Income Record Form */
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '720px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Record Society Expense or Income</h3>
          <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: '#64748b' }}>
            Authorized administrator expense recording with vendor tracking and invoice attachments.
          </p>

          <form onSubmit={handleRecord} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Type & Amount */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Transaction Type*</label>
                <select 
                  required 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="Expense">Expense (Outflow)</option>
                  <option value="Income">Income (Inflow)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Amount (₹)*</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={16} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    required 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Payment Status*</label>
                <select 
                  value={formData.paymentStatus} 
                  onChange={e => setFormData({...formData, paymentStatus: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="Paid">Paid / Settled</option>
                  <option value="Pending">Pending Approval</option>
                </select>
              </div>
            </div>

            {/* Title & Category */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Expense / Income Title*</label>
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  placeholder="E.g., Elevator Quarterly AMC" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Category*</label>
                <select 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="">Select Category...</option>
                  <option value="Repairs and maintenance">Repairs and maintenance</option>
                  <option value="Electricity and water">Electricity and water</option>
                  <option value="Cleaning and housekeeping">Cleaning and housekeeping</option>
                  <option value="Security services">Security services</option>
                  <option value="Lift maintenance">Lift maintenance</option>
                  <option value="Garden and common-area maintenance">Garden and common-area maintenance</option>
                  <option value="Administrative expenses">Administrative expenses</option>
                  <option value="Staff Salary">Staff Salary</option>
                  <option value="Maintenance Fee">Maintenance Fee</option>
                  <option value="Other">Other authorized categories</option>
                </select>
              </div>
            </div>

            {/* Vendor, Date & Reference Number */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Vendor / Service Provider</label>
                <input 
                  type="text" 
                  value={formData.vendor} 
                  onChange={e => setFormData({...formData, vendor: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  placeholder="E.g., Otis Elevators Ltd" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Reference / Invoice #</label>
                <input 
                  type="text" 
                  value={formData.referenceNumber} 
                  onChange={e => setFormData({...formData, referenceNumber: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  placeholder="E.g., INV-2026-402" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Transaction Date</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  style={{ padding: '9px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                />
              </div>
            </div>

            {/* Description & Business Purpose */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Description & Business Purpose*</label>
              <textarea 
                required 
                rows="3" 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }} 
                placeholder="State the purpose, scope of work, or service details for society transparency..." 
              />
            </div>

            {/* Supporting Invoice / Receipt Attachment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>
                Supporting Invoice or Receipt Attachment
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', 
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', color: '#334155' 
                }}>
                  <Upload size={16} />
                  <span>{selectedFile ? selectedFile.name : 'Choose File (PDF/Image)'}</span>
                  <input 
                    type="file" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    style={{ display: 'none' }} 
                    onChange={e => setSelectedFile(e.target.files[0] || null)} 
                  />
                </label>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>or paste public document URL:</span>
                <input 
                  type="url" 
                  placeholder="https://..." 
                  value={formData.receiptUrl} 
                  onChange={e => setFormData({...formData, receiptUrl: e.target.value})} 
                  style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              style={{ 
                padding: '13px', 
                backgroundColor: submitting ? '#6ee7b7' : '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                cursor: submitting ? 'not-allowed' : 'pointer', 
                marginTop: '10px',
                fontSize: '0.95rem'
              }}
            >
              {submitting ? 'Recording Transaction...' : `Save ${formData.type} Record`}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards: Section A */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>All-Time Ledger Summary</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <SummaryCard 
                title="Total Income" 
                value={summary?.totalIncome} 
                icon={TrendingUp} 
                color="#166534" 
                bg="#dcfce7" 
                subtitle="All verified member collections"
              />
              <SummaryCard 
                title="Total Expenses" 
                value={summary?.totalExpense} 
                icon={TrendingDown} 
                color="#991b1b" 
                bg="#fee2e2" 
                subtitle="All recorded society operational expenditures"
              />
              <SummaryCard 
                title="Net Balance" 
                value={summary?.netBalance} 
                icon={Wallet} 
                color="#1e40af" 
                bg="#dbeafe" 
                subtitle="Total Income - Total Expenses"
              />
              <SummaryCard 
                title="Pending Maintenance Dues" 
                value={summary?.pendingDues} 
                icon={AlertCircle} 
                color="#c2410c" 
                bg="#ffedd5" 
                subtitle={`${summary?.pendingBillsCount || 0} unpaid bill(s)`}
              />
            </div>
          </div>

          {/* Current Month Statistics */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>
                Current Month Performance ({summary?.currentMonthKey || 'Current'})
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <SummaryCard 
                title="Month Income" 
                value={summary?.currentMonthIncome} 
                icon={TrendingUp} 
                color="#166534" 
                bg="#dcfce7" 
                subtitle="Collections received this calendar month"
              />
              <SummaryCard 
                title="Month Expenses" 
                value={summary?.currentMonthExpense} 
                icon={TrendingDown} 
                color="#991b1b" 
                bg="#fee2e2" 
                subtitle="Expenditures recorded this month"
              />
              <SummaryCard 
                title="Month Net" 
                value={summary?.currentMonthNetBalance} 
                icon={Wallet} 
                color="#1e40af" 
                bg="#dbeafe" 
                subtitle="Month Income - Month Expenses"
              />
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          {summary?.monthlyReport && summary.monthlyReport.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#475569" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>
                  Month-by-Month Financial Report
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                    <tr>
                      <th style={{ padding: '12px 20px' }}>Month</th>
                      <th style={{ padding: '12px 20px' }}>Total Income</th>
                      <th style={{ padding: '12px 20px' }}>Total Expenses</th>
                      <th style={{ padding: '12px 20px' }}>Net Balance</th>
                      <th style={{ padding: '12px 20px' }}>Confirmed Payments</th>
                      <th style={{ padding: '12px 20px' }}>Unpaid Bills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.monthlyReport.map(m => (
                      <tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0f172a' }}>
                          {m.month}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#166534', fontWeight: '600' }}>₹{m.totalIncome.toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: '#991b1b', fontWeight: '600' }}>₹{m.totalExpense.toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: m.netBalance >= 0 ? '#166534' : '#991b1b', fontWeight: '600' }}>
                          ₹{m.netBalance.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {m.successfulPaymentsCount} paid
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          <span style={{ backgroundColor: m.pendingBillsCount > 0 ? '#fff7ed' : '#f8fafc', color: m.pendingBillsCount > 0 ? '#c2410c' : '#64748b', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {m.pendingBillsCount} pending
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.9rem',
                color: activeTab === 'overview' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'overview' ? '2px solid #10b981' : '2px solid transparent'
              }}
            >
              Resident Payment Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.9rem',
                color: activeTab === 'ledger' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'ledger' ? '2px solid #10b981' : '2px solid transparent'
              }}
            >
              Society Expense & Income Ledger ({ledgers.length})
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'overview' ? (
            /* Section C: Resident Payment Transaction Table */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
                  <input
                    type="text"
                    placeholder="Search by resident, flat, email, receipt or order ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={15} color="#64748b" />
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="ALL">All Months</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={paymentStatusFilter}
                    onChange={e => setPaymentStatusFilter(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Success">Success (Verified)</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* Transaction Table */}
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {filteredPayments.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>No Payment Records Found</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      Try adjusting your search criteria or month filter.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                        <tr>
                          <th style={{ padding: '14px 18px' }}>Date</th>
                          <th style={{ padding: '14px 18px' }}>Resident & Flat</th>
                          <th style={{ padding: '14px 18px' }}>Bill Month</th>
                          <th style={{ padding: '14px 18px' }}>Amount</th>
                          <th style={{ padding: '14px 18px' }}>Receipt / Ref #</th>
                          <th style={{ padding: '14px 18px' }}>Method</th>
                          <th style={{ padding: '14px 18px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map(p => {
                          const pDate = p.paidAt || p.createdAt;
                          return (
                            <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem' }}>
                                {pDate ? new Date(pDate).toLocaleDateString() : '—'}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                  {p.residentId?.name || 'Resident'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Flat: {p.residentId?.flatNumber || 'N/A'} • {p.residentId?.email || ''}
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px', color: '#334155', fontWeight: '500' }}>
                                {p.billId?.month || '—'}
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>
                                ₹{Number(p.amount || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                {p.receiptNumber ? (
                                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.8rem' }}>
                                    {p.receiptNumber}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No receipt yet</span>
                                )}
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                  {p.razorpayPaymentId || p.razorpayOrderId}
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: '500' }}>
                                  {p.paymentMethod || 'Razorpay Online'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                {getStatusBadge(p.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* General Ledger Table with Full Expense Controls */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Ledger Filters */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
                  <input
                    type="text"
                    placeholder="Search ledger by title, vendor, purpose, or reference #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={15} color="#64748b" />
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="ALL">All Months</option>
                    {availableMonths.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={ledgerCategoryFilter}
                    onChange={e => setLedgerCategoryFilter(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="All">All Categories</option>
                    <option value="Repairs and maintenance">Repairs & Maintenance</option>
                    <option value="Electricity and water">Electricity & Water</option>
                    <option value="Cleaning and housekeeping">Cleaning & Housekeeping</option>
                    <option value="Security services">Security Services</option>
                    <option value="Lift maintenance">Lift Maintenance</option>
                    <option value="Garden and common-area maintenance">Garden & Common Area</option>
                    <option value="Administrative expenses">Administrative</option>
                    <option value="Other">Other</option>
                  </select>

                  <select
                    value={ledgerStatusFilter}
                    onChange={e => setLedgerStatusFilter(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {filteredLedgers.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>No Ledger Entries Found</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      Record society expenses or operational adjustments using the button above.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                        <tr>
                          <th style={{ padding: '14px 18px' }}>Date</th>
                          <th style={{ padding: '14px 18px' }}>Title & Description</th>
                          <th style={{ padding: '14px 18px' }}>Category</th>
                          <th style={{ padding: '14px 18px' }}>Vendor / Ref #</th>
                          <th style={{ padding: '14px 18px' }}>Status</th>
                          <th style={{ padding: '14px 18px' }}>Amount</th>
                          <th style={{ padding: '14px 18px' }}>Invoice / Receipt</th>
                          <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedgers.map(l => (
                          <tr key={l._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                              {new Date(l.date || l.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '14px 18px', maxWidth: '240px' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                {l.title || l.category}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                                {l.description}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                              <span style={{ 
                                backgroundColor: l.type === 'Income' ? '#dcfce7' : '#fee2e2', 
                                color: l.type === 'Income' ? '#166534' : '#991b1b', 
                                padding: '3px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                                marginRight: '6px'
                              }}>
                                {l.type}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '500' }}>
                                {l.category}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                              <div style={{ color: '#334155', fontWeight: '500', fontSize: '0.8rem' }}>
                                {l.vendor || '—'}
                              </div>
                              {l.referenceNumber && (
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                  #{l.referenceNumber}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                              {l.type === 'Expense' ? (
                                <button
                                  onClick={() => handleTogglePaymentStatus(l)}
                                  title="Click to toggle Paid/Pending"
                                  style={{
                                    background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left'
                                  }}
                                >
                                  {getStatusBadge(l.paymentStatus || 'Paid')}
                                </button>
                              ) : (
                                <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: '600' }}>Verified</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: l.type === 'Income' ? '#166534' : '#0f172a', whiteSpace: 'nowrap' }}>
                              {l.type === 'Income' ? '+' : '-'}₹{Number(l.amount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                              {l.receiptUrl ? (
                                <a 
                                  href={l.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    color: '#2563eb', fontSize: '0.78rem', textDecoration: 'none', fontWeight: '500'
                                  }}
                                >
                                  <FileText size={13} />
                                  <span>View Receipt</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No file</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              {!l.referenceId && (
                                <button
                                  onClick={() => handleDeleteLedger(l)}
                                  title="Delete manual entry"
                                  style={{
                                    background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px'
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FinanceDashboard;
