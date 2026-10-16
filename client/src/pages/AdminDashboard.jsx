import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, 
  ShieldCheck,
  MessageSquareWarning, 
  Wrench, 
  WalletCards, 
  TrendingUp, 
  TrendingDown,
  UserCheck,
  AlertTriangle,
  Receipt,
  FileText,
  Calendar,
  Vote,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

const KpiCard = ({ title, value, icon: Icon, color, bg, onClick, subtitle }) => (
  <div 
    onClick={onClick}
    style={{ 
      backgroundColor: 'white', 
      borderRadius: '12px', 
      padding: '24px', 
      border: '1px solid #e2e8f0', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    }}
    onMouseOver={e => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = color;
      }
    }}
    onMouseOut={e => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }
    }}
  >
    <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={28} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: '0 0 4px 0', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>{value}</p>
      {subtitle && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</span>}
    </div>
  </div>
);

const QuickAction = ({ label, icon: Icon, color, onClick }) => (
  <button 
    onClick={onClick}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500', color: '#334155' }}
    onMouseOver={e => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.color = color;
      e.currentTarget.style.boxShadow = `0 4px 12px ${color}20`;
    }}
    onMouseOut={e => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.color = '#334155';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: `${color}15`, color: color }}>
      <Icon size={24} />
    </div>
    <span style={{ fontSize: '0.875rem', textAlign: 'center' }}>{label}</span>
  </button>
);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const [stats, setStats] = useState({
    residents: 0,
    staff: 0,
    complaints: 0,
    repairs: 0,
    pendingDues: 0,
    income: 0,
    expense: 0,
    visitorsToday: 0,
    pendingIssues: 0
  });

  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  
  const fetchDashboardData = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // 1. Primary: fetch atomic, society-scoped stats from /admin/stats
      let dataLoaded = false;
      try {
        const statsRes = await api.get('/admin/stats');
        if (statsRes?.data?.success && statsRes.data.data) {
          const d = statsRes.data.data;
          setStats({
            residents: typeof d.residents === 'number' ? d.residents : 0,
            staff: typeof d.staff === 'number' ? d.staff : 0,
            complaints: typeof d.complaints === 'number' ? d.complaints : 0,
            repairs: typeof d.repairs === 'number' ? d.repairs : 0,
            pendingDues: typeof d.pendingDues === 'number' ? d.pendingDues : 0,
            income: typeof d.income === 'number' ? d.income : 0,
            expense: typeof d.expense === 'number' ? d.expense : 0,
            visitorsToday: typeof d.visitorsToday === 'number' ? d.visitorsToday : 0,
            pendingIssues: typeof d.pendingIssues === 'number' ? d.pendingIssues : 0
          });

          if (Array.isArray(d.recentComplaints)) {
            setRecentComplaints(d.recentComplaints);
          }
          if (Array.isArray(d.recentPayments)) {
            setRecentPayments(d.recentPayments);
          }

          setLastUpdated(new Date());
          dataLoaded = true;
        }
      } catch (primaryErr) {
        console.warn('Direct /admin/stats endpoint error, falling back to individual endpoints:', primaryErr);
      }

      // 2. Fallback: query individual society-scoped endpoints if direct endpoint is unavailable
      if (!dataLoaded) {
        const [
          usersRes,
          staffRes,
          compRes,
          repairsRes,
          billsRes,
          financeRes,
          visitorsRes,
          issuesRes,
          paymentsRes
        ] = await Promise.allSettled([
          api.get('/users/residents'),
          api.get('/admin/staff'),
          api.get('/complaints'),
          api.get('/repairs'),
          api.get('/bills/admin'),
          api.get('/finance/admin/summary'),
          api.get('/visitors'),
          api.get('/issues'),
          api.get('/payments/admin')
        ]);

        const anyFulfilled = [usersRes, staffRes, compRes, repairsRes, billsRes, financeRes, visitorsRes, issuesRes, paymentsRes].some(
          r => r.status === 'fulfilled'
        );

        if (!anyFulfilled) {
          throw new Error('Unable to connect to dashboard services. Please verify your connection.');
        }

        let fetchedResidents = 0;
        let fetchedStaff = 0;
        let fetchedComplaints = 0;
        let fetchedRepairs = 0;
        let fetchedPendingDues = 0;
        let fetchedIncome = 0;
        let fetchedExpense = 0;
        let fetchedVisitorsToday = 0;
        let fetchedPendingIssues = 0;

        if (usersRes.status === 'fulfilled') {
          const resList = usersRes.value.data?.data || [];
          fetchedResidents = Array.isArray(resList)
            ? resList.filter(u => u.role === 'Resident' && u.status === 'Active').length
            : 0;
        }

        if (staffRes.status === 'fulfilled') {
          const staffList = staffRes.value.data?.data || [];
          fetchedStaff = Array.isArray(staffList)
            ? staffList.filter(s => s.role === 'SecurityStaff' && s.status === 'Active').length
            : 0;
        }

        if (compRes.status === 'fulfilled') {
          const comps = compRes.value.data?.data || [];
          if (Array.isArray(comps)) {
            fetchedComplaints = comps.filter(c => c.status === 'Pending').length;
            setRecentComplaints(comps.slice(0, 5));
          }
        }

        if (repairsRes.status === 'fulfilled') {
          const reps = repairsRes.value.data?.data || [];
          if (Array.isArray(reps)) {
            fetchedRepairs = reps.filter(r => r.status === 'Assigned' || r.status === 'In Progress').length;
          }
        }

        if (billsRes.status === 'fulfilled') {
          const bills = billsRes.value.data?.data || [];
          if (Array.isArray(bills)) {
            fetchedPendingDues = bills
              .filter(b => ['Pending', 'PaymentInitiated', 'Overdue', 'Failed'].includes(b.status))
              .reduce((acc, curr) => acc + (curr.amount || 0), 0);
          }
        }

        if (financeRes.status === 'fulfilled') {
          const finData = financeRes.value.data?.data || {};
          fetchedIncome = finData.currentMonthIncome ?? finData.monthTotalIncome ?? 0;
          fetchedExpense = finData.currentMonthExpense ?? finData.monthTotalExpense ?? 0;
        }

        if (visitorsRes.status === 'fulfilled') {
          const visitors = visitorsRes.value.data?.data || [];
          if (Array.isArray(visitors)) {
            const todayStr = new Date().toISOString().split('T')[0];
            fetchedVisitorsToday = visitors.filter(v => {
              const entry = v.entryTimestamp ? new Date(v.entryTimestamp).toISOString().split('T')[0] : null;
              const exp = v.expectedDate ? new Date(v.expectedDate).toISOString().split('T')[0] : null;
              const created = v.createdAt ? new Date(v.createdAt).toISOString().split('T')[0] : null;
              return entry === todayStr || exp === todayStr || created === todayStr;
            }).length;
          }
        }

        if (issuesRes.status === 'fulfilled') {
          const issues = issuesRes.value.data?.data || [];
          if (Array.isArray(issues)) {
            fetchedPendingIssues = issues.filter(i => i.status === 'Pending').length;
          }
        }

        if (paymentsRes.status === 'fulfilled') {
          const payments = paymentsRes.value.data?.data || [];
          if (Array.isArray(payments)) {
            setRecentPayments(payments.slice(0, 5));
          }
        }

        setStats({
          residents: fetchedResidents,
          staff: fetchedStaff,
          complaints: fetchedComplaints,
          repairs: fetchedRepairs,
          pendingDues: fetchedPendingDues,
          income: fetchedIncome,
          expense: fetchedExpense,
          visitorsToday: fetchedVisitorsToday,
          pendingIssues: fetchedPendingIssues
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load dashboard statistics';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh stats every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    // Refresh when user returns to window tab
    const handleFocus = () => {
      fetchDashboardData(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading && !stats.residents && !stats.staff) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '16px', 
          padding: '48px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          maxWidth: '480px',
          margin: '0 auto'
        }}>
          <RefreshCw size={36} color="#3b82f6" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a' }}>Loading Society Dashboard</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.925rem' }}>Fetching real-time records for your society...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* HEADER */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>
            {getGreeting()}, {user?.name || 'Administrator'}
          </h2>
          <p style={{ margin: 0, fontSize: '1rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Society Management Overview</span>
            <span>•</span>
            <span style={{ fontWeight: '500', color: '#334155' }}>{user?.societyName || 'Authorized Society'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => fetchDashboardData(true)}
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
            onMouseOver={e => {
              if (!refreshing) {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }
            }}
            onMouseOut={e => {
              if (!refreshing) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }
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
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: '#991b1b', fontSize: '0.925rem' }}>Dashboard Data Warning</p>
              <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
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

      {/* 9 KPI CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '36px' }}>
        <KpiCard 
          title="Total Residents" 
          value={stats.residents} 
          icon={Users} 
          color="#2563eb" 
          bg="#eff6ff" 
          onClick={() => navigate('/admin/registration-requests')}
          subtitle="Registered Active Residents"
        />
        <KpiCard 
          title="Total Security Staff" 
          value={stats.staff} 
          icon={ShieldCheck} 
          color="#059669" 
          bg="#ecfdf5" 
          onClick={() => navigate('/admin/staff')}
          subtitle="Authorized Gate Staff"
        />
        <KpiCard 
          title="Pending Complaints" 
          value={stats.complaints} 
          icon={MessageSquareWarning} 
          color="#d97706" 
          bg="#fffbeb" 
          onClick={() => navigate('/admin/complaints')}
          subtitle="Awaiting Resolution"
        />
        <KpiCard 
          title="Active Repairs" 
          value={stats.repairs} 
          icon={Wrench} 
          color="#7c3aed" 
          bg="#f5f3ff" 
          onClick={() => navigate('/admin/repairs')}
          subtitle="In Progress & Assigned"
        />
        <KpiCard 
          title="Pending Dues" 
          value={`₹${stats.pendingDues.toLocaleString('en-IN')}`} 
          icon={WalletCards} 
          color="#dc2626" 
          bg="#fef2f2" 
          onClick={() => navigate('/admin/bills')}
          subtitle="Outstanding Maintenance"
        />
        <KpiCard 
          title="Monthly Income" 
          value={`₹${stats.income.toLocaleString('en-IN')}`} 
          icon={TrendingUp} 
          color="#16a34a" 
          bg="#ecfdf5" 
          onClick={() => navigate('/admin/finance')}
          subtitle="Confirmed Receipts this Month"
        />
        <KpiCard 
          title="Monthly Expense" 
          value={`₹${stats.expense.toLocaleString('en-IN')}`} 
          icon={TrendingDown} 
          color="#e11d48" 
          bg="#fff1f2" 
          onClick={() => navigate('/admin/finance')}
          subtitle="Recorded Outflows this Month"
        />
        <KpiCard 
          title="Today's Visitors" 
          value={stats.visitorsToday} 
          icon={UserCheck} 
          color="#0891b2" 
          bg="#ecfeff" 
          onClick={() => navigate('/admin/visitors')}
          subtitle="Logged for Today"
        />
        <KpiCard 
          title="Pending Issues" 
          value={stats.pendingIssues} 
          icon={AlertTriangle} 
          color="#ca8a04" 
          bg="#fefce8" 
          onClick={() => navigate('/admin/issues')}
          subtitle="Unresolved Community Issues"
        />
      </div>

      {/* QUICK ACTIONS */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', marginBottom: '20px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
          <QuickAction label="Generate Bill" icon={Receipt} color="#10b981" onClick={() => navigate('/admin/bills')} />
          <QuickAction label="Review Complaints" icon={Activity} color="#f59e0b" onClick={() => navigate('/admin/complaints')} />
          <QuickAction label="Assign Repair" icon={Wrench} color="#3b82f6" onClick={() => navigate('/admin/repairs')} />
          <QuickAction label="Security Staff" icon={ShieldCheck} color="#059669" onClick={() => navigate('/admin/staff')} />
          <QuickAction label="Add Expense" icon={WalletCards} color="#ef4444" onClick={() => navigate('/admin/finance')} />
          <QuickAction label="Create Event" icon={Calendar} color="#8b5cf6" onClick={() => navigate('/admin/events')} />
          <QuickAction label="Create Poll" icon={Vote} color="#06b6d4" onClick={() => navigate('/admin/voting')} />
          <QuickAction label="Upload Document" icon={FileText} color="#6366f1" onClick={() => navigate('/admin/documents')} />
        </div>
      </div>

      {/* RECENT ACTIVITY: COMPLAINTS & PAYMENTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '32px' }}>
        {/* RECENT COMPLAINTS */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Recent Complaints</h3>
            <button 
              onClick={() => navigate('/admin/complaints')} 
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>
          {recentComplaints.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>No recent complaints in your society</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Title</th>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentComplaints.map(c => (
                    <tr key={c._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
                        <div>{c.title}</div>
                        {c.createdBy?.name && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {c.createdBy.name} {c.createdBy.flatNumber ? `(Flat ${c.createdBy.flatNumber})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          backgroundColor: c.status === 'Pending' ? '#fef3c7' : c.status === 'Completed' ? '#dcfce7' : '#e0e7ff', 
                          color: c.status === 'Pending' ? '#d97706' : c.status === 'Completed' ? '#166534' : '#4338ca' 
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.8125rem', color: '#64748b' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RECENT PAYMENTS */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Recent Payments</h3>
            <button 
              onClick={() => navigate('/admin/finance')} 
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>
          {recentPayments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>No recent payments recorded</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Resident</th>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Amount</th>
                    <th style={{ padding: '12px 24px', fontSize: '0.8125rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '500', color: '#0f172a' }}>
                        <div>{p.residentId?.name || 'Resident'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {p.residentId?.flatNumber ? `Flat ${p.residentId.flatNumber}` : ''} {p.billId?.month ? `• ${p.billId.month}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>
                        ₹{(p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '9999px', 
                          fontSize: '0.75rem', 
                          fontWeight: '600', 
                          backgroundColor: p.status === 'Success' ? '#dcfce7' : p.status === 'Pending' ? '#fef3c7' : '#fee2e2', 
                          color: p.status === 'Success' ? '#166534' : p.status === 'Pending' ? '#d97706' : '#dc2626' 
                        }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
