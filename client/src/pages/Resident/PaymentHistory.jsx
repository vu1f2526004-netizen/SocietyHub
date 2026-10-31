import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import PeriodFilterBar from '../../components/Finance/PeriodFilterBar';
import ReceiptModal from '../../components/Finance/ReceiptModal';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Receipt,
  Download,
  X,
  Printer,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Search
} from 'lucide-react';

const SummaryCard = ({ title, value, icon: Icon, color, bg, subtitle }) => (
  <div style={{ padding: '18px 20px', backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px', boxShadow: 'var(--sh-shadow-xs)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ padding: '7px', backgroundColor: bg, color: color, borderRadius: '8px' }}>
        <Icon size={16} />
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
      <IndianRupee size={18} color="var(--sh-slate-900)" strokeWidth={2.5} />
      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--sh-slate-900)', lineHeight: 1 }}>
        {Number(value || 0).toLocaleString()}
      </span>
    </div>
    {subtitle && <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>{subtitle}</span>}
  </div>
);

const PaymentHistory = () => {
  const { user } = useContext(AuthContext);
  const { isDark } = useTheme();
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Persistent Period Filter State (URL + user-scoped localStorage)
  const { filterState, applyFilter } = usePeriodFilter('resident_payments', 'this-month');
  const prevFilterJsonRef = useRef(JSON.stringify(filterState));

  // Table filters & pagination
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalCount: 0 });

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchData = useCallback(async (isRefresh = false, overrides = {}) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const activeFilter = {
        ...filterState,
        ...overrides
      };

      const activeSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;
      const activeStatus = overrides.status !== undefined ? overrides.status : statusFilter;

      const params = {};
      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;
      if (activeStatus !== 'All') params.status = activeStatus;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();
      params.page = activeFilter.page || pagination.page;
      params.limit = pagination.limit;

      const [resPayments, resSummary] = await Promise.all([
        api.get('/payments/my', { params }),
        api.get('/finance/resident/summary', { params })
      ]);

      if (resPayments.data?.data) {
        setPayments(resPayments.data.data);
        if (resPayments.data.totalPages !== undefined) {
          setPagination(prev => ({
            ...prev,
            page: resPayments.data.page || prev.page,
            totalPages: resPayments.data.totalPages || 1,
            totalCount: resPayments.data.totalCount || resPayments.data.data.length
          }));
        }
      }

      if (resSummary.data?.data) {
        setSummary(resSummary.data.data);
      }
    } catch (err) {
      console.error('Failed to load resident payment history:', err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to load payment history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterState, statusFilter, debouncedSearch, pagination.page, pagination.limit, toast]);

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

  // When debounced search changes, fetch updated filtered data
  const isSearchMountRef = useRef(true);
  useEffect(() => {
    if (isSearchMountRef.current) {
      isSearchMountRef.current = false;
      return;
    }
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchData(true, { search: debouncedSearch, page: 1 });
  }, [debouncedSearch]);

  const handlePeriodApply = (newFilter) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    const updated = applyFilter(newFilter);
    prevFilterJsonRef.current = JSON.stringify(updated);
    fetchData(true, { ...updated, page: 1 });
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Success':
        return { bg: 'var(--sh-badge-success-bg)', text: 'var(--sh-badge-success-text)', border: 'var(--sh-badge-success-border)', icon: CheckCircle2, label: 'Verified Paid' };
      case 'Failed':
        return { bg: 'var(--sh-badge-danger-bg)', text: 'var(--sh-badge-danger-text)', border: 'var(--sh-badge-danger-border)', icon: XCircle, label: 'Payment Failed' };
      case 'Pending':
        return { bg: 'var(--sh-badge-warning-bg)', text: 'var(--sh-badge-warning-text)', border: 'var(--sh-badge-warning-border)', icon: Clock, label: 'Pending Processing' };
      default:
        return { bg: 'var(--sh-badge-neutral-bg)', text: 'var(--sh-badge-neutral-text)', border: 'var(--sh-badge-neutral-border)', icon: FileText, label: status || 'Unknown' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = summary?.periodSummary?.periodLabel || 'This Month';
  const periodSummary = summary?.periodSummary || {
    totalPaid: payments.filter(p => p.status === 'Success').reduce((sum, p) => sum + (p.amount || 0), 0),
    successfulPaymentsCount: payments.filter(p => p.status === 'Success').length,
    failedPaymentsCount: payments.filter(p => p.status === 'Failed').length,
    pendingDues: 0,
    pendingBillsCount: 0
  };

  const lifetimeSummary = summary?.lifetimeSummary || {
    totalPaid: 0,
    successfulPaymentsCount: 0,
    pendingDues: 0,
    pendingBillsCount: 0
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            My Maintenance Payments & Receipts
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            Date-filtered personal payment records, transaction receipts, and pending maintenance bill tracker.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to="/resident/bills"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              borderRadius: '8px',
              padding: '9px 16px',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            <IndianRupee size={16} />
            View Pending Bills
          </Link>
        </div>
      </div>

      {/* Period Filter Bar */}
      <PeriodFilterBar
        initialPeriod={filterState.period}
        initialMonth={filterState.month}
        initialYear={filterState.year}
        initialStartDate={filterState.startDate}
        initialEndDate={filterState.endDate}
        periodLabel={periodLabel}
        availableYears={summary?.availableYears || []}
        onApply={handlePeriodApply}
        onRefresh={handleRefresh}
        loading={loading}
        refreshing={refreshing}
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <SummaryCard 
          title="Period Collections Paid" 
          value={periodSummary.totalPaid} 
          icon={TrendingUp} 
          color="#166534" 
          bg="#dcfce7" 
          subtitle={`${periodSummary.successfulPaymentsCount || 0} payment(s) in ${periodLabel}`}
        />
        <SummaryCard 
          title="Period Pending Dues" 
          value={periodSummary.pendingDues} 
          icon={AlertCircle} 
          color="#c2410c" 
          bg="#ffedd5" 
          subtitle={`${periodSummary.pendingBillsCount || 0} bill(s) due`}
        />
        <SummaryCard 
          title="Failed Payment Attempts" 
          value={periodSummary.failedTransactionsCount || periodSummary.failedPaymentsCount || 0} 
          icon={XCircle} 
          color="#991b1b" 
          bg="#fee2e2" 
          subtitle="Recorded attempts in period"
        />
        <SummaryCard 
          title="Lifetime Total Paid" 
          value={lifetimeSummary.totalPaid} 
          icon={ShieldCheck} 
          color="#1e40af" 
          bg="#dbeafe" 
          subtitle={`${lifetimeSummary.successfulPaymentsCount || 0} total lifetime payments`}
        />
      </div>

      {/* Payment Records Section */}
      <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '14px', border: '1px solid var(--sh-slate-200)', boxShadow: 'var(--sh-shadow-xs)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sh-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
              Transaction History ({periodLabel})
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} color="var(--sh-slate-400)" style={{ position: 'absolute', top: '9px', left: '10px' }} />
              <input
                type="text"
                placeholder="Search receipt / ref..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                style={{
                  width: '100%',
                  padding: '6px 28px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--sh-slate-300)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--sh-white)',
                  color: 'var(--sh-slate-900)',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearch('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                    fetchData(false, { search: '', page: 1 });
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '6px',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--sh-slate-400)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="payment-status-filter" style={{ fontSize: '0.8rem', color: 'var(--sh-slate-500)', fontWeight: '500' }}>Status:</label>
              <select
                id="payment-status-filter"
                aria-label="Filter payments by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                  fetchData(true, { status: e.target.value, page: 1 });
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--sh-slate-300)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--sh-white)',
                  color: 'var(--sh-slate-900)'
                }}
              >
                <option value="All">All Transactions</option>
                <option value="Success">Success (Verified)</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} style={{ color: '#0284c7', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Loading transaction records...</p>
          </div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <Receipt size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
              {searchTerm || statusFilter !== 'All' 
                ? 'No transactions found' 
                : `No transactions for ${periodLabel}`}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#64748b' }}>
              {searchTerm || statusFilter !== 'All'
                ? `No payment transactions match your query "${searchTerm}". Try adjusting your keywords or clearing the filter.`
                : `Total paid for this period: ₹0. You have no payments recorded for the selected date range.`}
            </p>
            {searchTerm || statusFilter !== 'All' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  setStatusFilter('All');
                  setPagination(prev => ({ ...prev, page: 1 }));
                  fetchData(true, { search: '', status: 'All', page: 1 });
                }}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#0284c7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear Search & Filters
              </button>
            ) : (
              <Link
                to="/resident/bills"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}
              >
                Check pending maintenance bills →
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Receipt Number</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Billing Period</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Paid By</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Payment For</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Amount</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Payment Ref</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569' }}>Status</th>
                  <th style={{ padding: '14px 16px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badge = getStatusDisplay(p.status);
                  const StatusIcon = badge.icon;
                  const billMonth = p.billId?.month || p.billingMonth || 'Maintenance';
                  const dateObj = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
                  const dateStr = dateObj.toLocaleDateString('en-IN', { dateStyle: 'medium' });
                  const timeStr = dateObj.toLocaleTimeString('en-IN', { timeStyle: 'short' });

                  const isPayerAvailable = !!(p.payerName || p.payerId?.name);
                  const payerDisplayName = p.payerName || p.payerId?.name;
                  const isPayerSelf = p.payerId?._id === user?._id || p.payerId === user?._id || p.payerEmail === user?.email;

                  const beneficiaryName = p.residentId?.name || user?.name || 'Resident';
                  const targetFlat = p.flatNumber || p.billId?.flatNumber || p.residentId?.flatNumber || user?.flatNumber || 'N/A';

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px', color: '#334155', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{dateStr}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{timeStr}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>
                        {p.receiptNumber || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{billMonth}</div>
                        {p.billId?.isTransferredArrear && (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                            Transferred Arrears
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPayerAvailable ? (
                          <div>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>
                              {payerDisplayName} {isPayerSelf ? '(You)' : ''}
                            </span>
                            {p.payerEmail && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.payerEmail}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#94a3b8' }}>
                            Payer information unavailable
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0284c7' }}>Flat {targetFlat}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{beneficiaryName}</div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#0f172a' }}>
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                        {p.razorpayPaymentId || p.razorpayOrderId || '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            backgroundColor: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.text,
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <StatusIcon size={12} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {p.status === 'Success' ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(p)}
                            style={{
                              backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#ffffff',
                              border: '1px solid #0284c7',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: isDark ? '#38bdf8' : '#0284c7',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(2, 132, 199, 0.25)' : '#f0f9ff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isDark ? 'rgba(2, 132, 199, 0.15)' : '#ffffff'; }}
                          >
                            <Receipt size={14} /> View Receipt
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--sh-slate-400)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid var(--sh-slate-200)', backgroundColor: 'var(--sh-slate-100)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--sh-slate-500)' }}>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} records)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const prevPage = Math.max(1, pagination.page - 1);
                  setPagination(prev => ({ ...prev, page: prevPage }));
                  fetchData(true, { page: prevPage });
                }}
                disabled={pagination.page <= 1}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--sh-slate-300)', backgroundColor: 'var(--sh-white)',
                  color: 'var(--sh-slate-700)', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => {
                  const nextPage = Math.min(pagination.totalPages, pagination.page + 1);
                  setPagination(prev => ({ ...prev, page: nextPage }));
                  fetchData(true, { page: nextPage });
                }}
                disabled={pagination.page >= pagination.totalPages}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--sh-slate-300)', backgroundColor: 'var(--sh-white)',
                  color: 'var(--sh-slate-700)', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal 
          payment={selectedReceipt} 
          paymentId={selectedReceipt?._id || selectedReceipt?.id}
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)} 
        />
      )}
    </div>
  );
};

export default PaymentHistory;
