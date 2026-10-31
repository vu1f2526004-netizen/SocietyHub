import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  Receipt,
  IndianRupee,
  Calendar,
  User,
  Home,
  CheckCircle2,
  FileText,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';

const ReceiptModal = ({ payment, paymentId, isOpen, onClose }) => {
  const { isDark } = useTheme();
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derive resolved payment identifier from either payment object or paymentId prop
  const activePaymentId = payment?._id || payment?.id || paymentId;
  const activePayment = payment || (activePaymentId ? { _id: activePaymentId, id: activePaymentId } : null);

  useEffect(() => {
    let isMounted = true;
    const fetchAuthoritativeReceipt = async () => {
      if (!activePaymentId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/payments/${activePaymentId}/receipt`);
        if (isMounted && res.data?.success && res.data.data) {
          setReceiptData(res.data.data);
        }
      } catch (err) {
        console.warn('Could not fetch authoritative receipt endpoint:', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Could not load official receipt details from server.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (isOpen !== false && activePaymentId) {
      fetchAuthoritativeReceipt();
    }
    return () => {
      isMounted = false;
    };
  }, [activePaymentId, isOpen]);

  // If explicitly closed or neither payment nor paymentId provided, do not render
  if (isOpen !== undefined && !isOpen) return null;
  if (!activePayment && !activePaymentId) return null;

  // Derive display values from authoritative endpoint response or fallback to passed payment
  const data = receiptData || {};
  const isFallback = !receiptData && !!activePayment;

  // If the backend threw an error and there is no usable fallback data, show an informative error state
  const hasNoData = !data.receiptNumber && !activePayment?.amount && !activePayment?.status;
  if (error && hasNoData) {
    return (
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(5, 11, 27, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div style={{
          backgroundColor: isDark ? '#0D1629' : '#ffffff',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          padding: '24px',
          textAlign: 'center',
          color: isDark ? '#F8FAFC' : '#0f172a'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <AlertCircle size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '800' }}>
            Receipt Unavailable
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: isDark ? '#94A3B8' : '#64748b', lineHeight: 1.5 }}>
            {error || 'This transaction does not have an authoritative verified receipt record available.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const receiptNumber = data.receiptNumber || activePayment.receiptNumber || `REC-${activePayment._id?.slice(-8) || 'N/A'}`;
  const societyName = data.society?.name || activePayment.societyId?.name || 'SocietyHub Residential Community';
  const societyAddress = data.society?.address 
    ? `${data.society.address}${data.society.city ? ', ' + data.society.city : ''}${data.society.state ? ', ' + data.society.state : ''} ${data.society.postalCode || ''}` 
    : '';

  const paymentDate = data.paymentDate || activePayment.paidAt || activePayment.createdAt;
  const paymentDateStr = paymentDate ? new Date(paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const paymentTimeStr = paymentDate ? new Date(paymentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const receiptDate = data.receiptDate ? new Date(data.receiptDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : paymentDateStr;

  const amount = Number(data.amount !== undefined ? data.amount : (activePayment.amount || 0));
  const currency = data.currency || activePayment.currency || 'INR';

  // Payer (Paid By)
  const payerName = data.payer?.name || activePayment.payerName || activePayment.payerId?.name || (activePayment.payerId ? 'Authorized Member' : 'Payer information unavailable');
  const payerEmail = data.payer?.email || activePayment.payerEmail || activePayment.payerId?.email || null;
  const isPayerAvailable = data.payer?.isAvailable !== undefined 
    ? data.payer.isAvailable 
    : !!(activePayment.payerName || activePayment.payerId?.name);

  // Beneficiary (Payment For)
  const beneficiaryName = data.beneficiary?.name || activePayment.residentId?.name || 'Resident';
  const beneficiaryEmail = data.beneficiary?.email || activePayment.residentId?.email || null;
  const flatNumber = data.beneficiary?.flatNumber || activePayment.flatNumber || activePayment.billId?.flatNumber || activePayment.residentId?.flatNumber || 'N/A';
  const billingMonth = data.bill?.month || activePayment.billingMonth || activePayment.billId?.month || activePayment.month || 'Maintenance Period';
  const billRef = data.bill?.billId || activePayment.billId?._id || activePayment.billId || 'N/A';

  // Breakdown
  const maintenanceAmount = data.breakdown?.maintenanceAmount !== undefined ? data.breakdown.maintenanceAmount : amount;
  const additionalCharges = data.breakdown?.additionalCharges || 0;
  const remainingOutstanding = data.breakdown?.remainingOutstanding || 0;

  // References
  const razorpayPaymentId = data.razorpayPaymentId || activePayment.razorpayPaymentId || 'N/A';
  const razorpayOrderId = data.razorpayOrderId || activePayment.razorpayOrderId || 'N/A';
  const paymentMethod = data.paymentMethod || activePayment.paymentMethod || 'Razorpay Online';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
================================================================================
                    OFFICIAL SOCIETY MAINTENANCE RECEIPT
================================================================================
Society:        ${societyName}
${societyAddress ? 'Address:        ' + societyAddress + '\n' : ''}Receipt Number: ${receiptNumber}
Receipt Date:   ${receiptDate}
Payment Date:   ${paymentDateStr} ${paymentTimeStr}
Status:         VERIFIED PAID

--------------------------------------------------------------------------------
PAYER INFORMATION (PAID BY)
--------------------------------------------------------------------------------
Name:           ${isPayerAvailable ? payerName : 'Payer information unavailable'}
${payerEmail ? 'Email:          ' + payerEmail + '\n' : ''}Status:         Authenticated Payment

--------------------------------------------------------------------------------
BENEFICIARY INFORMATION (PAYMENT FOR)
--------------------------------------------------------------------------------
Resident:       ${beneficiaryName}
Flat Number:    Flat ${flatNumber}
${beneficiaryEmail ? 'Email:          ' + beneficiaryEmail + '\n' : ''}Billing Month:  ${billingMonth}
Bill Reference: #${String(billRef).slice(-8)}

--------------------------------------------------------------------------------
FINANCIAL BREAKDOWN
--------------------------------------------------------------------------------
Maintenance Amount:           INR ${maintenanceAmount.toLocaleString('en-IN')}
Additional Charges / Fees:    INR ${additionalCharges.toLocaleString('en-IN')}
Total Billed Amount:          INR ${(maintenanceAmount + additionalCharges).toLocaleString('en-IN')}
Amount Received & Verified:   INR ${amount.toLocaleString('en-IN')}
Remaining Outstanding:        INR ${remainingOutstanding.toLocaleString('en-IN')}

--------------------------------------------------------------------------------
PAYMENT TRANSACTION DETAILS
--------------------------------------------------------------------------------
Payment Method:               ${paymentMethod}
Razorpay Payment ID:          ${razorpayPaymentId}
Razorpay Order ID:            ${razorpayOrderId}

================================================================================
This is a computer-generated official receipt issued by SocietyHub.
Verified through server-side payment confirmation.
================================================================================
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${receiptNumber}_Flat_${String(flatNumber).replace(/[^a-zA-Z0-9_-]/g, '')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 11, 27, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: isDark ? '#0D1629' : '#ffffff',
          borderRadius: '16px',
          maxWidth: '580px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
          color: isDark ? '#F8FAFC' : '#0f172a'
        }}
        id="printable-official-receipt"
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isDark ? '#131F38' : '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
              color: isDark ? '#38bdf8' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Receipt size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isDark ? '#38bdf8' : '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Maintenance Receipt
              </span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: isDark ? '#F8FAFC' : '#0f172a', lineHeight: 1.2 }}>
                {receiptNumber}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="no-print"
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94A3B8' : '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close Receipt"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={28} color="#0284c7" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ color: isDark ? '#94A3B8' : '#64748b', fontSize: '0.85rem' }}>Loading verified receipt records...</span>
            </div>
          ) : (
            <>
              {/* Society & Status Banner */}
              <div style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#F8FAFC' : '#0f172a', fontWeight: '700', fontSize: '0.95rem' }}>
                    <Building2 size={16} color="#0284c7" />
                    <span>{societyName}</span>
                  </div>
                  {societyAddress && (
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748b', marginTop: '2px', paddingLeft: '22px' }}>
                      {societyAddress}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748b', marginTop: '4px', paddingLeft: '22px' }}>
                    Receipt Date: <strong>{receiptDate}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7',
                    border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #bbf7d0',
                    color: isDark ? '#34d399' : '#166534',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShieldCheck size={14} /> Verified Paid
                  </span>
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748b', marginTop: '4px' }}>
                    Paid on {paymentDateStr}
                  </div>
                </div>
              </div>

              {/* Amount Highlight Box */}
              <div style={{
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: isDark ? '#34d399' : '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Verified Amount Received
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#34d399' : '#166534', lineHeight: 1.1 }}>
                    <IndianRupee size={22} strokeWidth={2.5} />
                    <span>{amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: isDark ? '#34d399' : '#166534', fontWeight: '600' }}>
                  {paymentMethod}
                </div>
              </div>

              {/* 2-Column: Paid By vs Payment For */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                {/* Column 1: Paid By */}
                <div style={{
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: isDark ? '#94A3B8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} color="#2563eb" />
                    <span>Paid By (Actual Payer)</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isPayerAvailable ? (isDark ? '#F8FAFC' : '#0f172a') : (isDark ? '#94A3B8' : '#64748b') }}>
                    {payerName}
                  </div>
                  {payerEmail && (
                    <div style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748b', marginTop: '2px' }}>
                      {payerEmail}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: '500', marginTop: '6px' }}>
                    {isPayerAvailable ? 'Authenticated Payer Record' : 'Legacy record: Payer detail unavailable'}
                  </div>
                </div>

                {/* Column 2: Payment For */}
                <div style={{
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '800', color: isDark ? '#94A3B8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Home size={13} color="#059669" />
                    <span>Payment For (Beneficiary)</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isDark ? '#F8FAFC' : '#0f172a' }}>
                    {beneficiaryName}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7', marginTop: '2px' }}>
                    Flat {flatNumber}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748b', marginTop: '6px' }}>
                    Billing Cycle: <strong>{billingMonth}</strong>
                  </div>
                </div>
              </div>

              {/* Billing Breakdown Table */}
              <div style={{ border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: isDark ? '#131F38' : '#f8fafc', padding: '10px 14px', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: '700', color: isDark ? '#CBD5E1' : '#475569', textTransform: 'uppercase' }}>
                  Billing Breakdown
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: isDark ? '#CBD5E1' : '#475569' }}>
                    <span>Maintenance Assessment ({billingMonth})</span>
                    <span style={{ fontWeight: '600', color: isDark ? '#F8FAFC' : '#0f172a' }}>₹{maintenanceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {additionalCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: isDark ? '#CBD5E1' : '#475569' }}>
                      <span>Additional Charges / Late Fees</span>
                      <span style={{ fontWeight: '600', color: '#ef4444' }}>+₹{additionalCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: isDark ? '#CBD5E1' : '#475569', borderTop: isDark ? '1px dashed rgba(255, 255, 255, 0.12)' : '1px dashed #e2e8f0', paddingTop: '6px' }}>
                    <span style={{ fontWeight: '600' }}>Total Amount Due</span>
                    <span style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#0f172a' }}>₹{(maintenanceAmount + additionalCharges).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: isDark ? '#34d399' : '#166534', fontWeight: '700' }}>
                    <span>Total Amount Paid</span>
                    <span>-₹{amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0', paddingTop: '6px', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: '700', color: isDark ? '#F8FAFC' : '#0f172a' }}>Remaining Outstanding</span>
                    <span style={{ fontWeight: '800', color: remainingOutstanding > 0 ? '#ef4444' : (isDark ? '#34d399' : '#166534') }}>
                      ₹{remainingOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction & Audit References */}
              <div style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '0.75rem',
                color: isDark ? '#94A3B8' : '#64748b',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Razorpay Payment ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '600', color: isDark ? '#F8FAFC' : '#0f172a' }}>{razorpayPaymentId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Razorpay Order ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '600', color: isDark ? '#F8FAFC' : '#0f172a' }}>{razorpayOrderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Bill Reference ID:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: '600', color: isDark ? '#F8FAFC' : '#0f172a' }}>{billRef}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions */}
        <div 
          className="no-print"
          style={{
            padding: '14px 24px',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            backgroundColor: isDark ? '#131F38' : '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#0D1629' : '#ffffff',
                color: isDark ? '#CBD5E1' : '#334155',
                fontSize: '0.825rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Download text receipt"
            >
              <Download size={14} /> Download Receipt
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid #cbd5e1',
                backgroundColor: isDark ? '#0D1629' : '#ffffff',
                color: isDark ? '#CBD5E1' : '#334155',
                fontSize: '0.825rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
              title="Print receipt or save as PDF"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-official-receipt, #printable-official-receipt * {
            visibility: visible !important;
          }
          #printable-official-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
