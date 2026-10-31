import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RefreshButton from '../components/shared/RefreshButton';
import api from '../services/api';
import { 
  PlusCircle, 
  UserPlus, 
  CreditCard, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Activity
} from 'lucide-react';

const ResidentDashboard = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshFailed, setRefreshFailed] = useState(false);

  const isFetchingRef = useRef(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  // Dashboard stats
  const [stats, setStats] = useState({
    pendingBillsAmount: 0,
    complaints: { pending: 0, inProgress: 0, resolved: 0 },
    expectedVisitors: 0,
    pendingGateRequests: 0,
    upcomingEvents: 0,
    activePolls: 0,
    unreadNotifications: 0
  });

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // We run multiple promises to gather stats concurrently with fault tolerance
      const results = await Promise.allSettled([
        api.get('/bills/my'),
        api.get('/complaints/my'),
        api.get('/visitors/my'),
        api.get('/events'),
        api.get('/polls'),
        api.get('/notifications')
      ]);

      const [billsRes, complaintsRes, visitorsRes, eventsRes, pollsRes, notifsRes] = results;

      const failedServices = [];
      if (billsRes.status === 'rejected') failedServices.push('Bills');
      if (complaintsRes.status === 'rejected') failedServices.push('Complaints');
      if (visitorsRes.status === 'rejected') failedServices.push('Visitors');
      if (eventsRes.status === 'rejected') failedServices.push('Events');
      if (pollsRes.status === 'rejected') failedServices.push('Polls');
      if (notifsRes.status === 'rejected') failedServices.push('Notifications');

      if (failedServices.length === results.length) {
        setRefreshFailed(true);
        if (isRefresh) {
          toastRef.current.error('Failed to refresh resident dashboard');
        }
        return;
      }

      // Update state only from successful responses; preserve existing state for any failed requests
      setStats((prevStats) => {
        const nextStats = { ...prevStats };

        if (billsRes.status === 'fulfilled') {
          const billsData = billsRes.value.data?.data || [];
          const pendingBills = billsData.filter((b) =>
            ['Pending', 'PaymentInitiated', 'Failed', 'Overdue'].includes(b.status)
          );
          nextStats.pendingBillsAmount = pendingBills.reduce((acc, bill) => acc + (bill.amount || 0), 0);
        }

        if (complaintsRes.status === 'fulfilled') {
          const complaints = complaintsRes.value.data?.data || [];
          nextStats.complaints = {
            pending: complaints.filter((c) => c.status === 'Pending' || c.status === 'Assigned').length,
            inProgress: complaints.filter((c) => c.status === 'InProgress').length,
            resolved: complaints.filter((c) => c.status === 'Completed' || c.status === 'Resolved').length,
          };
        }

        if (visitorsRes.status === 'fulfilled') {
          const today = new Date().toISOString().split('T')[0];
          const visitors = visitorsRes.value.data?.data || [];
          nextStats.expectedVisitors = visitors.filter(
            (v) => v.expectedDate && v.expectedDate.startsWith(today) && v.status === 'Expected'
          ).length;
          nextStats.pendingGateRequests = visitors.filter((v) => v.status === 'Pending').length;
        }

        if (eventsRes.status === 'fulfilled') {
          const events = eventsRes.value.data?.data || [];
          nextStats.upcomingEvents = events.filter(
            (e) => e.status === 'Published' && new Date(e.date) >= new Date()
          ).length;
        }

        if (pollsRes.status === 'fulfilled') {
          const polls = pollsRes.value.data?.data || [];
          nextStats.activePolls = polls.filter((p) => p.status === 'Published').length;
        }

        if (notifsRes.status === 'fulfilled') {
          const notifsData = notifsRes.value.data;
          const unread =
            typeof notifsData?.unreadCount === 'number'
              ? notifsData.unreadCount
              : (notifsData?.data || []).filter((n) => !(n.read || n.isRead)).length;
          nextStats.unreadNotifications = unread;
        }

        return nextStats;
      });

      if (failedServices.length > 0) {
        setRefreshFailed(true);
        if (isRefresh) {
          toastRef.current.warning(`Dashboard partially refreshed. Could not fetch: ${failedServices.join(', ')}`);
        }
      } else {
        setRefreshFailed(false);
        setLastRefreshed(new Date());
        if (isRefresh) {
          toastRef.current.success('Resident dashboard refreshed');
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats', err);
      setRefreshFailed(true);
      if (isRefresh) {
        toastRef.current.error('Failed to refresh resident dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <div 
      onClick={onClick}
      style={{ 
        backgroundColor: 'var(--sh-white)', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid var(--sh-slate-200)',
        borderLeft: `4px solid ${color}`
      }}
      onMouseOver={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseOut={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `${color}15`, color: color }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>{value}</span>
      </div>
      {subtitle && <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: 'var(--sh-slate-400)' }}>{subtitle}</p>}
    </div>
  );

  const QuickAction = ({ icon: Icon, label, color, onClick }) => (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
        backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', padding: '20px',
        cursor: 'pointer', transition: 'all 0.2s', color: 'var(--sh-slate-700)', fontWeight: '500'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.color = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 6px 16px ${color}20`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--sh-slate-200)';
        e.currentTarget.style.color = 'var(--sh-slate-700)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} />
      </div>
      <span>{label}</span>
    </button>
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading Dashboard...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sh-slate-900)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Good Morning, {user?.name}</h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--sh-slate-500)', margin: 0 }}>Flat {user?.flatNumber || 'N/A'}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <RefreshButton
            onClick={() => fetchDashboardData(true)}
            refreshing={refreshing}
            loading={loading}
            title="Refresh resident dashboard"
          />
          {refreshFailed && (
            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '500' }}>
              ⚠️ Refresh did not succeed. Showing last saved records.
            </span>
          )}
          {!refreshFailed && lastRefreshed && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {stats.pendingGateRequests > 0 && (
        <div 
          onClick={() => navigate('/resident/visitors')}
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '32px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.08)',
            transition: 'transform 0.15s ease'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
            <div>
              <span style={{ fontWeight: '700', color: '#991b1b', fontSize: '0.95rem' }}>
                {stats.pendingGateRequests} Gate Permission Request{stats.pendingGateRequests > 1 ? 's' : ''} Pending
              </span>
              <p style={{ margin: '2px 0 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>
                A visitor or delivery is waiting at the security gate for your decision.
              </p>
            </div>
          </div>
          <span style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.875rem' }}>Review Now →</span>
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--sh-slate-900)', marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          <QuickAction icon={PlusCircle} label="Raise Complaint" color="#ef4444" onClick={() => navigate('/resident/complaints/new')} />
          <QuickAction icon={UserPlus} label="Add Visitor" color="#3b82f6" onClick={() => navigate('/resident/visitors')} />
          <QuickAction icon={CreditCard} label="Pay Maintenance" color="#10b981" onClick={() => navigate('/resident/bills')} />
          <QuickAction icon={AlertTriangle} label="Report Issue" color="#f59e0b" onClick={() => navigate('/resident/issues')} />
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--sh-slate-900)', marginBottom: '16px' }}>Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
          <StatCard 
            title="Maintenance Due" 
            value={`₹${stats.pendingBillsAmount}`}
            subtitle={stats.pendingBillsAmount > 0 ? "Action required" : "All caught up!"}
            icon={IndianRupee} 
            color={stats.pendingBillsAmount > 0 ? "#ef4444" : "#10b981"} 
            onClick={() => navigate('/resident/bills')}
          />
          <StatCard 
            title="My Complaints" 
            value={stats.complaints.pending + stats.complaints.inProgress}
            subtitle={`${stats.complaints.resolved} resolved recently`}
            icon={Activity} 
            color="#3b82f6" 
            onClick={() => navigate('/resident/complaints')}
          />
          <StatCard 
            title="Today's Visitors" 
            value={stats.pendingGateRequests > 0 ? `${stats.expectedVisitors} (${stats.pendingGateRequests} Pending)` : stats.expectedVisitors}
            subtitle={stats.pendingGateRequests > 0 ? "Permission required!" : "Expected at gate"}
            icon={Clock} 
            color={stats.pendingGateRequests > 0 ? "#ef4444" : "#8b5cf6"} 
            onClick={() => navigate('/resident/visitors')}
          />
          <StatCard 
            title="Upcoming Events" 
            value={stats.upcomingEvents}
            subtitle="Check community calendar"
            icon={Calendar} 
            color="#ec4899" 
            onClick={() => navigate('/resident/events')}
          />
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;
