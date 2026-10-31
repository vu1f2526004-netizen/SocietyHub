import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import RefreshButton from '../../components/shared/RefreshButton';
import ConfirmModal from '../../components/shared/ConfirmModal';
import PeriodFilterBar from '../../components/Finance/PeriodFilterBar';
import ReceiptModal from '../../components/Finance/ReceiptModal';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
import { 
  Receipt, 
  Search, 
  Filter, 
  IndianRupee, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  AlertTriangle,
  Clock, 
  X, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  Bell,
  Send,
  CheckCheck,
  Eye,
  Info,
  FileText,
  ShieldCheck
} from 'lucide-react';

const SummaryCard = ({ title, value, icon: Icon, color, bg, subtitle, isCurrency = true }) => (
  <div style={{
    padding: '20px 24px',
    backgroundColor: 'var(--sh-white)',
    border: '1px solid var(--sh-slate-200)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: 'var(--sh-shadow-xs)',
    flex: '1 1 220px',
    minWidth: '220px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      <div style={{ padding: '8px', backgroundColor: bg, color: color, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
      {isCurrency && <IndianRupee size={20} color="var(--sh-slate-900)" strokeWidth={2.5} />}
      <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--sh-slate-900)', lineHeight: 1 }}>
        {isCurrency ? Number(value || 0).toLocaleString('en-IN') : Number(value || 0)}
      </span>
    </div>
    {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>{subtitle}</span>}
  </div>
);

const AdminPayments = () => {
  const toast = useToast();
  const { isDark } = useTheme();

  // Tab State: 'payments' (verified transactions) | 'pending' (pending/overdue collections)
  const [activeTab, setActiveTab] = useState('payments');

  // Persistent Period Filter (URL query params + per-user localStorage)
  const { filterState: periodFilter, applyFilter } = usePeriodFilter('admin_payments', 'this-month');
  const prevPeriodJsonRef = useRef(JSON.stringify(periodFilter));

  // Global Summary Metrics (from /api/payments/admin/summary)
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Tab 1: Payments / Transactions State (defaults to 'Success' for verified collections)
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsRefreshing, setPaymentsRefreshing] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [debouncedPaymentSearch, setDebouncedPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('Success');
  const [paymentsPagination, setPaymentsPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalCount: 0 });

  // Tab 2: Pending & Overdue Bills State
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsRefreshing, setBillsRefreshing] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [debouncedBillSearch, setDebouncedBillSearch] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState('unpaid');
  const [billsPagination, setBillsPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalCount: 0 });

  // Bulk Selection State
  const [selectedBillIds, setSelectedBillIds] = useState(new Set());

  // Modals & Details State
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [reminderModalBill, setReminderModalBill] = useState(null);
  const [isSendingIndividual, setIsSendingIndividual] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkResultModal, setBulkResultModal] = useState(null);

  // Transfer Prior Arrears State (Phase 5 requirement)
  const [showTransferArrearsModal, setShowTransferArrearsModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    targetResidentId: '',
    flatNumber: '',
    amount: '',
    billingMonth: '',
    dueDate: '',
    reason: '',
    transferReference: '',
    confirmed: false
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [residentOptions, setResidentOptions] = useState([]);

  useEffect(() => {
    if (showTransferArrearsModal && residentOptions.length === 0) {
      api.get('/users/residents')
        .then(res => setResidentOptions(res.data?.data || []))
        .catch(err => console.error('Failed to load residents for transfer:', err));
    }
  }, [showTransferArrearsModal, residentOptions.length]);

  const handleExecuteTransferArrears = async (e) => {
    e.preventDefault();
    if (!transferForm.confirmed) {
      toast.error('You must confirm authorization per society deed / bylaws');
      return;
    }
    try {
      setTransferSubmitting(true);
      const res = await api.post('/bills/admin/transfer-arrears', transferForm);
      if (res.data?.success) {
        toast.success('Prior arrears successfully transferred and recorded with separate audit trail');
        setShowTransferArrearsModal(false);
        setTransferForm({
          targetResidentId: '',
          flatNumber: '',
          amount: '',
          billingMonth: '',
          dueDate: '',
          reason: '',
          transferReference: '',
          confirmed: false
        });
        fetchBills(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to transfer arrears');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Debounce payment search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPaymentSearch(paymentSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [paymentSearch]);

  // Debounce bill search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBillSearch(billSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [billSearch]);

  // Compute clear display label for the selected period
  const getDisplayPeriodLabel = () => {
    if (summary?.periodLabel) return summary.periodLabel;
    if (periodFilter.period === 'this-month') return 'This Month';
    if (periodFilter.period === 'last-month') return 'Last Month';
    if (periodFilter.period === 'this-year') return 'This Year';
    if (periodFilter.period === 'last-year') return 'Last Year';
    if (periodFilter.period === 'all') return 'All Time';
    if (periodFilter.period === 'month' && periodFilter.month) return periodFilter.month;
    if (periodFilter.period === 'custom' && periodFilter.startDate && periodFilter.endDate) {
      return `${periodFilter.startDate} to ${periodFilter.endDate}`;
    }
    return 'This Month';
  };
  const periodLabel = getDisplayPeriodLabel();

  // 1. Fetch Summary Metrics
  const fetchSummary = useCallback(async (filterOverride) => {
    try {
      setSummaryLoading(true);
      const activeFilter = filterOverride || periodFilter;
      const params = {};
      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;

      const res = await api.get('/payments/admin/summary', { params });
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payment summary metrics:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [periodFilter]);

  // 2. Fetch Payments / Transactions
  const fetchPayments = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setPaymentsRefreshing(true);
      } else {
        setPaymentsLoading(true);
      }

      const activePage = overrides.page !== undefined ? overrides.page : paymentsPagination.page;
      const activeSearch = overrides.search !== undefined ? overrides.search : debouncedPaymentSearch;
      const activeStatus = overrides.status !== undefined ? overrides.status : paymentStatusFilter;
      const activeFilter = overrides.periodFilter || periodFilter;

      const params = {
        page: activePage,
        limit: paymentsPagination.limit
      };

      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;

      if (activeSearch && activeSearch.trim()) {
        params.search = activeSearch.trim();
      }

      if (activeStatus && activeStatus !== 'All') {
        params.status = activeStatus;
      }

      const res = await api.get('/payments/admin', { params });
      const data = res.data?.data || [];
      setPayments(data);

      if (res.data?.pagination) {
        setPaymentsPagination(prev => ({
          ...prev,
          page: res.data.pagination.page || activePage,
          totalPages: res.data.pagination.totalPages || 1,
          totalCount: res.data.pagination.totalCount !== undefined ? res.data.pagination.totalCount : data.length
        }));
      }
    } catch (err) {
      console.error('Failed to load payment records:', err);
      if (isRefresh) toast.error('Failed to refresh payment records');
    } finally {
      setPaymentsLoading(false);
      setPaymentsRefreshing(false);
    }
  }, [debouncedPaymentSearch, paymentStatusFilter, paymentsPagination.limit, paymentsPagination.page, periodFilter, toast]);

  // 3. Fetch Pending & Overdue Bills
  const fetchBills = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setBillsRefreshing(true);
      } else {
        setBillsLoading(true);
      }

      const activePage = overrides.page !== undefined ? overrides.page : billsPagination.page;
      const activeSearch = overrides.search !== undefined ? overrides.search : debouncedBillSearch;
      const activeStatus = overrides.status !== undefined ? overrides.status : billStatusFilter;
      const activeFilter = overrides.periodFilter || periodFilter;

      const params = {
        page: activePage,
        limit: billsPagination.limit
      };

      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;

      if (activeSearch && activeSearch.trim()) {
        params.search = activeSearch.trim();
      }

      if (activeStatus) {
        params.status = activeStatus;
      }

      const res = await api.get('/bills/admin', { params });
      const data = res.data?.data || [];
      setBills(data);

      if (res.data?.pagination) {
        setBillsPagination(prev => ({
          ...prev,
          page: res.data.pagination.page || activePage,
          totalPages: res.data.pagination.totalPages || 1,
          totalCount: res.data.pagination.totalCount !== undefined ? res.data.pagination.totalCount : data.length
        }));
      }
    } catch (err) {
      console.error('Failed to load pending bills:', err);
      if (isRefresh) toast.error('Failed to refresh pending bills');
    } finally {
      setBillsLoading(false);
      setBillsRefreshing(false);
    }
  }, [billStatusFilter, billsPagination.limit, billsPagination.page, debouncedBillSearch, periodFilter, toast]);

  // Initial Data Fetch
  useEffect(() => {
    fetchSummary();
    fetchPayments();
    fetchBills();
  }, [fetchSummary, fetchPayments, fetchBills]);

  // Sync when period filter changes
  useEffect(() => {
    const currentJson = JSON.stringify(periodFilter);
    if (prevPeriodJsonRef.current !== currentJson) {
      prevPeriodJsonRef.current = currentJson;
      fetchSummary(periodFilter);
      fetchPayments(false, { page: 1, periodFilter });
      fetchBills(false, { page: 1, periodFilter });
      setSelectedBillIds(new Set());
    }
  }, [periodFilter, fetchSummary, fetchPayments, fetchBills]);

  // Refetch payments when search or status filter changes
  const isPaymentFirstMount = useRef(true);
  useEffect(() => {
    if (isPaymentFirstMount.current) {
      isPaymentFirstMount.current = false;
      return;
    }
    setPaymentsPagination(prev => ({ ...prev, page: 1 }));
    fetchPayments(false, { page: 1, search: debouncedPaymentSearch, status: paymentStatusFilter });
  }, [debouncedPaymentSearch, paymentStatusFilter, fetchPayments]);

  // Refetch bills when search or status filter changes
  const isBillFirstMount = useRef(true);
  useEffect(() => {
    if (isBillFirstMount.current) {
      isBillFirstMount.current = false;
      return;
    }
    setBillsPagination(prev => ({ ...prev, page: 1 }));
    fetchBills(false, { page: 1, search: debouncedBillSearch, status: billStatusFilter });
    setSelectedBillIds(new Set());
  }, [debouncedBillSearch, billStatusFilter, fetchBills]);

  // Handle master refresh (Preserves period and filters, fetches current data)
  const handleMasterRefresh = () => {
    fetchSummary(periodFilter);
    fetchPayments(true, { periodFilter });
    fetchBills(true, { periodFilter });
  };

  // Handle period change from PeriodFilterBar
  const handlePeriodApply = (newFilter) => {
    setPaymentsPagination(prev => ({ ...prev, page: 1 }));
    setBillsPagination(prev => ({ ...prev, page: 1 }));
    const updated = applyFilter(newFilter);
    prevPeriodJsonRef.current = JSON.stringify(updated);
    fetchSummary(updated);
    fetchPayments(false, { page: 1, periodFilter: updated });
    fetchBills(false, { page: 1, periodFilter: updated });
    setSelectedBillIds(new Set());
  };

  // Toggle selection for single bill
  const handleToggleSelectBill = (billId) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  // Toggle select all eligible on current page
  const eligibleBillsOnPage = bills.filter(b => b.status !== 'Paid' && b.status !== 'Cancelled');
  const isAllEligibleSelected = eligibleBillsOnPage.length > 0 && eligibleBillsOnPage.every(b => selectedBillIds.has(b._id));

  const handleToggleSelectAll = () => {
    if (isAllEligibleSelected) {
      setSelectedBillIds(new Set());
    } else {
      const next = new Set(selectedBillIds);
      eligibleBillsOnPage.forEach(b => next.add(b._id));
      setSelectedBillIds(next);
    }
  };

  // Count distinct residents among selected bills
  const selectedBillsList = bills.filter(b => selectedBillIds.has(b._id));
  const distinctResidentCount = new Set(selectedBillsList.map(b => b.residentId?._id || b.flatNumber)).size;

  // Individual Reminder Dispatch
  const handleConfirmSendIndividual = async () => {
    if (!reminderModalBill) return;
    try {
      setIsSendingIndividual(true);
      const res = await api.post(`/bills/admin/${reminderModalBill._id}/reminder`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Payment reminder sent successfully.');
        setBills(prev => prev.map(b => {
          if (b._id === reminderModalBill._id) {
            return {
              ...b,
              lastReminderSentAt: res.data.bill?.lastReminderSentAt || new Date(),
              reminderCount: (b.reminderCount || 0) + 1
            };
          }
          return b;
        }));
        setReminderModalBill(null);
      }
    } catch (err) {
      console.error('Failed to send individual reminder:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to dispatch reminder');
    } finally {
      setIsSendingIndividual(false);
    }
  };

  // Bulk Reminders Dispatch
  const handleConfirmSendBulk = async () => {
    const billIdsArray = Array.from(selectedBillIds);
    if (billIdsArray.length === 0) return;

    try {
      setIsSendingBulk(true);
      const res = await api.post('/bills/admin/bulk-reminders', { billIds: billIdsArray });
      if (res.data?.success) {
        toast.success(`Dispatched reminders for ${res.data.summary?.successfulDeliveries || 0} bills.`);
        setBulkResultModal(res.data);
        setShowBulkConfirmModal(false);
        setSelectedBillIds(new Set());
        fetchBills(false);
      }
    } catch (err) {
      console.error('Failed to send bulk reminders:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to dispatch bulk reminders');
    } finally {
      setIsSendingBulk(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Success':
      case 'Paid':
        return { bg: '#dcfce7', text: '#166534', label: 'Paid', icon: CheckCircle };
      case 'Pending':
      case 'PaymentInitiated':
        return { bg: '#fef3c7', text: '#b45309', label: status === 'PaymentInitiated' ? 'Initiated' : 'Pending', icon: Clock };
      case 'Overdue':
        return { bg: '#fee2e2', text: '#dc2626', label: 'Overdue', icon: AlertTriangle };
      case 'Failed':
        return { bg: '#ffe4e6', text: '#be123c', label: 'Failed', icon: AlertCircle };
      case 'Cancelled':
        return { bg: '#f1f5f9', text: '#64748b', label: 'Cancelled', icon: X };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: status, icon: Receipt };
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', minWidth: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Page Header (Single Primary Refresh Button, Clean Title & Subtitle) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--sh-slate-900)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Payments & Collections
          </h2>
          <p style={{ margin: 0, color: 'var(--sh-slate-500)', fontSize: '0.875rem' }}>
            Track collections, outstanding bills and resident payments.
          </p>
        </div>
        <RefreshButton
          onClick={handleMasterRefresh}
          refreshing={paymentsRefreshing || billsRefreshing || summaryLoading}
          loading={(paymentsLoading && payments.length === 0) || (billsLoading && bills.length === 0)}
          title="Refresh payments and collections"
        />
      </div>

      {/* 2. Persistent Period Filter Bar (No duplicate refresh button) */}
      <PeriodFilterBar
        filterState={periodFilter}
        periodLabel={periodLabel}
        onApplyFilter={handlePeriodApply}
        showRefresh={false}
      />

      {/* 3. Summary Cards (Consistent INR Formatting, Count-only distinction for attempts) */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <SummaryCard
          title="Verified Collections"
          value={summary?.totalCollected || 0}
          icon={CheckCircle}
          color="#166534"
          bg={isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7'}
          subtitle={`${summary?.successCount || 0} verified payment${summary?.successCount === 1 ? '' : 's'}`}
          isCurrency={true}
        />
        <SummaryCard
          title="Pending Dues"
          value={summary?.totalPendingDues || 0}
          icon={Clock}
          color="#d97706"
          bg={isDark ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7'}
          subtitle={`${summary?.pendingCount || 0} unpaid bill${summary?.pendingCount === 1 ? '' : 's'}`}
          isCurrency={true}
        />
        <SummaryCard
          title="Overdue Dues"
          value={summary?.totalOverdue || 0}
          icon={AlertTriangle}
          color="#dc2626"
          bg={isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2'}
          subtitle={`${summary?.overdueCount || 0} past due date`}
          isCurrency={true}
        />
        <SummaryCard
          title="Payment Attempts"
          value={summary?.failedCount ? summary.failedCount : (summary?.inFlightCount || 0)}
          icon={summary?.failedCount ? AlertCircle : (summary?.inFlightCount ? Clock : CheckCircle2)}
          color={summary?.failedCount ? '#dc2626' : (summary?.inFlightCount ? '#b45309' : '#166534')}
          bg={
            summary?.failedCount 
              ? (isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2') 
              : (summary?.inFlightCount ? (isDark ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7') : (isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7'))
          }
          subtitle={
            summary?.failedCount 
              ? `${summary.failedCount} failed attempt${summary.failedCount === 1 ? '' : 's'}` 
              : `${summary?.inFlightCount || 0} in-progress checkout${summary?.inFlightCount === 1 ? '' : 's'}`
          }
          isCurrency={false}
        />
      </div>

      {/* 4. Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '0.95rem',
            border: 'none',
            borderBottom: activeTab === 'payments' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'payments' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94A3B8' : '#64748b'),
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Receipt size={18} />
          Paid Payments ({paymentsPagination.totalCount || payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '0.95rem',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '3px solid #d97706' : '3px solid transparent',
            color: activeTab === 'pending' ? (isDark ? '#fbbf24' : '#d97706') : (isDark ? '#94A3B8' : '#64748b'),
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Bell size={18} />
          Pending & Overdue Bills ({billsPagination.totalCount || bills.length})
          {bills.some(b => b.status === 'Overdue') && (
            <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '999px', fontWeight: '800' }}>
              Action Required
            </span>
          )}
        </button>
      </div>

      {/* TAB A: PAID PAYMENTS */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Status Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
              <input 
                type="text" 
                placeholder="Search by resident name, flat number, bill reference, receipt or payment ID..." 
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 36px 10px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.875rem', 
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxSizing: 'border-box' 
                }}
              />
              {paymentSearch && (
                <button
                  type="button"
                  onClick={() => setPaymentSearch('')}
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
                  <X size={16} />
                </button>
              )}
            </div>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
              <select 
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px 10px 10px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #cbd5e1', 
                  fontSize: '0.875rem', 
                  backgroundColor: '#ffffff', 
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="Success">Paid (Verified Collections)</option>
                <option value="Pending">Pending Checkout Attempts</option>
                <option value="Failed">Failed Attempts</option>
                <option value="All">All Transactions & Attempts</option>
              </select>
            </div>
          </div>

          {/* Contextual notice if viewing uncaptured pending attempts */}
          {paymentStatusFilter === 'Pending' && (
            <div style={{ 
              backgroundColor: '#fffbeb', 
              border: '1px solid #fde68a', 
              borderRadius: '8px', 
              padding: '10px 14px', 
              fontSize: '0.85rem', 
              color: '#92400e', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <Info size={16} color="#d97706" />
              <span>
                Viewing <strong>in-progress checkout attempts</strong>. These uncaptured orders do not represent verified income until completed.
              </span>
            </div>
          )}

          {/* Payments Table Card (Contained horizontal scroll, minWidth to avoid clipping) */}
          <div style={{ 
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            backgroundColor: 'var(--sh-white)', 
            borderRadius: '12px', 
            boxShadow: 'var(--sh-shadow-xs)', 
            border: '1px solid var(--sh-slate-200)', 
            overflow: 'hidden' 
          }}>
            {paymentsLoading && payments.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '12px' }}>
                <RefreshCw size={24} color="#0284c7" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--sh-slate-500)', fontSize: '0.9rem' }}>Loading payment records...</span>
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
                <Receipt size={48} style={{ margin: '0 auto 16px auto', opacity: 0.4 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--sh-slate-800)', margin: '0 0 8px 0' }}>No payment records found</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  {paymentSearch || paymentStatusFilter !== 'Success' 
                    ? 'No transactions match your active search or filter criteria for this period.' 
                    : 'There are no verified payments recorded for this reporting period.'}
                </p>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%', minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '1040px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                      <tr>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '180px' }}>Paid By</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '180px' }}>Payment For (Beneficiary)</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '140px' }}>Bill / Month</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '130px' }}>Amount Paid</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '150px' }}>Payment Date</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '170px' }}>Receipt / Ref</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '130px' }}>Method</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '120px' }}>Status</th>
                        <th style={{ padding: '14px 18px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', textAlign: 'right', minWidth: '140px' }}>Receipt Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => {
                        const { bg, text, label, icon: StatusIcon } = getStatusDisplay(p.status);
                        const isSuccess = p.status === 'Success';
                        const isPayerAvailable = !!(p.payerName || p.payerId?.name);
                        const payerDisplayName = p.payerName || p.payerId?.name;
                        const payerDisplayEmail = p.payerEmail || p.payerId?.email;

                        const beneficiaryName = p.residentId?.name || 'Resident';
                        const targetFlat = p.flatNumber || p.residentId?.flatNumber || p.billId?.flatNumber || 'N/A';

                        return (
                          <tr key={p._id} style={{ borderBottom: '1px solid var(--sh-slate-200)' }}>
                            {/* Paid By Column */}
                            <td style={{ padding: '14px 18px' }}>
                              {isPayerAvailable ? (
                                <div>
                                  <div style={{ fontWeight: '600', color: 'var(--sh-slate-900)', fontSize: '0.875rem' }}>
                                    {payerDisplayName}
                                  </div>
                                  {payerDisplayEmail && (
                                    <div style={{ color: 'var(--sh-slate-500)', fontSize: '0.72rem' }}>
                                      {payerDisplayEmail}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--sh-slate-400)' }}>
                                  Payer information unavailable
                                </span>
                              )}
                            </td>

                            {/* Payment For Column */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: '700', color: '#0284c7', fontSize: '0.875rem' }}>
                                Flat {targetFlat}
                              </div>
                              <div style={{ color: 'var(--sh-slate-600)', fontSize: '0.75rem' }}>
                                {beneficiaryName} {p.residentId?.email ? `• ${p.residentId.email}` : ''}
                              </div>
                            </td>

                            <td style={{ padding: '14px 18px', fontSize: '0.875rem', color: 'var(--sh-slate-700)', fontWeight: '500' }}>
                              <div style={{ fontWeight: '600', color: 'var(--sh-slate-900)' }}>{p.billId?.month || p.billingMonth || '—'}</div>
                              {p.billId?.isTransferredArrear && (
                                <span style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', color: isDark ? '#fbbf24' : '#92400e', fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                  Transferred Arrears
                                </span>
                              )}
                              {p.billId?._id && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--sh-slate-400)', fontFamily: 'monospace' }}>
                                  Ref: #{String(p.billId._id).slice(-6)}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '700', color: isSuccess ? 'var(--sh-slate-900)' : 'var(--sh-slate-500)', fontSize: '0.9rem' }}>
                                <IndianRupee size={14} /> {Number(p.amount || 0).toLocaleString('en-IN')}
                              </div>
                              {p.billId?.amount && p.billId.amount !== p.amount && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>
                                  Due: ₹{Number(p.billId.amount).toLocaleString('en-IN')}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--sh-slate-600)', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: '500' }}>
                                {new Date(p.paidAt || p.createdAt).toLocaleDateString()}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--sh-slate-400)' }}>
                                {new Date(p.paidAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontSize: '0.875rem', color: 'var(--sh-slate-900)', fontWeight: '600', fontFamily: 'monospace' }}>
                                {p.receiptNumber || '—'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--sh-slate-400)', fontFamily: 'monospace' }}>
                                {p.razorpayPaymentId || p.razorpayOrderId}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '0.85rem', color: 'var(--sh-slate-600)' }}>
                              {p.paymentMethod || 'Razorpay Online'}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ 
                                backgroundColor: bg, 
                                color: text, 
                                padding: '4px 10px', 
                                borderRadius: '9999px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                <StatusIcon size={12} />
                                {label}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedReceipt(p)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #0284c7',
                                  backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#ffffff',
                                  color: isDark ? '#38bdf8' : '#0284c7',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(2, 132, 199, 0.25)' : '#f0f9ff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(2, 132, 199, 0.15)' : '#ffffff'; }}
                              >
                                <Receipt size={13} /> View Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {paymentsPagination.totalPages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 20px', 
                    borderTop: '1px solid #e2e8f0', 
                    backgroundColor: '#f8fafc',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Showing page {paymentsPagination.page} of {paymentsPagination.totalPages} ({paymentsPagination.totalCount} total records)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const p = Math.max(1, paymentsPagination.page - 1);
                          setPaymentsPagination(prev => ({ ...prev, page: p }));
                          fetchPayments(false, { page: p });
                        }}
                        disabled={paymentsPagination.page <= 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          cursor: paymentsPagination.page <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: paymentsPagination.page <= 1 ? '#94a3b8' : '#334155'
                        }}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <button
                        onClick={() => {
                          const p = Math.min(paymentsPagination.totalPages, paymentsPagination.page + 1);
                          setPaymentsPagination(prev => ({ ...prev, page: p }));
                          fetchPayments(false, { page: p });
                        }}
                        disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          cursor: paymentsPagination.page >= paymentsPagination.totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: paymentsPagination.page >= paymentsPagination.totalPages ? '#94a3b8' : '#334155'
                        }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: PENDING & OVERDUE BILLS */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls & Bulk Toolbar */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
                <input 
                  type="text" 
                  placeholder="Search by resident name, flat number, bill reference, month..." 
                  value={billSearch}
                  onChange={(e) => setBillSearch(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 36px 10px 40px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.875rem', 
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box' 
                  }}
                />
                {billSearch && (
                  <button
                    type="button"
                    onClick={() => setBillSearch('')}
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
                    <X size={16} />
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', minWidth: '200px' }}>
                <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
                <select 
                  value={billStatusFilter}
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 10px 10px 40px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.875rem', 
                    backgroundColor: '#ffffff', 
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="unpaid">All Unpaid Bills</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Overdue">Overdue Only</option>
                  <option value="PaymentInitiated">Payment Initiated</option>
                </select>
              </div>

              {/* Transfer Prior Arrears Action */}
              <button
                type="button"
                onClick={() => setShowTransferArrearsModal(true)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={16} color="#d97706" /> Transfer Prior Arrears
              </button>
            </div>

            {/* Bulk Reminder Action Button */}
            {selectedBillIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#eff6ff', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e40af' }}>
                  {selectedBillIds.size} bill{selectedBillIds.size === 1 ? '' : 's'} selected ({distinctResidentCount} resident{distinctResidentCount === 1 ? '' : 's'})
                </span>
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                  }}
                >
                  <Send size={14} /> Send Reminders ({selectedBillIds.size})
                </button>
              </div>
            )}
          </div>

          {/* Pending Bills Table Card (Contained horizontal scroll, minWidth to avoid clipping) */}
          <div style={{ 
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            backgroundColor: 'var(--sh-white)', 
            borderRadius: '12px', 
            boxShadow: 'var(--sh-shadow-xs)', 
            border: '1px solid var(--sh-slate-200)', 
            overflow: 'hidden' 
          }}>
            {billsLoading && bills.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '12px' }}>
                <RefreshCw size={24} color="#d97706" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--sh-slate-500)', fontSize: '0.9rem' }}>Loading pending maintenance records...</span>
              </div>
            ) : bills.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
                <CheckCircle2 size={48} color="#166534" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: isDark ? '#34d399' : '#166534', margin: '0 0 8px 0' }}>All dues cleared for this selection!</h3>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  {billSearch || billStatusFilter !== 'unpaid' 
                    ? 'No bills match your current search or status criteria.' 
                    : 'There are no pending or overdue maintenance bills for this reporting period.'}
                </p>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%', minWidth: 0, WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                      <tr>
                        <th style={{ padding: '14px 16px', width: '44px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isAllEligibleSelected}
                            onChange={handleToggleSelectAll}
                            disabled={eligibleBillsOnPage.length === 0}
                            title="Select all eligible on this page"
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '220px' }}>Resident & Flat</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '130px' }}>Billing Period</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '130px' }}>Outstanding Amount</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '140px' }}>Due Date</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '120px' }}>Current Status</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', minWidth: '150px' }}>Reminder Status</th>
                        <th style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--sh-slate-600)', textAlign: 'right', minWidth: '130px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map(b => {
                        const isEligible = b.status !== 'Paid' && b.status !== 'Cancelled';
                        const isSelected = selectedBillIds.has(b._id);
                        const isOverdue = new Date(b.dueDate) < new Date() && b.status !== 'Paid';
                        const { bg, text, label, icon: StatusIcon } = getStatusDisplay(isOverdue && b.status === 'Pending' ? 'Overdue' : b.status);

                        return (
                          <tr key={b._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f8fafc' : 'transparent' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectBill(b._id)}
                                disabled={!isEligible}
                                style={{ cursor: isEligible ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
                              />
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                                  {b.residentId?.name || 'Unassigned Resident'}
                                </span>
                                {b.isTransferredArrear && (
                                  <span style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '700',
                                    border: '1px solid #fde68a'
                                  }}>
                                    Transferred Arrear
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                                Flat: <strong>{b.flatNumber || b.residentId?.flatNumber || 'N/A'}</strong> {b.residentId?.email ? `• ${b.residentId.email}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}>
                              {b.month}
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                #{b._id.slice(-6)}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                                <IndianRupee size={14} /> {Number(b.amount || 0).toLocaleString('en-IN')}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: isOverdue ? '700' : '500', color: isOverdue ? '#dc2626' : '#475569' }}>
                                {new Date(b.dueDate).toLocaleDateString()}
                              </div>
                              {isOverdue && (
                                <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '700' }}>
                                  Overdue
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ 
                                backgroundColor: bg, 
                                color: text, 
                                padding: '4px 10px', 
                                borderRadius: '9999px', 
                                fontSize: '0.75rem', 
                                fontWeight: '700', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}>
                                <StatusIcon size={12} />
                                {isOverdue && b.status === 'Pending' ? 'Overdue' : label}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#64748b' }}>
                              {b.lastReminderSentAt ? (
                                <div>
                                  <div style={{ fontWeight: '600', color: '#0f172a' }}>
                                    {new Date(b.lastReminderSentAt).toLocaleDateString()}
                                  </div>
                                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                                    {b.reminderCount} sent
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Never sent</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              {isEligible ? (
                                <button
                                  type="button"
                                  onClick={() => setReminderModalBill(b)}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #d97706',
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    fontSize: '0.78rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title="Send payment reminder to this resident"
                                >
                                  <Bell size={13} /> Send Reminder
                                </button>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No action</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {billsPagination.totalPages > 1 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '12px 20px', 
                    borderTop: '1px solid #e2e8f0', 
                    backgroundColor: '#f8fafc',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Showing page {billsPagination.page} of {billsPagination.totalPages} ({billsPagination.totalCount} total bills)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const p = Math.max(1, billsPagination.page - 1);
                          setBillsPagination(prev => ({ ...prev, page: p }));
                          fetchBills(false, { page: p });
                        }}
                        disabled={billsPagination.page <= 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          cursor: billsPagination.page <= 1 ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: billsPagination.page <= 1 ? '#94a3b8' : '#334155'
                        }}
                      >
                        <ChevronLeft size={16} /> Previous
                      </button>
                      <button
                        onClick={() => {
                          const p = Math.min(billsPagination.totalPages, billsPagination.page + 1);
                          setBillsPagination(prev => ({ ...prev, page: p }));
                          fetchBills(false, { page: p });
                        }}
                        disabled={billsPagination.page >= billsPagination.totalPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          cursor: billsPagination.page >= billsPagination.totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: billsPagination.page >= billsPagination.totalPages ? '#94a3b8' : '#334155'
                        }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTHORITATIVE RECEIPT MODAL */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          paymentId={selectedReceipt?._id || selectedReceipt?.id}
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* EXPLICIT AUTHORIZED ARREARS TRANSFER MODAL (PHASE 5) */}
      {showTransferArrearsModal && (
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
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#b45309" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#78350f' }}>
                  Authorize & Transfer Prior Arrears
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferArrearsModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransferArrears}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ padding: '12px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.8rem', color: '#991b1b' }}>
                  <strong>Important Accounting Rule:</strong> New residents do NOT automatically inherit previous occupants&apos; dues. A transfer must only be executed if explicitly mandated by the sale deed or society resolution, and will be separately audited.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                    Target Resident *
                  </label>
                  <select
                    required
                    value={transferForm.targetResidentId}
                    onChange={(e) => {
                      const selected = residentOptions.find(r => r._id === e.target.value);
                      setTransferForm(prev => ({
                        ...prev,
                        targetResidentId: e.target.value,
                        flatNumber: selected?.flatNumber || prev.flatNumber
                      }));
                    }}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  >
                    <option value="">Select target resident...</option>
                    {residentOptions.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.name} (Flat {r.flatNumber || 'N/A'}) - {r.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                      Flat Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. A-402"
                      value={transferForm.flatNumber}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, flatNumber: e.target.value }))}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                      Arrears Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 15000"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                      Billing Period / Month
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prior Arrears 2026"
                      value={transferForm.billingMonth}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, billingMonth: e.target.value }))}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={transferForm.dueDate}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                    Transfer Audit Reference / Resolution Ref *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AGM-RES-2026-04 or SALE-DEED-CL-8"
                    value={transferForm.transferReference}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, transferReference: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>
                    Documented Reason & Legal Justification *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide explicit justification: e.g. Buyer agreed under Deed Clause 4 to clear seller's unpaid dues from Jan-Mar 2026..."
                    value={transferForm.reason}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    required
                    checked={transferForm.confirmed}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                    <strong>I confirm authorization:</strong> This transfer is authorized by society rules / sale deed, will be separately tracked as a Transferred Arrears liability, and will not be silently merged with standard monthly maintenance dues.
                  </span>
                </label>
              </div>

              <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferArrearsModal(false)}
                  disabled={transferSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting || !transferForm.confirmed}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: transferSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {transferSubmitting ? 'Transferring...' : 'Execute Arrears Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM INDIVIDUAL REMINDER */}
      <ConfirmModal
        isOpen={!!reminderModalBill}
        title="Send Payment Reminder"
        confirmText="Send Reminder"
        confirmVariant="primary"
        loading={isSendingIndividual}
        onConfirm={handleConfirmSendIndividual}
        onClose={() => setReminderModalBill(null)}
      >
        {reminderModalBill && (
          <div style={{ marginTop: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#64748b', padding: '4px 0' }}>Resident:</td>
                  <td style={{ fontWeight: '700', textAlign: 'right', color: '#0f172a' }}>{reminderModalBill.residentId?.name}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '4px 0' }}>Flat:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>{reminderModalBill.flatNumber || reminderModalBill.residentId?.flatNumber}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '4px 0' }}>Billing Period:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#0f172a' }}>{reminderModalBill.month}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '4px 0' }}>Outstanding Amount:</td>
                  <td style={{ fontWeight: '800', textAlign: 'right', color: '#dc2626' }}>₹{Number(reminderModalBill.amount || 0).toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style={{ color: '#64748b', padding: '4px 0' }}>Due Date:</td>
                  <td style={{ fontWeight: '600', textAlign: 'right', color: '#2563eb' }}>{new Date(reminderModalBill.dueDate).toLocaleDateString()}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ margin: '12px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              An email and in-app notification will be dispatched immediately to this resident.
            </p>
          </div>
        )}
      </ConfirmModal>

      {/* MODAL 3: CONFIRM BULK REMINDERS */}
      <ConfirmModal
        isOpen={showBulkConfirmModal}
        title="Confirm Bulk Reminders"
        confirmText={`Send ${selectedBillIds.size} Reminders`}
        confirmVariant="primary"
        loading={isSendingBulk}
        onConfirm={handleConfirmSendBulk}
        onClose={() => setShowBulkConfirmModal(false)}
      >
        <div style={{ marginTop: '8px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#334155' }}>
            You are about to dispatch payment reminders to <strong>{selectedBillIds.size} pending maintenance bills</strong> across <strong>{distinctResidentCount} distinct resident{distinctResidentCount === 1 ? '' : 's'}</strong>.
          </p>
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', fontSize: '0.8rem', color: '#1e40af' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Security & Accuracy Guarantee:</div>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              <li>Each bill's payment status is re-verified right before dispatch.</li>
              <li>Any bills already paid or cancelled will be automatically skipped.</li>
              <li>Delivery reports email acceptance and in-app notification creation separately.</li>
            </ul>
          </div>
        </div>
      </ConfirmModal>

      {/* MODAL 4: BULK SEND RESULTS SUMMARY */}
      {bulkResultModal && (
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
            maxWidth: '640px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCheck size={20} color="#166534" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
                  Bulk Reminder Dispatch Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkResultModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700' }}>SUCCESSFUL</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>
                    {bulkResultModal.summary?.successfulDeliveries || 0}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '700' }}>FAILED</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#dc2626' }}>
                    {bulkResultModal.summary?.failedDeliveries || 0}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>SKIPPED</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#64748b' }}>
                    {bulkResultModal.summary?.skippedCount || 0}
                  </div>
                </div>
              </div>

              {/* Recipient results table */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#334155' }}>Delivery Outcomes:</h4>
                <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '8px 12px', color: '#64748b' }}>Flat & Resident</th>
                        <th style={{ padding: '8px 12px', color: '#64748b' }}>Billing Month</th>
                        <th style={{ padding: '8px 12px', color: '#64748b' }}>In-App Notice</th>
                        <th style={{ padding: '8px 12px', color: '#64748b' }}>Email Delivery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bulkResultModal.results || []).map((r, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: '600' }}>Flat {r.flatNumber}</div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{r.residentName}</div>
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '500' }}>{r.month}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {r.inAppNotification ? (
                              <span style={{ color: '#166534', fontWeight: '600' }}>✓ Created</span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>✗ Failed</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {r.emailSent ? (
                              <span style={{ color: '#166534', fontWeight: '600' }}>
                                ✓ {r.acceptedBySmtp ? 'SMTP Accepted' : 'Dispatched'}
                              </span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>
                                ✗ {r.emailReason || 'Failed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setBulkResultModal(null)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
