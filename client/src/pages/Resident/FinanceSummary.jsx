import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PeriodFilterBar from '../../components/Finance/PeriodFilterBar';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';
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
  Info,
  User,
  Home,
  Receipt,
  Layers,
  History,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

const FinanceSummary = () => {
  const { user } = useContext(AuthContext);
  const { isDark } = useTheme();

  // Top-Level Tab State: 'personal' (My Bills & Personal Dues) | 'overview' (Society Financial Overview) | 'historical' (Historical Society Records)
  const [activeTab, setActiveTab] = useState('personal');

  // Society Transparency Data State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Resident Personal Finance Summary State
  const [personalSummary, setPersonalSummary] = useState(null);
  const [personalBills, setPersonalBills] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(true);

  // Persistent Period Filter State (URL + user-scoped localStorage)
  const { filterState, applyFilter } = usePeriodFilter('resident_transparency', 'this-month');
  const prevFilterJsonRef = useRef(JSON.stringify(filterState));

  // Table Filters (for Society Expenses in Overview & History)
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async (isManual = false, overrides = {}) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setPersonalLoading(true);
      }
      setError(null);

      const activeFilter = {
        ...filterState,
        ...overrides
      };

      const params = {};
      if (activeFilter.period) params.period = activeFilter.period;
      if (activeFilter.month) params.month = activeFilter.month;
      if (activeFilter.year) params.year = activeFilter.year;
      if (activeFilter.startDate) params.startDate = activeFilter.startDate;
      if (activeFilter.endDate) params.endDate = activeFilter.endDate;

      const effectiveCategory = overrides.category !== undefined ? overrides.category : selectedCategory;
      const effectiveStatus = overrides.paymentStatus !== undefined ? overrides.paymentStatus : selectedStatus;
      const effectiveSearch = overrides.search !== undefined ? overrides.search : debouncedSearch;

      if (effectiveCategory && effectiveCategory !== 'All') {
        params.category = effectiveCategory;
      }
      if (effectiveStatus && effectiveStatus !== 'All') {
        params.paymentStatus = effectiveStatus;
      }
      if (effectiveSearch && effectiveSearch.trim()) {
        params.search = effectiveSearch.trim();
      }

      // Fetch Society Transparency, Resident Personal Summary, and Resident Personal Bills in parallel
      const [resTransparency, resPersonal, resBills] = await Promise.all([
        api.get('/finance/transparency', { params }),
        api.get('/finance/resident/summary', { params }),
        api.get('/bills/my', { params: { status: 'all' } })
      ]);

      if (resTransparency.data?.success && resTransparency.data.data) {
        setData(resTransparency.data.data);
      }
      if (resPersonal.data?.success && resPersonal.data.data) {
        setPersonalSummary(resPersonal.data.data);
      }
      if (resBills.data?.success && resBills.data.data) {
        setPersonalBills(resBills.data.data);
      }
    } catch (err) {
      console.error('Failed to load financial records:', err);
      const msg = err.response?.data?.message || err.message || 'Unable to retrieve financial records';
      setError(msg);
    } finally {
      setLoading(false);
      setPersonalLoading(false);
      setRefreshing(false);
    }
  }, [filterState, selectedCategory, selectedStatus, debouncedSearch]);

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

  // When debounced search, category, or status changes, fetch updated filtered data
  const isFilterMountRef = useRef(true);
  useEffect(() => {
    if (isFilterMountRef.current) {
      isFilterMountRef.current = false;
      return;
    }
    fetchData(true, {
      search: debouncedSearch,
      category: selectedCategory,
      paymentStatus: selectedStatus
    });
  }, [debouncedSearch, selectedCategory, selectedStatus]);

  const handlePeriodApply = (newFilter) => {
    const updated = applyFilter(newFilter);
    prevFilterJsonRef.current = JSON.stringify(updated);
    fetchData(true, updated);
  };

  const handleRefresh = () => {
    fetchData(true);
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

  if (loading && !data && !personalSummary) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '440px', margin: '0 auto' }}>
          <RefreshCw size={36} color="#0284c7" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#0f172a' }}>Loading Society Accounts</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Fetching personal dues and society transparency...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalCollectedIncome: 0,
    totalRecordedExpenses: 0,
    totalPaidExpenses: 0,
    totalPendingExpenses: 0,
    openingBalance: 0,
    closingBalance: 0,
    netOperationalBalance: 0,
    periodLabel: 'This Month'
  };

  const periodLabel = summary.periodLabel || 'This Month';
  const rawExpenses = data?.expenses || [];
  const filteredExpenses = rawExpenses.filter(item => {
    if (debouncedSearch && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchCategory = (item.category || '').toLowerCase().includes(q);
      const matchVendor = (item.vendor || '').toLowerCase().includes(q);
      const matchRef = (item.referenceNumber || '').toLowerCase().includes(q);
      const matchStatus = (item.paymentStatus || '').toLowerCase().includes(q);
      const matchAmount = String(item.amount || '').includes(q);
      if (!matchTitle && !matchDesc && !matchCategory && !matchVendor && !matchRef && !matchStatus && !matchAmount) {
        return false;
      }
    }
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'All' && item.paymentStatus !== selectedStatus) {
      return false;
    }
    return true;
  });

  const availableYears = data?.availableYears || [];
  const availableCategories = data?.availableCategories || [];

  // Resident personal account specifics
  const resAccount = personalSummary?.residentAccount || {};
  const effectiveDateStr = resAccount.financialEffectiveDate 
    ? new Date(resAccount.financialEffectiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : (user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Established upon onboarding');

  const legitimateDues = Number(resAccount.totalLegitimateOutstanding !== undefined ? resAccount.totalLegitimateOutstanding : (personalSummary?.periodSummary?.pendingDues || 0));
  const regularDues = Number(resAccount.regularMaintenanceDues !== undefined ? resAccount.regularMaintenanceDues : legitimateDues);
  const transferredDues = Number(resAccount.transferredArrearsDues || 0);
  const personalPaid = Number(personalSummary?.periodSummary?.totalPaid || 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
            Society Financial Accounts & Transparency
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Separation of Personal Payment Dues from Society-Wide Audited Accounts</span>
            <span>•</span>
            <span style={{ color: '#10b981', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={16} /> Verified Resident Portal
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            to="/resident/bills"
            style={{
              padding: '9px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <IndianRupee size={15} /> Pay My Bills
          </Link>
          <Link
            to="/resident/payments"
            style={{
              padding: '9px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Receipt size={15} /> My Payment History
          </Link>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px 20px',
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
            onClick={() => fetchData(true)}
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

      {/* 3 DISTINCT TOP-LEVEL TABS */}
      <div style={{ display: 'flex', borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #cbd5e1', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '0.95rem',
            border: 'none',
            borderBottom: activeTab === 'personal' ? '3px solid #0284c7' : '3px solid transparent',
            color: activeTab === 'personal' ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#94A3B8' : '#64748b'),
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <User size={18} />
          My Bills & Personal Dues
          {legitimateDues > 0 && (
            <span style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', color: isDark ? '#f87171' : '#dc2626', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', fontWeight: '800' }}>
              ₹{legitimateDues.toLocaleString('en-IN')} Due
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '0.95rem',
            border: 'none',
            borderBottom: activeTab === 'overview' ? (isDark ? '3px solid #10b981' : '3px solid #166534') : '3px solid transparent',
            color: activeTab === 'overview' ? (isDark ? '#34d399' : '#166534') : (isDark ? '#94A3B8' : '#64748b'),
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={18} />
          Society Financial Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historical')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '0.95rem',
            border: 'none',
            borderBottom: activeTab === 'historical' ? (isDark ? '3px solid #818cf8' : '3px solid #6366f1') : '3px solid transparent',
            color: activeTab === 'historical' ? (isDark ? '#a5b4fc' : '#6366f1') : (isDark ? '#94A3B8' : '#64748b'),
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <History size={18} />
          Historical Society Records
        </button>
      </div>

      {/* =========================================================================
          VIEW A: MY BILLS & PERSONAL DUES
          ========================================================================= */}
      {activeTab === 'personal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Personal Account Identity & Liability Start Date Banner */}
          <div style={{
            backgroundColor: 'var(--sh-white)',
            borderRadius: '14px',
            border: '1px solid var(--sh-slate-200)',
            padding: '20px 24px',
            boxShadow: 'var(--sh-shadow-xs)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isDark ? '#38bdf8' : '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Personal Resident Account
                </span>
                <span style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7', color: isDark ? '#34d399' : '#166534', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700' }}>
                  Legitimate Personal Dues Only
                </span>
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '800', color: 'var(--sh-slate-900)' }}>
                {user?.name || 'Resident Member'} — Flat {user?.flatNumber || resAccount.flatNumber || 'N/A'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sh-slate-500)' }}>
                Your financial responsibility began on <strong>{effectiveDateStr}</strong>.
              </p>
            </div>

            <div style={{
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
              border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '12px 16px',
              maxWidth: '460px',
              fontSize: '0.8rem',
              color: isDark ? '#93c5fd' : '#1e40af',
              lineHeight: 1.45
            }}>
              <strong style={{ color: isDark ? '#bfdbfe' : '#1e3a8a' }}>Accounting Protection Guarantee:</strong> As a resident of this society, your personal payable dues are strictly calculated from your authorized financial effective date. Historical society collections, past community expenditures, and previous occupants' arrears are excluded from your personal payable balance.
            </div>
          </div>

          {/* Personal Financial KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Outstanding Legitimate Dues */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: legitimateDues > 0 ? (isDark ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #fecaca') : '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Legitimate Outstanding Dues
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={legitimateDues > 0 ? '#ef4444' : (isDark ? '#34d399' : '#166534')} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: legitimateDues > 0 ? '#ef4444' : (isDark ? '#34d399' : '#166534'), lineHeight: 1 }}>
                  {legitimateDues.toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                {legitimateDues > 0 ? 'Payable maintenance dues for your flat' : 'All personal maintenance bills clear'}
              </span>
            </div>

            {/* Regular Maintenance Assessment */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Regular Maintenance Dues
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color="var(--sh-slate-900)" strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--sh-slate-900)', lineHeight: 1 }}>
                  {regularDues.toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                Monthly recurring dues from {effectiveDateStr}
              </span>
            </div>

            {/* Separately Recorded Transferred Arrears */}
            <div style={{
              backgroundColor: transferredDues > 0 ? (isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb') : 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: transferredDues > 0 ? (isDark ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #fde68a') : '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: transferredDues > 0 ? (isDark ? '#fbbf24' : '#92400e') : 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Transferred Arrears (Audit Tracked)
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={transferredDues > 0 ? (isDark ? '#fbbf24' : '#b45309') : 'var(--sh-slate-900)'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: transferredDues > 0 ? (isDark ? '#fbbf24' : '#b45309') : 'var(--sh-slate-900)', lineHeight: 1 }}>
                  {transferredDues.toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: transferredDues > 0 ? (isDark ? '#fbbf24' : '#92400e') : 'var(--sh-slate-500)' }}>
                {transferredDues > 0 
                  ? 'Explicitly confirmed & audited by Admin' 
                  : 'Zero transferred arrears on your flat'}
              </span>
            </div>

            {/* Amount Paid in Period */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                My Payments ({periodLabel})
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={isDark ? '#34d399' : '#166534'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#34d399' : '#166534', lineHeight: 1 }}>
                  {personalPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                {personalSummary?.periodSummary?.successfulPaymentsCount || 0} verified payment receipt(s)
              </span>
            </div>
          </div>

          {/* Personal Maintenance Bills Table */}
          <div style={{
            backgroundColor: 'var(--sh-white)',
            borderRadius: '14px',
            border: '1px solid var(--sh-slate-200)',
            overflow: 'hidden',
            boxShadow: 'var(--sh-shadow-xs)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sh-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--sh-slate-100)' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                  My Maintenance Bills Schedule
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--sh-slate-500)' }}>
                  Bills applicable from your financial onboarding date ({effectiveDateStr})
                </span>
              </div>
              <Link
                to="/resident/bills"
                style={{ fontSize: '0.825rem', fontWeight: '600', color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Open Full Bills Portal <ArrowRight size={14} />
              </Link>
            </div>

            {personalBills.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
                <FileText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No maintenance bills recorded for your account.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Billing Month</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Bill Type</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Amount</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Due Date</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Status</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personalBills.slice(0, 8).map(bill => (
                      <tr key={bill._id} style={{ borderBottom: '1px solid var(--sh-slate-200)' }}>
                        <td style={{ padding: '12px 18px', fontWeight: '600', color: 'var(--sh-slate-900)' }}>
                          {bill.month}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {bill.isTransferredArrear ? (
                            <span style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', color: isDark ? '#fbbf24' : '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700' }}>
                              Transferred Arrears
                            </span>
                          ) : (
                            <span style={{ backgroundColor: 'var(--sh-slate-100)', color: 'var(--sh-slate-600)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                              {bill.type || 'Maintenance'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                          ₹{Number(bill.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--sh-slate-600)' }}>
                          {new Date(bill.dueDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{
                            backgroundColor: bill.status === 'Paid' ? (isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7') : (bill.status === 'Overdue' ? (isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2') : (isDark ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7')),
                            color: bill.status === 'Paid' ? (isDark ? '#34d399' : '#166534') : (bill.status === 'Overdue' ? (isDark ? '#f87171' : '#dc2626') : (isDark ? '#fbbf24' : '#92400e')),
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: '700'
                          }}>
                            {bill.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          {bill.status !== 'Paid' ? (
                            <Link
                              to="/resident/bills"
                              style={{
                                padding: '4px 10px',
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Pay Now
                            </Link>
                          ) : (
                            <Link
                              to="/resident/payments"
                              style={{
                                padding: '4px 10px',
                                backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#ffffff',
                                border: '1px solid #0284c7',
                                color: isDark ? '#38bdf8' : '#0284c7',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Receipt
                            </Link>
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

      {/* =========================================================================
          VIEW B: SOCIETY FINANCIAL OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* MANDATORY PHASE 6 TRANSPARENCY DISCLAIMER */}
          <div style={{
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
            border: isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Info size={22} color={isDark ? '#60a5fa' : '#0284c7'} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800', color: isDark ? '#93c5fd' : '#1e40af' }}>
                Society-wide financial information — informational transparency, not your personal payable dues.
              </h4>
              <p style={{ margin: 0, fontSize: '0.825rem', color: isDark ? '#bfdbfe' : '#1e3a8a', lineHeight: 1.5 }}>
                The figures below represent collective society-wide collections and audited operational expenditures for the community. These records are published for governance and financial transparency. They do <strong>not</strong> represent your individual flat's personal balance.
              </p>
            </div>
          </div>

          {/* Period Filter Bar */}
          <PeriodFilterBar
            initialPeriod={filterState.period}
            initialMonth={filterState.month}
            initialYear={filterState.year}
            initialStartDate={filterState.startDate}
            initialEndDate={filterState.endDate}
            filterState={filterState}
            periodLabel={periodLabel}
            availableYears={availableYears}
            onApply={handlePeriodApply}
            onRefresh={handleRefresh}
            loading={loading}
            refreshing={refreshing}
          />

          {/* 4 KPI Cards: Opening Balance, Income, Expenses, Closing Balance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Opening Balance */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Society Opening Balance
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color="var(--sh-slate-900)" strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--sh-slate-900)', lineHeight: 1 }}>
                  {(summary.openingBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>
                Verified community fund reserve prior to {periodLabel}
              </span>
            </div>

            {/* Collected Maintenance Income */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                  Collected Society Income
                </span>
                <span style={{ padding: '3px 8px', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7', color: isDark ? '#34d399' : '#166534', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700' }}>
                  Verified
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={isDark ? '#34d399' : '#166534'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#34d399' : '#166534', lineHeight: 1 }}>
                  {(summary.totalCollectedIncome || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>
                {summary.incomeTransactionsCount || 0} confirmed collection(s) in {periodLabel}
              </span>
            </div>

            {/* Actual Recorded Expenses */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Recorded Expenses Paid
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={isDark ? '#f87171' : '#dc2626'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#f87171' : '#dc2626', lineHeight: 1 }}>
                  {(summary.totalPaidExpenses || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>
                {summary.expenseRecordsCount || 0} operational expenditure item(s)
              </span>
            </div>

            {/* Closing Balance */}
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Society Closing Balance
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <IndianRupee size={20} color={isDark ? '#38bdf8' : '#0284c7'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#38bdf8' : '#0284c7', lineHeight: 1 }}>
                  {(summary.closingBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>
                Net operational fund position for {periodLabel}
              </span>
            </div>
          </div>

          {/* Category Breakdown Chips */}
          {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
            <div style={{
              backgroundColor: 'var(--sh-white)',
              borderRadius: '12px',
              padding: '16px 20px',
              border: '1px solid var(--sh-slate-200)',
              boxShadow: 'var(--sh-shadow-xs)'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>
                Society Expense Categories ({periodLabel})
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.categoryBreakdown.map(cat => (
                  <div
                    key={cat.category}
                    style={{
                      backgroundColor: 'var(--sh-slate-100)',
                      border: '1px solid var(--sh-slate-200)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--sh-slate-900)' }}>{cat.category}</span>
                    <span style={{ fontWeight: '700', color: isDark ? '#38bdf8' : '#0284c7' }}>₹{Number(cat.total).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense Ledger Table */}
          <div style={{
            backgroundColor: 'var(--sh-white)',
            borderRadius: '14px',
            border: '1px solid var(--sh-slate-200)',
            boxShadow: 'var(--sh-shadow-xs)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--sh-slate-200)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--sh-slate-100)'
            }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                  Audited Operational Expenditures ({filteredExpenses.length})
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                  Community Fund Utilization in {periodLabel}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--sh-slate-400)" style={{ position: 'absolute', top: '10px', left: '10px' }} />
                  <input
                    type="text"
                    placeholder="Search vendor, title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '7px 24px 7px 30px', borderRadius: '6px', border: '1px solid var(--sh-slate-300)', backgroundColor: 'var(--sh-white)', color: 'var(--sh-slate-900)', fontSize: '0.8rem', width: '200px' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sh-slate-400)' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--sh-slate-300)', fontSize: '0.8rem', backgroundColor: 'var(--sh-white)', color: 'var(--sh-slate-900)' }}
                >
                  <option value="All">All Categories</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
                <Receipt size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No audited society expenses recorded for this selection.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Date</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Expense Item</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Category</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Vendor</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Amount</th>
                      <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map(item => (
                      <tr key={item._id} style={{ borderBottom: '1px solid var(--sh-slate-200)' }}>
                        <td style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', whiteSpace: 'nowrap' }}>
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--sh-slate-900)' }}>{item.title}</div>
                          {item.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)', marginTop: '2px' }}>{item.description}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ backgroundColor: 'var(--sh-slate-100)', color: 'var(--sh-slate-600)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--sh-slate-600)' }}>
                          {item.vendor || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {getStatusBadge(item.paymentStatus)}
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

      {/* =========================================================================
          VIEW C: HISTORICAL SOCIETY RECORDS
          ========================================================================= */}
      {activeTab === 'historical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Historical Archive Notice */}
          <div style={{
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#f8fafc',
            border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <History size={22} color={isDark ? '#818cf8' : '#6366f1'} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '800', color: isDark ? '#a5b4fc' : '#4338ca' }}>
                Historical Society Archive — Informational records from previous financial periods
              </h4>
              <p style={{ margin: 0, fontSize: '0.825rem', color: isDark ? '#c7d2fe' : '#3730a3', lineHeight: 1.5 }}>
                Past society expenditures and community collections are preserved here for audit governance. Past transactions belong to earlier society operating cycles and <strong>do not automatically become a new resident's personal bills</strong>.
              </p>
            </div>
          </div>

          {/* Historical Period Selector */}
          <PeriodFilterBar
            initialPeriod="all"
            periodLabel="All Time Historical Records"
            availableYears={availableYears}
            onApply={handlePeriodApply}
            onRefresh={handleRefresh}
            loading={loading}
            refreshing={refreshing}
          />

          {/* Lifetime Society Totals (Explicitly labelled as community historical, not personal) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', padding: '20px', border: '1px solid var(--sh-slate-200)', boxShadow: 'var(--sh-shadow-xs)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Lifetime Society Collections
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                <IndianRupee size={20} color={isDark ? '#34d399' : '#166534'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#34d399' : '#166534' }}>
                  {(data?.lifetimeSummary?.totalIncome || summary.totalCollectedIncome || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)', display: 'block', marginTop: '4px' }}>
                Informational community income archive
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', padding: '20px', border: '1px solid var(--sh-slate-200)', boxShadow: 'var(--sh-shadow-xs)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Lifetime Audited Expenditures
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                <IndianRupee size={20} color={isDark ? '#f87171' : '#dc2626'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#f87171' : '#dc2626' }}>
                  {(data?.lifetimeSummary?.totalExpense || summary.totalPaidExpenses || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)', display: 'block', marginTop: '4px' }}>
                Cumulative operational society costs
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', padding: '20px', border: '1px solid var(--sh-slate-200)', boxShadow: 'var(--sh-shadow-xs)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase' }}>
                Cumulative Operating Reserve
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '6px' }}>
                <IndianRupee size={20} color={isDark ? '#38bdf8' : '#0284c7'} strokeWidth={2.5} />
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: isDark ? '#38bdf8' : '#0284c7' }}>
                  {((data?.lifetimeSummary?.netBalance !== undefined ? data.lifetimeSummary.netBalance : summary.closingBalance) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)', display: 'block', marginTop: '4px' }}>
                Preserved community fund balance
              </span>
            </div>
          </div>

          {/* Historical Transaction Records Table */}
          <div style={{
            backgroundColor: 'var(--sh-white)',
            borderRadius: '14px',
            border: '1px solid var(--sh-slate-200)',
            boxShadow: 'var(--sh-shadow-xs)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sh-slate-200)', backgroundColor: 'var(--sh-slate-100)' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                Historical Audited Society Ledger
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                Past society expenditures preserved for transparent member verification
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: 'var(--sh-slate-100)', borderBottom: '1px solid var(--sh-slate-200)' }}>
                  <tr>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Date</th>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Title & Description</th>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Category</th>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Vendor</th>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Amount</th>
                    <th style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', fontWeight: '700' }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {rawExpenses.map(item => (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--sh-slate-200)' }}>
                      <td style={{ padding: '12px 18px', color: 'var(--sh-slate-600)', whiteSpace: 'nowrap' }}>
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ fontWeight: '600', color: 'var(--sh-slate-900)' }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--sh-slate-500)' }}>{item.description}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span style={{ backgroundColor: 'var(--sh-slate-100)', color: 'var(--sh-slate-600)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--sh-slate-600)' }}>
                        {item.vendor || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 18px', fontWeight: '700', color: 'var(--sh-slate-900)' }}>
                        ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--sh-slate-500)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {item.referenceNumber || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceSummary;
