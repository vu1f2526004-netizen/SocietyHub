import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    pendingBillsAmount: 0,
    complaints: { pending: 0, inProgress: 0, resolved: 0 },
    expectedVisitors: 0,
    upcomingEvents: 0,
    activePolls: 0,
    unreadNotifications: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // We run multiple promises to gather stats
        const [
          billsRes,
          complaintsRes,
          visitorsRes,
          eventsRes,
          pollsRes,
          notifsRes
        ] = await Promise.all([
          api.get('/bills/my'),
          api.get('/complaints/my'),
          api.get('/visitors/my'),
          api.get('/events'),
          api.get('/polls'),
          api.get('/notifications/my')
        ]);

        const pendingBills = billsRes.data.data.filter(b => ['Pending', 'PaymentInitiated', 'Failed', 'Overdue'].includes(b.status));
        const amountDue = pendingBills.reduce((acc, bill) => acc + (bill.amount || 0), 0);

        const complaints = complaintsRes.data.data;
        const compStats = {
          pending: complaints.filter(c => c.status === 'Pending' || c.status === 'Assigned').length,
          inProgress: complaints.filter(c => c.status === 'InProgress').length,
          resolved: complaints.filter(c => c.status === 'Completed' || c.status === 'Resolved').length
        };

        const today = new Date().toISOString().split('T')[0];
        const visitorsToday = visitorsRes.data.data.filter(v => v.expectedDate.startsWith(today) && v.status === 'Expected').length;

        const events = eventsRes.data.data.filter(e => e.status === 'Published' && new Date(e.date) >= new Date()).length;
        const polls = pollsRes.data.data.filter(p => p.status === 'Published').length; // Ideally check if already voted, but simple count is fine
        const unread = notifsRes.data.data.filter(n => !n.isRead).length;

        setStats({
          pendingBillsAmount: amountDue,
          complaints: compStats,
          expectedVisitors: visitorsToday,
          upcomingEvents: events,
          activePolls: polls,
          unreadNotifications: unread
        });
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <div 
      onClick={onClick}
      style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${color}`
      }}
      onMouseOver={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseOut={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: `${color}15`, color: color }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>{value}</span>
      </div>
      {subtitle && <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>{subtitle}</p>}
    </div>
  );

  const QuickAction = ({ icon: Icon, label, color, onClick }) => (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
        backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px',
        cursor: 'pointer', transition: 'all 0.2s', color: '#334155', fontWeight: '500'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.color = color;
        e.currentTarget.style.boxShadow = `0 4px 12px ${color}20`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.color = '#334155';
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
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Good Morning, {user?.name}</h2>
        <p style={{ fontSize: '1.1rem', color: '#64748b', margin: 0 }}>Flat {user?.flatNumber || 'N/A'}</p>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          <QuickAction icon={PlusCircle} label="Raise Complaint" color="#ef4444" onClick={() => navigate('/resident/complaints/new')} />
          <QuickAction icon={UserPlus} label="Add Visitor" color="#3b82f6" onClick={() => navigate('/resident/visitors')} />
          <QuickAction icon={CreditCard} label="Pay Maintenance" color="#10b981" onClick={() => navigate('/resident/bills')} />
          <QuickAction icon={AlertTriangle} label="Report Issue" color="#f59e0b" onClick={() => navigate('/resident/issues')} />
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Overview</h3>
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
            value={stats.expectedVisitors}
            subtitle="Expected at gate"
            icon={Clock} 
            color="#8b5cf6" 
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
