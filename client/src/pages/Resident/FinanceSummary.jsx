import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  WalletCards, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  FileText, 
  ExternalLink, 
  Clock, 
  CheckCircle,
  X,
  Info
} from 'lucide-react';

const FinanceSummary = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransparency = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params = {};
      if (isCustomRange && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (selectedMonth) {
        params.month = selectedMonth;
      }

      if (selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (selectedStatus !== 'All') {
        params.paymentStatus = selectedStatus;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await api.get('/finance/transparency', { params });
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
        // Default to current month key on initial load if not selected
        if (!selectedMonth && res.data.data.summary?.selectedMonth) {
          setSelectedMonth(res.data.data.summary.selectedMonth);
        }
      } else {
        throw new Error('Invalid response structure received');
      }
    } catch (err) {
      console.error('Failed to load society accounts transparency data', err);
      const msg = err.response?.data?.message || err.message || 'Unable to retrieve society transparency records';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCustomRange, startDate, endDate, selectedMonth, selectedCategory, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchTransparency();
  }, [fetchTransparency]);

  const handleMonthChange = (e) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setSelectedMonth(val);
    }
  };

  const formatMonthLabel = (mKey) => {
    if (!mKey || mKey === 'ALL' || mKey === 'CUSTOM') return mKey;
    const [year, month] = mKey.split('-').map(Number);
    if (!year || !month) return mKey;
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return (
        <span style={{ 
          backgroundColor: '#dcfce7', 
          color: '#166534', 
          padding: '4px 10px', 
          borderRadius: '9999px', 
          fontSize: '0.75rem', 
          fontWeight: '600', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px' 
        }}>
          <CheckCircle size={12} /> Paid
        </span>
      );
    }
    return (
      <span style={{ 
        backgroundColor: '#fef3c7', 
        color: '#92400e', 
        padding: '4px 10px', 
        borderRadius: '9999px', 
        fontSize: '0.75rem', 
        fontWeight: '600', 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px' 
      }}>
        <Clock size={12} /> Pending Approval
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '440px', margin: '0 auto' }}>
          <RefreshCw size={36} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#0f172a' }}>Loading Society Accounts</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Fetching verified expenses and income transparency...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCollectedIncome: 0,
    totalRecordedExpenses: 0,
    totalPaidExpenses: 0,
    totalPendingExpenses: 0,
    netOperationalBalance: 0,
    selectedMonth: 'Current'
  };

  const expenses = data?.expenses || [];
  const availableMonths = data?.availableMonths || [];
  const availableCategories = data?.availableCategories || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            Society Accounts & Expense Transparency
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Verified Society Fund Utilization</span>
            <span>•</span>
            <span style={{ color: '#10b981', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={16} /> Member Access Only
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => fetchTransparency(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#334155',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: '#991b1b', fontSize: '0.925rem' }}>Failed to Load Accounts</p>
              <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchTransparency(true)}
            style={{
              padding: '6px 14px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '16px 20px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#64748b" />
          <select
            value={isCustomRange ? 'CUSTOM' : selectedMonth}
            onChange={handleMonthChange}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              fontWeight: '500',
              color: '#1e293b'
            }}
          >
            <option value="ALL">All Recorded Months</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
            <option value="CUSTOM">Custom Date Range...</option>
          </select>
        </div>

        {/* Custom Date Range Inputs */}
        {isCustomRange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <span style={{ color: '#94a3b8' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <button
              onClick={() => fetchTransparency(true)}
              style={{ padding: '7px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748b" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              color: '#334155'
            }}
          >
            <option value="All">All Categories</option>
            {availableCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              color: '#334155'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid Only</option>
            <option value="Pending">Pending Approvals</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input
            type="text"
            placeholder="Search by title, vendor, or invoice #..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 3 SUMMARY KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Total Collected Income */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #bbf7d0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Collected Maintenance Income
            </span>
            <div style={{ padding: '8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IndianRupee size={24} color="#166534" strokeWidth={2.5} />
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#14532d', lineHeight: 1 }}>
              {summary.totalCollectedIncome.toLocaleString('en-IN')}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '500' }}>
            {summary.incomeTransactionsCount || 0} confirmed member payment(s) in this period
          </span>
        </div>

        {/* Total Actual Expenses */}
        <div style={{
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #fecaca',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Actual Paid Expenses
            </span>
            <div style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IndianRupee size={24} color="#991b1b" strokeWidth={2.5} />
            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#7f1d1d', lineHeight: 1 }}>
              {summary.totalPaidExpenses.toLocaleString('en-IN')}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '500' }}>
            {summary.totalPendingExpenses > 0 
              ? `+ ₹${summary.totalPendingExpenses.toLocaleString('en-IN')} pending approvals` 
              : 'All recorded expenditures finalized'}
          </span>
        </div>

        {/* Net Operational Balance */}
        <div style={{
          backgroundColor: summary.netOperationalBalance >= 0 ? '#eff6ff' : '#fff1f2',
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${summary.netOperationalBalance >= 0 ? '#bfdbfe' : '#fecdd3'}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ 
              fontSize: '0.8125rem', 
              fontWeight: '700', 
              color: summary.netOperationalBalance >= 0 ? '#1e40af' : '#9f1239', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Net Operational Balance
            </span>
            <div style={{ 
              padding: '8px', 
              backgroundColor: summary.netOperationalBalance >= 0 ? '#dbeafe' : '#ffe4e6', 
              color: summary.netOperationalBalance >= 0 ? '#2563eb' : '#e11d48', 
              borderRadius: '8px' 
            }}>
              <WalletCards size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <IndianRupee size={24} color={summary.netOperationalBalance >= 0 ? '#1e40af' : '#9f1239'} strokeWidth={2.5} />
            <span style={{ 
              fontSize: '2rem', 
              fontWeight: '800', 
              color: summary.netOperationalBalance >= 0 ? '#172554' : '#881337', 
              lineHeight: 1 
            }}>
              {summary.netOperationalBalance.toLocaleString('en-IN')}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: summary.netOperationalBalance >= 0 ? '#1d4ed8' : '#be123c', fontWeight: '500' }}>
            Formula: Collected Income - Paid Expenses
          </span>
        </div>
      </div>

      {/* DISCLOSURE & ACCOUNTING RULES BANNER */}
      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        padding: '14px 18px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        <Info size={18} color="#3b82f6" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5 }}>
          <strong>Transparency Accounting Disclosure:</strong> Collected maintenance income counts only verified member payment receipts. 
          The net operational balance is calculated as <em>Collected Income minus Paid Expenses</em> for the selected period. 
          Pending expense entries represent planned commitments awaiting administrator sign-off and are not deducted until payment is confirmed.
          All records belong exclusively to your authenticated society.
        </div>
      </div>

      {/* EXPENSE LEDGER TABLE */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
        overflow: 'hidden' 
      }}>
        <div style={{ 
          padding: '18px 24px', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: '#fafafa'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
              Society Expense Entries ({expenses.length})
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Period: {isCustomRange ? `${startDate} to ${endDate}` : formatMonthLabel(selectedMonth)}
            </span>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#334155' }}>No Expense Records Found</h4>
            <p style={{ margin: '0 auto', fontSize: '0.875rem', color: '#94a3b8', maxWidth: '420px' }}>
              No expenses were recorded for the selected month or filter criteria. Check another month or reset your search filters.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '600' }}>
                <tr>
                  <th style={{ padding: '14px 20px' }}>Date</th>
                  <th style={{ padding: '14px 20px' }}>Expense Title & Details</th>
                  <th style={{ padding: '14px 20px' }}>Category</th>
                  <th style={{ padding: '14px 20px' }}>Vendor / Provider</th>
                  <th style={{ padding: '14px 20px' }}>Reference #</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Supporting Invoice</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(item => (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Date */}
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {item.date ? new Date(item.date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Title & Description */}
                    <td style={{ padding: '16px 20px', maxWidth: '280px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '2px' }}>
                        {item.title || item.category}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                        {item.description}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        backgroundColor: '#f1f5f9', 
                        color: '#334155', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '0.75rem', 
                        fontWeight: '500' 
                      }}>
                        {item.category}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td style={{ padding: '16px 20px', color: '#334155', fontSize: '0.8125rem', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      {item.vendor || '—'}
                    </td>

                    {/* Reference # */}
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.78rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {item.referenceNumber || '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(item.paymentStatus)}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                      ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Supporting Invoice / Receipt */}
                    <td style={{ padding: '16px 20px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#dbeafe'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                        >
                          <FileText size={13} />
                          <span>View Receipt</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No invoice</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FinanceSummary;
