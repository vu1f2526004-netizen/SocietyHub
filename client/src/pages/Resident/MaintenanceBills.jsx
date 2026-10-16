import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { loadRazorpayScript, openRazorpayCheckout } from '../../utils/razorpay';
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
  RotateCcw
} from 'lucide-react';

const MaintenanceBills = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unpaid', 'paid'
  
  // Transaction In-Flight States
  const [processingBillId, setProcessingBillId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [dismissedNotice, setDismissedNotice] = useState(null);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bills/my');
      setBills(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Failed to load maintenance bills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

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
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: '#065f46',
          label: 'Paid',
          icon: CheckCircle2
        };
      case 'Pending':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          text: '#92400e',
          label: 'Pending',
          icon: Clock
        };
      case 'PaymentInitiated':
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af',
          label: 'Payment Initiated',
          icon: Clock
        };
      case 'Overdue':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#991b1b',
          label: 'Overdue',
          icon: AlertCircle
        };
      case 'Failed':
        return {
          bg: '#fef2f2',
          border: '#fecaca',
          text: '#b91c1c',
          label: 'Failed',
          icon: AlertTriangle
        };
      default:
        return {
          bg: '#f8fafc',
          border: '#e2e8f0',
          text: '#475569',
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Maintenance & Society Fees
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            Review your flat maintenance dues and complete secure payments via Razorpay Gateway.
          </p>
        </div>

        <Link
          to="/resident/payments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '10px 18px',
            color: '#1e293b',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: '600',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.color = '#0284c7'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#1e293b'; }}
        >
          <Receipt size={18} />
          View Payment History
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Outstanding Dues</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: totalDue > 0 ? '#fef2f2' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalDue > 0 ? '#dc2626' : '#16a34a' }}>
              <IndianRupee size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: totalDue > 0 ? '#dc2626' : '#0f172a' }}>
            ₹{totalDue.toLocaleString()}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {unpaidCount} unpaid {unpaidCount === 1 ? 'bill' : 'bills'} pending settlement
          </p>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Total Paid To Date</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#059669' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Verified on society ledger
          </p>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Assigned Flat</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>
            Flat {user?.flatNumber || 'N/A'}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Tenant-isolated billing
          </p>
        </div>
      </div>

      {/* Verification In-Flight Overlay / Banner */}
      {isVerifying && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Loader2 size={24} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: '#1e40af' }}>
              Verifying Payment with Society Ledger...
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6' }}>
              Please do not refresh the page. We are securely validating your transaction signature and generating your receipt.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#991b1b' }}>Payment Error</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Dismissed / Cancelled Notice Banner */}
      {dismissedNotice && (
        <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#92400e' }}>Payment Cancelled</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>{dismissedNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setDismissedNotice(null)}
            style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Payment Success Confirmation Modal */}
      {successReceipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', border: '1px solid #e2e8f0', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={32} />
            </div>
            
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '800', textAlign: 'center', color: '#0f172a' }}>
              Payment Verified Successfully!
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b', textAlign: 'center' }}>
              Your maintenance fee has been settled and recorded in the society ledger.
            </p>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Receipt Number:</span>
                <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{successReceipt.receiptNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Billing Period:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{successReceipt.month}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Confirmed Amount:</span>
                <span style={{ fontWeight: '800', color: '#059669', fontSize: '1rem' }}>₹{successReceipt.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Payment Reference:</span>
                <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.8rem', fontFamily: 'monospace' }}>{successReceipt.paymentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Settlement Date:</span>
                <span style={{ color: '#0f172a' }}>{successReceipt.paidAt}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSuccessReceipt(null)}
                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontWeight: '600', cursor: 'pointer' }}
              >
                Close
              </button>
              <Link
                to="/resident/payments"
                style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '600', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                View History <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: `All Bills (${bills.length})` },
            { id: 'unpaid', label: `Unpaid (${unpaidCount})` },
            { id: 'paid', label: `Paid (${bills.length - unpaidCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                backgroundColor: filter === tab.id ? '#0f172a' : '#f1f5f9',
                color: filter === tab.id ? '#ffffff' : '#475569',
                border: 'none',
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

        <button
          onClick={fetchBills}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px' }}
          title="Refresh bills"
        >
          <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Bills Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} style={{ color: '#0284c7', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Loading maintenance bills from backend...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '60px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
              No bills found
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
              {filter === 'unpaid' ? 'You have no outstanding dues. Great job!' : filter === 'paid' ? 'No paid bills found.' : 'No maintenance bills have been generated for your flat.'}
            </p>
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
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: isProcessingThisBill ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  padding: '24px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s'
                }}
              >
                {/* Left: Bill Details */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: '260px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                        {bill.type || 'Maintenance Bill'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        REF: {bill._id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>
                      Billing Period: <strong>{bill.month}</strong> (Flat {bill.flatNumber || user?.flatNumber})
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isOverdue ? '#dc2626' : '#64748b' }}>
                      <Clock size={13} />
                      <span>Due: <strong>{new Date(bill.dueDate).toLocaleDateString()}</strong></span>
                      {isOverdue && <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem' }}>[Overdue]</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right', minWidth: '110px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Amount Due</span>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>
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
