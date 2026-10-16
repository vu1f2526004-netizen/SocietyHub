import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
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
  Loader2
} from 'lucide-react';

const PaymentHistory = () => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.get('/payments/my');
      setPayments(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Success':
        return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', icon: CheckCircle2, label: 'Confirmed' };
      case 'Failed':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', icon: AlertCircle, label: 'Failed' };
      case 'Pending':
        return { bg: '#fffbeb', text: '#92400e', border: '#fde68a', icon: Clock, label: 'Pending' };
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', icon: FileText, label: status || 'Unknown' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Payment History & Receipts
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            View all confirmed maintenance payments, transaction references, and official payment receipts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={fetchPayments}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '9px 14px',
              fontSize: '0.85rem',
              fontWeight: '600',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            to="/resident/bills"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              borderRadius: '8px',
              padding: '10px 18px',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
          >
            <IndianRupee size={16} />
            Maintenance Bills
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <AlertCircle size={20} style={{ color: '#dc2626' }} />
            <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table Container */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
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
              No payments recorded
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#64748b' }}>
              You haven't completed any maintenance fee payments yet.
            </p>
            <Link
              to="/resident/bills"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#0284c7', textDecoration: 'none' }}
            >
              Pay pending maintenance bill →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Receipt Number</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Billing Period</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Amount</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Payment Reference</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badge = getStatusDisplay(p.status);
                  const StatusIcon = badge.icon;
                  const billMonth = p.billId?.month || 'Maintenance';
                  const dateStr = p.paidAt
                    ? new Date(p.paidAt).toLocaleDateString()
                    : new Date(p.createdAt).toLocaleDateString();

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>
                        {p.receiptNumber || '—'}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        {billMonth}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a' }}>
                        ₹{Number(p.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {p.razorpayPaymentId || p.razorpayOrderId || '—'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
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
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {p.status === 'Success' ? (
                          <button
                            onClick={() => setSelectedReceipt({
                              ...p,
                              month: billMonth,
                              date: dateStr
                            })}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#0284c7',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.backgroundColor = '#f0f9ff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
                          >
                            <Receipt size={14} /> Receipt
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #e2e8f0' }} id="printable-receipt">
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SocietyHub Payment Receipt</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedReceipt.month} Maintenance
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Receipt Summary Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Receipt Number:</span>
                <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{selectedReceipt.receiptNumber || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Resident Name:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{user?.name || 'Resident'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Flat Number:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>Flat {user?.flatNumber || selectedReceipt.billId?.flatNumber || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Payment Reference:</span>
                <span style={{ fontWeight: '600', color: '#0f172a', fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedReceipt.razorpayPaymentId || selectedReceipt.razorpayOrderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#64748b' }}>Date of Payment:</span>
                <span style={{ color: '#0f172a' }}>{selectedReceipt.date}</span>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Amount Confirmed</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>
                    ₹{Number(selectedReceipt.amount).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '700', fontSize: '0.85rem' }}>
                  <ShieldCheck size={18} /> Verified
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: '#ffffff',
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

export default PaymentHistory;
