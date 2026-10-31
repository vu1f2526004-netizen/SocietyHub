import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PeriodFilterBar from '../../components/Finance/PeriodFilterBar';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
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
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  ArrowRight,
  Receipt
} from 'lucide-react';

const formatFilterPeriodLabel = (filter) => {
  if (!filter) return 'This Month';
  const { period, month, year, startDate, endDate } = filter;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (period === 'this-month') return 'This Month';
  if (period === 'last-month') return 'Last Month';
  if (period === 'this-year') return 'This Year';
  if (period === 'last-year') return 'Last Year';
  if (period === 'all') return 'All Time';
  if (period === 'custom') {
    if (startDate && endDate) return `${startDate} - ${endDate}`;
    return 'Custom Range';
  }
  if (period === 'month' || month) {
    if (month && String(month).includes('-')) {
      const [y, m] = String(month).split('-');
      const mIdx = parseInt(m, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        return `${monthNames[mIdx]} ${y}`;
      }
    }
    if (year) {
      return `Year ${year}`;
    }
  }
  return 'Selected Period';
};

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
  const toast = useToast();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Persistent Period Filter State (URL + user-scoped localStorage)
  const { filterState, applyFilter } = usePeriodFilter('admin_finance', 'this-month');
  const prevFilterJsonRef = useRef(JSON.stringify(filterState));

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

  // Data lists & pagination
  const [ledgers, setLedgers] = useState([]);
  const [ledgersPagination, setLedgersPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalCount: 0 });
  
  const [payments, setPayments] = useState([]);
  const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalCount: 0 });

  // Filters within tables
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('All');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'ledger'

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Confirm Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: null,
    loading: false
  });

  const lastToastRef = useRef({ message: '', time: 0 });
  const showDeduplicatedToast = useCallback((msg) => {
    if (!msg) return;
    const now = Date.now();
    if (lastToastRef.current.message === msg && now - lastToastRef.current.time < 3000) {
      return;
    }
    lastToastRef.current = { message: msg, time: now };
    toast.error(msg);
  }, [toast]);

  const fetchData = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const activeFilter = {
        ...filterState,
        ...overrides
      };

      const baseParams = {};
      if (activeFilter.period) baseParams.period = activeFilter.period;
      if (activeFilter.month) baseParams.month = activeFilter.month;
      if (activeFilter.year) baseParams.year = activeFilter.year;
      if (activeFilter.startDate) baseParams.startDate = activeFilter.startDate;
      if (activeFilter.endDate) baseParams.endDate = activeFilter.endDate;

      const effectiveSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
      const effectiveLedgerCategory = overrides.ledgerCategory !== undefined ? overrides.ledgerCategory : ledgerCategoryFilter;
      const effectiveLedgerStatus = overrides.ledgerStatus !== undefined ? overrides.ledgerStatus : ledgerStatusFilter;
      const effectivePaymentStatus = overrides.paymentStatus !== undefined ? overrides.paymentStatus : paymentStatusFilter;

      const [resSummaryResult, resLedgerResult, resPaymentsResult] = await Promise.allSettled([
        api.get('/finance/admin/summary', { params: baseParams }),
        api.get('/finance/admin/ledger', { 
          params: { 
            ...baseParams, 
            page: activeFilter.ledgerPage || ledgersPagination.page, 
            limit: ledgersPagination.limit,
            search: effectiveSearch.trim() || undefined,
            category: effectiveLedgerCategory !== 'All' ? effectiveLedgerCategory : undefined,
            paymentStatus: effectiveLedgerStatus !== 'All' ? effectiveLedgerStatus : undefined
          } 
        }),
        api.get('/payments/admin', { 
          params: { 
            ...baseParams, 
            page: activeFilter.paymentPage || paymentsPagination.page, 
            limit: paymentsPagination.limit,
            search: effectiveSearch.trim() || undefined,
            status: effectivePaymentStatus !== 'All' ? effectivePaymentStatus : undefined
          } 
        })
      ]);

      if (resSummaryResult.status === 'fulfilled' && resSummaryResult.value?.data?.data) {
        setSummary(resSummaryResult.value.data.data);
      }
      if (resLedgerResult.status === 'fulfilled' && resLedgerResult.value?.data) {
        const lData = resLedgerResult.value.data;
        setLedgers(lData.data || []);
        if (lData.totalPages !== undefined) {
          setLedgersPagination(prev => ({
            ...prev,
            page: lData.page || prev.page,
            totalPages: lData.totalPages || 1,
            totalCount: lData.totalCount !== undefined ? lData.totalCount : (lData.data ? lData.data.length : 0)
          }));
        }
      }
      if (resPaymentsResult.status === 'fulfilled' && resPaymentsResult.value?.data) {
        const pData = resPaymentsResult.value.data;
        setPayments(pData.data || []);
        const pInfo = pData.pagination || {};
        const totalPages = pInfo.totalPages !== undefined ? pInfo.totalPages : (pData.totalPages !== undefined ? pData.totalPages : 1);
        const totalCount = pInfo.totalCount !== undefined ? pInfo.totalCount : (pData.totalCount !== undefined ? pData.totalCount : (pData.data ? pData.data.length : 0));
        const page = pInfo.page || pData.page || paymentsPagination.page;
        setPaymentsPagination(prev => ({
          ...prev,
          page: page || prev.page,
          totalPages: totalPages || 1,
          totalCount: totalCount !== undefined ? totalCount : prev.totalCount
        }));
      }

      const rejectedErrors = [resSummaryResult, resLedgerResult, resPaymentsResult]
        .filter(r => r.status === 'rejected')
        .map(r => r.reason);

      if (rejectedErrors.length > 0) {
        const firstErr = rejectedErrors[0];
        console.error('Failed to load some finance data', firstErr);
        const msg = firstErr?.response?.data?.message || firstErr?.response?.data?.error || firstErr?.message || 'Failed to load society accounts';
        setError(msg);
        showDeduplicatedToast(msg);
      }
    } catch (err) {
      console.error('Failed to load finance data', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load society accounts';
      setError(msg);
      showDeduplicatedToast(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterState, ledgersPagination.page, ledgersPagination.limit, paymentsPagination.page, paymentsPagination.limit, debouncedSearch, ledgerCategoryFilter, ledgerStatusFilter, paymentStatusFilter, showDeduplicatedToast]);

  useEffect(() => {
    fetchData();
  }, []);

  // When filterState changes from URL or storage, fetch updated data
  useEffect(() => {
    const currentJson = JSON.stringify(filterState);
    if (prevFilterJsonRef.current !== currentJson) {
      prevFilterJsonRef.current = currentJson;
      fetchData(true);
    }
  }, [filterState, fetchData]);

  // When debounced search or table filters change, reset pagination to page 1 and fetch fresh data
  const isFilterMountRef = useRef(true);
  useEffect(() => {
    if (isFilterMountRef.current) {
      isFilterMountRef.current = false;
      return;
    }
    setLedgersPagination(prev => ({ ...prev, page: 1 }));
    setPaymentsPagination(prev => ({ ...prev, page: 1 }));
    fetchData(true, { 
      ledgerPage: 1, 
      paymentPage: 1, 
      search: debouncedSearch,
      ledgerCategory: ledgerCategoryFilter,
      ledgerStatus: ledgerStatusFilter,
      paymentStatus: paymentStatusFilter
    });
  }, [debouncedSearch, ledgerCategoryFilter, ledgerStatusFilter, paymentStatusFilter]);

  const handlePeriodApply = (newFilter) => {
    setLedgersPagination(prev => ({ ...prev, page: 1 }));
    setPaymentsPagination(prev => ({ ...prev, page: 1 }));
    const updated = applyFilter(newFilter);
    prevFilterJsonRef.current = JSON.stringify(updated);
    fetchData(true, { ...updated, ledgerPage: 1, paymentPage: 1 });
  };

  const handleRefresh = () => {
    fetchData(true);
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
        toast.success(`${formData.type} transaction recorded successfully`);
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
        fetchData(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePaymentStatus = (item) => {
    const nextStatus = item.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    setModalState({
      isOpen: true,
      title: 'Update Payment Status',
      message: `Change payment status of "${item.title || item.category}" (₹${item.amount?.toLocaleString()}) to ${nextStatus}?`,
      confirmText: `Set as ${nextStatus}`,
      confirmVariant: 'primary',
      onConfirm: async () => {
        try {
          setModalState(m => ({ ...m, loading: true }));
          await api.patch(`/finance/admin/${item._id}`, { paymentStatus: nextStatus });
          toast.success(`Payment status updated to ${nextStatus}`);
          setModalState(m => ({ ...m, isOpen: false, loading: false }));
          fetchData(true);
        } catch (err) {
          toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update payment status');
          setModalState(m => ({ ...m, loading: false }));
        }
      }
    });
  };

  const handleDeleteLedger = (item) => {
    if (item.referenceId) {
      toast.error('Cannot delete verified resident payment transactions from the ledger.');
      return;
    }
    setModalState({
      isOpen: true,
      title: 'Delete Expense Record',
      message: `Are you sure you want to permanently delete "${item.title || item.category}" (₹${item.amount?.toLocaleString()})? This action cannot be undone.`,
      confirmText: 'Delete Record',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          setModalState(m => ({ ...m, loading: true }));
          await api.delete(`/finance/admin/${item._id}`);
          toast.success('Expense record deleted successfully');
          setModalState(m => ({ ...m, isOpen: false, loading: false }));
          fetchData(true);
        } catch (err) {
          toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete record');
          setModalState(m => ({ ...m, loading: false }));
        }
      }
    });
  };

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

  // Resolved period display label from backend or filter state
  const currentPeriodLabel = summary?.periodSummary?.periodLabel || summary?.periodLabel || formatFilterPeriodLabel(filterState);
  const periodData = summary?.periodSummary || {
    totalIncome: summary?.totalIncome || 0,
    totalExpense: summary?.totalExpense || 0,
    netBalance: summary?.netBalance || 0,
    pendingDues: summary?.pendingDues || 0,
    successfulTransactionsCount: payments.filter(p => p.status === 'Success').length,
    failedTransactionsCount: payments.filter(p => p.status === 'Failed').length,
    pendingBillsCount: summary?.pendingBillsCount || 0
  };

  const lifetimeData = summary?.lifetimeSummary || {
    totalIncome: summary?.totalIncome || 0,
    totalExpense: summary?.totalExpense || 0,
    netBalance: summary?.netBalance || 0,
    pendingDues: summary?.pendingDues || 0,
    pendingBillsCount: summary?.pendingBillsCount || 0
  };

  if (loading && !summary) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <RefreshCw size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Loading society financial accounts...</p>
      </div>
    );
  }

  if (!summary && error) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '36px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#991b1b', fontWeight: '700' }}>Failed to Load Financial Accounts</h3>
          <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem', maxWidth: '480px', lineHeight: 1.5 }}>{error}</p>
          <button
            onClick={() => fetchData(false)}
            style={{
              marginTop: '8px', padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none',
              borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 1px 2px rgba(220, 38, 38, 0.3)'
            }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Financial Management & Expense Control
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Date-filtered multi-period accounting, vendor expense management, and verified collection ledger.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              backgroundColor: '#10b981', color: 'white', border: 'none',
              padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.875rem', transition: 'background 0.2s',
              boxShadow: '0 1px 2px rgba(16, 185, 129, 0.25)'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            {showForm ? <PieChart size={16} /> : <Plus size={16} />}
            {showForm ? 'View Ledger & Performance' : 'Record Expense / Income'}
          </button>
        </div>
      </div>

      {/* Reusable Period Filter Bar */}
      <PeriodFilterBar
        initialPeriod={filterState.period}
        initialMonth={filterState.month}
        initialYear={filterState.year}
        initialStartDate={filterState.startDate}
        initialEndDate={filterState.endDate}
        filterState={filterState}
        periodLabel={currentPeriodLabel}
        availableYears={summary?.availableYears || []}
        onApply={handlePeriodApply}
        onRefresh={handleRefresh}
        loading={loading}
        refreshing={refreshing}
      />

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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '160px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Amount (₹)*</label>
                <input 
                  type="number" 
                  min="1" 
                  step="any" 
                  required 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  placeholder="0.00" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Payment Status*</label>
                <select 
                  value={formData.paymentStatus} 
                  onChange={e => setFormData({...formData, paymentStatus: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="Paid">Paid / Settled</option>
                  <option value="Pending">Pending / Approved</option>
                </select>
              </div>
            </div>

            {/* Title & Category */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2, minWidth: '200px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Title / Subject*</label>
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} 
                  placeholder="E.g., Lift AMC Quarterly Payment" 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155' }}>Category*</label>
                <select 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="">Select Category</option>
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
          {/* SECTION 1: Selected Period Performance */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                  Selected Period Performance:
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 10px', borderRadius: '6px' }}>
                  {currentPeriodLabel}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {periodData.successfulTransactionsCount || 0} successful • {periodData.failedTransactionsCount || 0} failed attempts
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <SummaryCard 
                title="Period Income" 
                value={periodData.totalIncome} 
                icon={TrendingUp} 
                color="#166534" 
                bg="#dcfce7" 
                subtitle={`${periodData.successfulTransactionsCount || 0} verified collections in ${currentPeriodLabel}`}
              />
              <SummaryCard 
                title="Period Expenses" 
                value={periodData.totalExpense} 
                icon={TrendingDown} 
                color="#991b1b" 
                bg="#fee2e2" 
                subtitle={`Operational expenditures in ${currentPeriodLabel}`}
              />
              <SummaryCard 
                title="Net Balance" 
                value={periodData.netBalance} 
                icon={Wallet} 
                color="#1e40af" 
                bg="#dbeafe" 
                subtitle="Period Income - Period Expenses"
              />
              <SummaryCard 
                title="Pending Maintenance Dues" 
                value={periodData.pendingDues} 
                icon={AlertCircle} 
                color="#c2410c" 
                bg="#ffedd5" 
                subtitle={`${periodData.pendingBillsCount || 0} unpaid bill(s) for period`}
              />
            </div>
          </div>

          {/* SECTION 2: All-Time Society Ledger Summary */}
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#475569" />
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  All-Time Society Ledger Overview (Lifetime Totals)
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Unaffected by period filtering
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>LIFETIME INCOME</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#166534', marginTop: '4px' }}>
                  ₹{Number(lifetimeData.totalIncome || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>LIFETIME EXPENSES</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#991b1b', marginTop: '4px' }}>
                  ₹{Number(lifetimeData.totalExpense || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>LIFETIME NET BALANCE</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1e40af', marginTop: '4px' }}>
                  ₹{Number(lifetimeData.netBalance || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>TOTAL UNPAID DUES</div>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#c2410c', marginTop: '4px' }}>
                  ₹{Number(lifetimeData.pendingDues || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Month-by-Month Financial Report (Historical Progression) */}
          {summary?.monthlyReport && summary.monthlyReport.length > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#475569" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>
                  Historical Monthly Performance Breakdown
                </h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                    <tr>
                      <th style={{ padding: '12px 20px' }}>Month</th>
                      <th style={{ padding: '12px 20px' }}>Income</th>
                      <th style={{ padding: '12px 20px' }}>Expenses</th>
                      <th style={{ padding: '12px 20px' }}>Net Balance</th>
                      <th style={{ padding: '12px 20px' }}>Paid Transactions</th>
                      <th style={{ padding: '12px 20px' }}>Pending Bills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.monthlyReport.map(m => (
                      <tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 20px', fontWeight: '600', color: '#0f172a' }}>
                          {m.month}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#166534', fontWeight: '600' }}>₹{Number(m.totalIncome || 0).toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: '#991b1b', fontWeight: '600' }}>₹{Number(m.totalExpense || 0).toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: (m.netBalance || 0) >= 0 ? '#166534' : '#991b1b', fontWeight: '600' }}>
                          ₹{Number(m.netBalance || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {m.successfulPaymentsCount || 0} paid
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#334155' }}>
                          <span style={{ backgroundColor: (m.pendingBillsCount || 0) > 0 ? '#fff7ed' : '#f8fafc', color: (m.pendingBillsCount || 0) > 0 ? '#c2410c' : '#64748b', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                            {m.pendingBillsCount || 0} pending
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
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.9rem',
                color: activeTab === 'overview' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'overview' ? '2px solid #10b981' : '2px solid transparent'
              }}
            >
              Finance Overview
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.9rem',
                color: activeTab === 'payments' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'payments' ? '2px solid #10b981' : '2px solid transparent'
              }}
            >
              Payment History ({paymentsPagination.totalCount || payments.length})
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.9rem',
                color: activeTab === 'ledger' ? '#10b981' : '#64748b',
                borderBottom: activeTab === 'ledger' ? '2px solid #10b981' : '2px solid transparent'
              }}
            >
              Society Expense & Income Ledger ({ledgersPagination.totalCount || ledgers.length})
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '22px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Receipt size={18} color="#10b981" />
                    Payment Collections & History
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: '999px' }}>
                    {summary?.periodSuccessfulPaymentsCount || payments.length} Verified
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Verified collections for this reporting period total ₹{Number(summary?.periodIncome || 0).toLocaleString()}, with ₹{Number(summary?.periodPendingDues || 0).toLocaleString()} pending collections.
                </p>
                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View Payment History <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '22px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#6366f1" />
                    Society General Ledger
                  </h3>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', backgroundColor: '#eef2ff', color: '#4338ca', padding: '3px 10px', borderRadius: '999px' }}>
                    {ledgersPagination.totalCount || ledgers.length} Records
                  </span>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Detailed record of all authorized society operational expenses, utility charges, maintenance repairs, and recorded cashflow entries.
                </p>
                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      backgroundColor: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View Society Ledger <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            /* TAB: Resident Payment Transaction Table */
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
                    style={{ width: '100%', padding: '9px 34px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearch('');
                      }}
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
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={15} color="#64748b" />
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
                {payments.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>
                      No Transactions for {currentPeriodLabel}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      There are no member payment records recorded within this date range. Total amount: ₹0.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                        <tr>
                          <th style={{ padding: '14px 18px' }}>Date & Time</th>
                          <th style={{ padding: '14px 18px' }}>Resident & Flat</th>
                          <th style={{ padding: '14px 18px' }}>Bill Month</th>
                          <th style={{ padding: '14px 18px' }}>Amount</th>
                          <th style={{ padding: '14px 18px' }}>Receipt / Order Ref</th>
                          <th style={{ padding: '14px 18px' }}>Method</th>
                          <th style={{ padding: '14px 18px' }}>Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(p => {
                          const pDate = p.paidAt || p.createdAt;
                          return (
                            <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {pDate ? new Date(pDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
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
                                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No receipt</span>
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

                {/* Payments Pagination Footer */}
                {paymentsPagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Showing page {paymentsPagination.page} of {paymentsPagination.totalPages} ({paymentsPagination.totalCount} total)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const prevPage = Math.max(1, paymentsPagination.page - 1);
                          setPaymentsPagination(prev => ({ ...prev, page: prevPage }));
                          fetchData(true, { paymentPage: prevPage });
                        }}
                        disabled={paymentsPagination.page <= 1}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                          cursor: paymentsPagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        onClick={() => {
                          const nextPage = Math.min(paymentsPagination.totalPages, paymentsPagination.page + 1);
                          setPaymentsPagination(prev => ({ ...prev, page: nextPage }));
                          fetchData(true, { paymentPage: nextPage });
                        }}
                        disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                          cursor: paymentsPagination.page >= paymentsPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ledger' && (
            /* TAB: General Ledger Table with Full Expense Controls */
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
                    style={{ width: '100%', padding: '9px 34px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearch('');
                      }}
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
                      <X size={15} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={15} color="#64748b" />
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
                    <option value="Staff Salary">Staff Salary</option>
                    <option value="Maintenance Fee">Maintenance Fee</option>
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
                {ledgers.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#334155' }}>
                      No Ledger Entries for {currentPeriodLabel}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      There are no operational income or expense records within this date range. Total: ₹0.
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
                        {ledgers.map(l => (
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
                                <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: '600' }}>Verified Inflow</span>
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

                {/* Ledger Pagination Footer */}
                {ledgersPagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Showing page {ledgersPagination.page} of {ledgersPagination.totalPages} ({ledgersPagination.totalCount} total)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const prevPage = Math.max(1, ledgersPagination.page - 1);
                          setLedgersPagination(prev => ({ ...prev, page: prevPage }));
                          fetchData(true, { ledgerPage: prevPage });
                        }}
                        disabled={ledgersPagination.page <= 1}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                          cursor: ledgersPagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        onClick={() => {
                          const nextPage = Math.min(ledgersPagination.totalPages, ledgersPagination.page + 1);
                          setLedgersPagination(prev => ({ ...prev, page: nextPage }));
                          fetchData(true, { ledgerPage: nextPage });
                        }}
                        disabled={ledgersPagination.page >= ledgersPagination.totalPages}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                          cursor: ledgersPagination.page >= ledgersPagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
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
