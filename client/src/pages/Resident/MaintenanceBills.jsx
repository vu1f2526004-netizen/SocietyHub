import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { loadRazorpayScript, openRazorpayCheckout } from '../../utils/razorpay';
import PeriodFilterBar from '../../components/Finance/PeriodFilterBar';
import RefreshButton from '../../components/shared/RefreshButton';
import Button from '../../components/ui/Button';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
import {
  IndianRupee,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Loader2,
  X,
  ArrowRight,
  Receipt,
  AlertTriangle,
  Search
} from 'lucide-react';

const MaintenanceBills = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unpaid', 'paid'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  
  // Persistent Period Filter State (URL + user-scoped localStorage)
  const { filterState: periodFilter, applyFilter } = usePeriodFilter('resident_bills', 'all');
  const prevFilterJsonRef = useRef(JSON.stringify(periodFilter));

  // Transaction In-Flight States
  const [processingBillId, setProcessingBillId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dismissedNotice, setDismissedNotice] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const fetchBills = useCallback(async (filterOverride, isRefresh = false, searchOverride) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const activeFilter = (filterOverride && typeof filterOverride === 'object' && !filterOverride.nativeEvent) 
        ? filterOverride 
        : periodFilter;
      const activeSearch = searchOverride !== undefined ? searchOverride : debouncedSearch;

      const params = {};
      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get('/bills/my', { params });
      setBills(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load maintenance bills.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchBills();
  }, []);

  // When periodFilter changes from URL or storage, fetch updated data
  useEffect(() => {
    const currentJson = JSON.stringify(periodFilter);
    if (prevFilterJsonRef.current !== currentJson) {
      prevFilterJsonRef.current = currentJson;
      fetchBills(periodFilter, true);
    }
  }, [periodFilter, fetchBills]);

  // When debounced search changes, fetch updated filtered bills
  const isSearchMountRef = useRef(true);
  useEffect(() => {
    if (isSearchMountRef.current) {
      isSearchMountRef.current = false;
      return;
    }
    fetchBills(null, true, debouncedSearch);
  }, [debouncedSearch]);

  const handlePeriodApply = (newFilter) => {
    const updated = applyFilter(newFilter);
    prevFilterJsonRef.current = JSON.stringify(updated);
    fetchBills(updated, true);
  };

  const handleRefresh = () => {
    fetchBills(null, true);
  };

  const handlePayNow = async (bill) => {
    // 1. Guard against duplicate clicks & already-paid bills
    if (processingBillId || isVerifying) return;
    if (bill.status === 'Paid') {
      setErrorMessage('This bill is already marked as Paid.');
      return;
    }

    setErrorMessage(null);
    setDismissedNotice(null);
    setSuccessReceipt(null);
    setProcessingBillId(bill._id);

    try {
      // 2. Load Razorpay Checkout SDK
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Unable to load Razorpay Checkout SDK. Please check your internet connection.');
      }

      // 3. Authenticated order creation with trusted backend verification
      const orderRes = await api.post('/payments/create-order', { billId: bill._id });
      if (!orderRes.data?.success || !orderRes.data?.data?.order) {
        throw new Error(orderRes.data?.message || 'Server failed to generate a payment order.');
      }

      const { order, paymentId, key, isMock } = orderRes.data.data;
      const razorpayKey = key || import.meta.env.VITE_RAZORPAY_KEY_ID || '';

      // 4. Open Razorpay Standard Checkout Modal
      openRazorpayCheckout({
        order,
        bill,
        user,
        keyId: razorpayKey,
        isMock,
        onDismiss: () => {
          setProcessingBillId(null);
          setDismissedNotice(`Checkout modal was closed for ${bill.month}. No payment was processed, and your bill remains pending.`);
          fetchBills();
        },
        onFailure: (errResp) => {
          setProcessingBillId(null);
          const failureDetail = errResp?.description || errResp?.reason || 'Transaction could not be completed';
          setErrorMessage(`Payment notice: ${failureDetail}. Your bill remains pending until confirmed.`);
          fetchBills();
        },
        onSuccess: async (checkoutResponse) => {
          // 5. Authoritative backend signature verification
          setProcessingBillId(null);
          setIsVerifying(true);
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: checkoutResponse.razorpay_order_id,
              razorpay_payment_id: checkoutResponse.razorpay_payment_id,
              razorpay_signature: checkoutResponse.razorpay_signature
            });

            if (verifyRes.data?.success) {
              const verifiedPayment = verifyRes.data.data;
              // 6. Confirmed success state
              setSuccessReceipt({
                receiptNumber: verifiedPayment?.receiptNumber || `REC-${paymentId}`,
                paymentId: checkoutResponse.razorpay_payment_id,
                orderId: checkoutResponse.razorpay_order_id,
                amount: bill.amount,
                month: bill.month,
                flatNumber: bill.flatNumber || user?.flatNumber,
                paidAt: new Date().toLocaleString()
              });
              // Refresh bills from backend
              await fetchBills();
              toast.success(`Payment of ₹${bill.amount} for ${bill.month} verified! Receipt: ${verifiedPayment?.receiptNumber || 'Issued'}`, 'Payment Verified');
            } else {
              setErrorMessage('Payment verification failed on the server. Your bill status has not been updated.');
              toast.error('Payment verification failed on server', 'Verification Failed');
              await fetchBills();
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            const errMsg = verifyErr.response?.data?.message ||
              verifyErr.response?.data?.error ||
              'Payment verification failed on the server. Your bill remains pending.';
            setErrorMessage(errMsg);
            toast.error(errMsg, 'Verification Error');
            await fetchBills();
          } finally {
            setIsVerifying(false);
          }
        }
      });
    } catch (err) {
      console.error('Order creation / checkout initiation error:', err);
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || err.message || 'Could not initiate payment.');
      setProcessingBillId(null);
      setIsVerifying(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return {
          bg: 'var(--sh-badge-success-bg)',
          border: 'var(--sh-badge-success-border)',
          text: 'var(--sh-badge-success-text)',
          label: 'Paid',
          icon: CheckCircle2
        };
      case 'Pending':
        return {
          bg: 'var(--sh-badge-warning-bg)',
          border: 'var(--sh-badge-warning-border)',
          text: 'var(--sh-badge-warning-text)',
          label: 'Pending',
          icon: Clock
        };
      case 'PaymentInitiated':
        return {
          bg: 'var(--sh-badge-info-bg)',
          border: 'var(--sh-badge-info-border)',
          text: 'var(--sh-badge-info-text)',
          label: 'Payment Initiated',
          icon: Clock
        };
      case 'Overdue':
        return {
          bg: 'var(--sh-badge-danger-bg)',
          border: 'var(--sh-badge-danger-border)',
          text: 'var(--sh-badge-danger-text)',
          label: 'Overdue',
          icon: AlertCircle
        };
      case 'Failed':
        return {
          bg: 'var(--sh-badge-danger-bg)',
          border: 'var(--sh-badge-danger-border)',
          text: 'var(--sh-badge-danger-text)',
          label: 'Failed',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'var(--sh-badge-neutral-bg)',
          border: 'var(--sh-badge-neutral-border)',
          text: 'var(--sh-badge-neutral-text)',
          label: status || 'Pending',
          icon: FileText
        };
    }
  };

  const isEligibleForPayment = (status) => {
    return ['Pending', 'PaymentInitiated', 'Failed', 'Overdue'].includes(status);
  };

  // Filtered bills
  const filteredBills = bills.filter(bill => {
    if (filter === 'unpaid') return isEligibleForPayment(bill.status);
    if (filter === 'paid') return bill.status === 'Paid';
    return true;
  });

  // Analytics totals
  const totalDue = bills
    .filter(b => isEligibleForPayment(b.status))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const totalPaid = bills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const unpaidCount = bills.filter(b => isEligibleForPayment(b.status)).length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header and Quick Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--sh-slate-900)', margin: '0 0 4px 0' }}>
            Maintenance & Society Fees
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--sh-slate-500)' }}>
            Review your flat maintenance dues and complete secure payments via Razorpay Gateway.
          </p>
        </div>

        <Button
          as={Link}
          to="/resident/payments"
          variant="outline"
          icon={Receipt}
          style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            padding: '10px 18px',
            textDecoration: 'none'
          }}
        >
          View Payment History
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--sh-shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Outstanding Dues</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: totalDue > 0 ? 'var(--sh-badge-danger-bg)' : 'var(--sh-badge-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalDue > 0 ? 'var(--sh-badge-danger-text)' : 'var(--sh-badge-success-text)' }}>
              <IndianRupee size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: totalDue > 0 ? 'var(--sh-badge-danger-text)' : 'var(--sh-slate-900)' }}>
            ₹{totalDue.toLocaleString()}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--sh-slate-500)' }}>
            {unpaidCount} unpaid {unpaidCount === 1 ? 'bill' : 'bills'} pending settlement
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--sh-shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Total Paid To Date</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--sh-badge-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sh-badge-success-text)' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--sh-badge-success-text)' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--sh-slate-500)' }}>
            Verified on society ledger
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--sh-shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--sh-slate-500)' }}>Assigned Flat</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--sh-badge-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sh-badge-info-text)' }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--sh-slate-900)' }}>
            Flat {user?.flatNumber || 'N/A'}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--sh-slate-500)' }}>
            Tenant-isolated billing
          </p>
        </div>
      </div>

      {/* Verification In-Flight Overlay / Banner */}
      {isVerifying && (
        <div style={{ backgroundColor: 'var(--sh-badge-info-bg)', border: '1px solid var(--sh-badge-info-border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={24} style={{ color: 'var(--sh-badge-info-text)', animation: 'spin 1s linear infinite' }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--sh-badge-info-text)' }}>
              Verifying Payment with Society Ledger...
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--sh-slate-600)' }}>
              Please do not refresh the page. We are securely validating your transaction signature and generating your receipt.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div style={{ backgroundColor: 'var(--sh-badge-danger-bg)', border: '1px solid var(--sh-badge-danger-border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: 'var(--sh-badge-danger-text)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--sh-badge-danger-text)' }}>Payment Error</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--sh-slate-600)' }}>{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--sh-badge-danger-text)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Dismissed / Cancelled Notice Banner */}
      {dismissedNotice && (
        <div style={{ backgroundColor: 'var(--sh-badge-warning-bg)', border: '1px solid var(--sh-badge-warning-border)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ color: 'var(--sh-badge-warning-text)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'var(--sh-badge-warning-text)' }}>Payment Cancelled</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--sh-slate-600)' }}>{dismissedNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissedNotice(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--sh-badge-warning-text)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Payment Success Confirmation Modal */}
      {successReceipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: 'var(--sh-shadow-lg)', border: '1px solid var(--sh-slate-200)', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--sh-badge-success-bg)', color: 'var(--sh-badge-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={32} />
            </div>
            
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '800', textAlign: 'center', color: 'var(--sh-slate-900)' }}>
              Payment Verified Successfully!
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: 'var(--sh-slate-500)', textAlign: 'center' }}>
              Your maintenance fee has been settled and recorded in the society ledger.
            </p>

            <div style={{ backgroundColor: 'var(--sh-slate-100)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: 'var(--sh-slate-500)' }}>
                <span>Receipt Number:</span>
                <span style={{ fontWeight: '700', color: 'var(--sh-slate-900)', fontFamily: 'monospace' }}>{successReceipt.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: 'var(--sh-slate-500)' }}>
                <span>Billing Period:</span>
                <span style={{ fontWeight: '600', color: 'var(--sh-slate-900)' }}>{successReceipt.month}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: 'var(--sh-slate-500)' }}>
                <span>Confirmed Amount:</span>
                <span style={{ fontWeight: '800', color: 'var(--sh-badge-success-text)', fontSize: '1rem' }}>₹{successReceipt.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: 'var(--sh-slate-500)' }}>
                <span>Payment Reference:</span>
                <span style={{ fontWeight: '600', color: 'var(--sh-slate-900)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{successReceipt.paymentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: 'var(--sh-slate-500)' }}>
                <span>Settlement Date:</span>
                <span style={{ color: 'var(--sh-slate-900)' }}>{successReceipt.paidAt}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="outline"
                onClick={() => setSuccessReceipt(null)}
                style={{ flex: 1, padding: '10px 16px', fontSize: '0.875rem' }}
              >
                Close
              </Button>
              <Button
                as={Link}
                to="/resident/payments"
                variant="blue"
                icon={ArrowRight}
                iconPosition="right"
                style={{ flex: 1, padding: '10px 16px', fontSize: '0.875rem', textDecoration: 'none' }}
              >
                View History
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Period Filter Bar */}
      <PeriodFilterBar
        initialPeriod={periodFilter.period}
        initialMonth={periodFilter.month}
        initialYear={periodFilter.year}
        initialStartDate={periodFilter.startDate}
        initialEndDate={periodFilter.endDate}
        onApply={handlePeriodApply}
        onRefresh={handleRefresh}
        loading={loading}
        refreshing={refreshing}
      />

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sh-slate-200)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Bills (${bills.length})` },
            { id: 'unpaid', label: `Unpaid (${unpaidCount})` },
            { id: 'paid', label: `Paid (${bills.length - unpaidCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                backgroundColor: filter === tab.id ? 'var(--sh-primary-500)' : 'var(--sh-slate-100)',
                color: filter === tab.id ? '#ffffff' : 'var(--sh-slate-600)',
                border: filter === tab.id ? '1px solid var(--sh-primary-500)' : '1px solid var(--sh-slate-200)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} color="var(--sh-slate-400)" style={{ position: 'absolute', top: '9px', left: '10px' }} />
            <input
              type="text"
              placeholder="Search bill or month..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                  fetchBills(null, false, '');
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

          <RefreshButton
            onClick={handleRefresh}
            refreshing={refreshing}
            loading={loading}
            size="sm"
            title="Refresh bills"
          />
        </div>
      </div>

      {/* Bills Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', border: '1px solid var(--sh-slate-200)', padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} style={{ color: '#0284c7', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: 'var(--sh-slate-500)', fontSize: '0.9rem' }}>Loading maintenance bills from backend...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', border: '1px solid var(--sh-slate-200)', padding: '60px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--sh-slate-100)', color: 'var(--sh-slate-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
              {searchTerm ? 'No matching bills found' : 'No bills found'}
            </h3>
            <p style={{ margin: searchTerm ? '0 0 16px 0' : 0, fontSize: '0.875rem', color: 'var(--sh-slate-500)' }}>
              {searchTerm 
                ? `No bills match your query "${searchTerm}". Try checking another keyword or month.`
                : (filter === 'unpaid' ? 'You have no outstanding dues. Great job!' : filter === 'paid' ? 'No paid bills found.' : 'No maintenance bills have been generated for your flat.')}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setDebouncedSearch('');
                  fetchBills(null, false, '');
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
                Clear Search
              </button>
            )}
          </div>
        ) : (
          filteredBills.map((bill) => {
            const badge = getStatusBadge(bill.status);
            const StatusIcon = badge.icon;
            const isProcessingThisBill = processingBillId === bill._id;
            const canPay = isEligibleForPayment(bill.status);
            const isOverdue = new Date(bill.dueDate) < new Date() && bill.status !== 'Paid';

            return (
              <div
                key={bill._id}
                style={{
                  backgroundColor: 'var(--sh-white)',
                  borderRadius: '12px',
                  border: isProcessingThisBill ? '2px solid #0284c7' : '1px solid var(--sh-slate-200)',
                  padding: '24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--sh-shadow-xs)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Left: Bill Details */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: '260px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--sh-slate-100)', border: '1px solid var(--sh-slate-200)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                        {bill.type || 'Maintenance Bill'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)', backgroundColor: 'var(--sh-slate-100)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        REF: {bill._id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--sh-slate-600)', fontWeight: '500' }}>
                      Billing Period: <strong>{bill.month}</strong> (Flat {bill.flatNumber || user?.flatNumber})
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isOverdue ? 'var(--sh-badge-danger-text)' : 'var(--sh-slate-500)' }}>
                      <Clock size={13} />
                      <span>Due: <strong>{new Date(bill.dueDate).toLocaleDateString()}</strong></span>
                      {isOverdue && <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem' }}>[Overdue]</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)', fontWeight: '600', textTransform: 'uppercase' }}>Amount Due</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--sh-slate-900)' }}>
                      ₹{Number(bill.amount).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div
                      style={{
                        backgroundColor: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.text,
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <StatusIcon size={14} />
                      {badge.label}
                    </div>

                    {canPay ? (
                      <button
                        onClick={() => handlePayNow(bill)}
                        disabled={isProcessingThisBill || isVerifying || (processingBillId && processingBillId !== bill._id)}
                        style={{
                          backgroundColor: isProcessingThisBill ? '#0284c7' : '#059669',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 22px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: (isProcessingThisBill || isVerifying) ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                          opacity: (processingBillId && processingBillId !== bill._id) ? 0.6 : 1,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (!isProcessingThisBill && !isVerifying) {
                            e.currentTarget.style.backgroundColor = '#047857';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isProcessingThisBill && !isVerifying) {
                            e.currentTarget.style.backgroundColor = '#059669';
                          }
                        }}
                      >
                        {isProcessingThisBill ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Opening Checkout...</span>
                          </>
                        ) : (
                          <>
                            <IndianRupee size={16} />
                            <span>Pay Now</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Dues Settled
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default MaintenanceBills;
