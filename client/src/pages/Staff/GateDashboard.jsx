import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { UserCheck, LogIn, LogOut, CheckSquare, AlertTriangle, Car, ShieldAlert, Clock, Package } from 'lucide-react';

const GateDashboard = () => {
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    expectedVisitors: 0,
    currentlyInside: 0,
    entriesToday: 0,
    exitsToday: 0,
    pendingTasks: 0,
    openIncidents: 0,
    parkingIssues: 0,
    pendingPermissions: 0,
    parcelsAtGate: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const today = new Date().toISOString().split('T')[0];

      // Parallel fetch for speed
      const [visitorsRes, complaintsRes, repairsRes, issuesRes] = await Promise.allSettled([
        api.get('/visitors/staff'),
        api.get('/complaints/staff/assigned'),
        api.get('/repairs/staff'),
        api.get('/issues')
      ]);

      let s = {
        expectedVisitors: 0,
        currentlyInside: 0,
        entriesToday: 0,
        exitsToday: 0,
        pendingTasks: 0,
        openIncidents: 0,
        parkingIssues: 0,
        pendingPermissions: 0,
        parcelsAtGate: 0
      };

      if (visitorsRes.status === 'fulfilled') {
        const vList = visitorsRes.value.data?.data || [];
        s.expectedVisitors = vList.filter(v => v.status === 'Expected' && v.expectedDate && v.expectedDate.startsWith(today)).length;
        s.currentlyInside = vList.filter(v => v.status === 'Entered' || v.status === 'CheckedIn').length;
        s.entriesToday = vList.filter(v => v.entryTimestamp && v.entryTimestamp.startsWith(today)).length;
        s.exitsToday = vList.filter(v => v.exitTimestamp && v.exitTimestamp.startsWith(today)).length;
        s.pendingPermissions = vList.filter(v => v.status === 'Pending').length;
        s.parcelsAtGate = vList.filter(v => v.status === 'ParcelAtGate').length;
      }

      let taskCount = 0;
      if (complaintsRes.status === 'fulfilled') {
        taskCount += (complaintsRes.value.data?.data || []).filter(c => ['Assigned', 'In Progress'].includes(c.status)).length;
      }
      if (repairsRes.status === 'fulfilled') {
        taskCount += (repairsRes.value.data?.data || []).filter(r => ['Assigned', 'In Progress'].includes(r.status)).length;
      }
      s.pendingTasks = taskCount;

      if (issuesRes.status === 'fulfilled') {
         const issues = issuesRes.value.data?.data || [];
         s.openIncidents = issues.filter(i => i.status === 'Pending' && i.issueType === 'Incident').length;
         s.parkingIssues = issues.filter(i => i.status === 'Pending' && i.issueType === 'Parking').length;
      }

      setStats(s);
      if (isRefresh) {
        toast.success('Gate Dashboard updated');
      }
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const KpiCard = ({ title, value, icon: Icon, color, bg }) => (
    <div style={{ backgroundColor: 'var(--sh-white)', borderRadius: '12px', padding: '24px', border: '1px solid var(--sh-slate-200)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} />
      </div>
      <div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: '600', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
        <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: 'var(--sh-slate-900)' }}>{value}</p>
      </div>
    </div>
  );

  const QuickAction = ({ label, icon: Icon, color, path }) => (
    <button 
      onClick={() => navigate(path)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', backgroundColor: 'var(--sh-white)', border: '1px solid var(--sh-slate-200)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600', color: 'var(--sh-slate-700)' }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.color = color;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 6px 16px ${color}25`;
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = 'var(--sh-slate-200)';
        e.currentTarget.style.color = 'var(--sh-slate-700)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: `${color}15`, color: color }}>
        <Icon size={32} />
      </div>
      <span style={{ fontSize: '1rem', textAlign: 'center' }}>{label}</span>
    </button>
  );

  if (loading && !stats.entriesToday && !stats.expectedVisitors && !stats.currentlyInside) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loader">Loading Dashboard...</div></div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--sh-slate-900)', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Good Morning, {user?.name}</h2>
          <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--sh-slate-500)' }}>Security & Operations Dashboard</p>
        </div>
        <RefreshButton onRefresh={() => fetchDashboardData(true)} loading={refreshing} title="Refresh dashboard data" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <KpiCard title="Pending Approvals" value={stats.pendingPermissions} icon={Clock} color="#b45309" bg="#fffbeb" />
        <KpiCard title="Parcels at Gate" value={stats.parcelsAtGate} icon={Package} color="#7c3aed" bg="#f5f3ff" />
        <KpiCard title="Expected Visitors Today" value={stats.expectedVisitors} icon={UserCheck} color="#3b82f6" bg="#eff6ff" />
        <KpiCard title="Currently Inside" value={stats.currentlyInside} icon={LogIn} color="#f59e0b" bg="#fffbeb" />
        <KpiCard title="Entries Today" value={stats.entriesToday} icon={LogIn} color="#10b981" bg="#ecfdf5" />
        <KpiCard title="Exits Today" value={stats.exitsToday} icon={LogOut} color="#64748b" bg="#f1f5f9" />
        <KpiCard title="Pending Tasks" value={stats.pendingTasks} icon={CheckSquare} color="#8b5cf6" bg="#f5f3ff" />
        <KpiCard title="Open Incidents" value={stats.openIncidents} icon={ShieldAlert} color="#ef4444" bg="#fef2f2" />
        <KpiCard title="Parking Observations" value={stats.parkingIssues} icon={Car} color="#06b6d4" bg="#ecfeff" />
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--sh-slate-900)', marginBottom: '20px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
          <QuickAction label="Gate Operations" icon={UserCheck} color="#3b82f6" path="/staff/visitors" />
          <QuickAction label="View My Tasks" icon={CheckSquare} color="#10b981" path="/staff/tasks" />
          <QuickAction label="Report Incident" icon={AlertTriangle} color="#ef4444" path="/staff/incidents" />
          <QuickAction label="Report Parking Issue" icon={Car} color="#f59e0b" path="/staff/parking" />
        </div>
      </div>
    </div>
  );
};

export default GateDashboard;
