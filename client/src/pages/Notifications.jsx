import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Bell, 
  CheckCheck, 
  Check, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  CreditCard, 
  UserPlus,
  RefreshCw,
  Filter
} from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchNotifications(); 
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredList = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const getNotificationIcon = (type, title = '') => {
    const t = (type || '').toLowerCase();
    const tit = (title || '').toLowerCase();

    if (t === 'success' || tit.includes('payment') || tit.includes('approved')) {
      return <CheckCircle size={18} color="#16a34a" />;
    }
    if (tit.includes('request') || tit.includes('registration')) {
      return <UserPlus size={18} color="#2563eb" />;
    }
    if (t === 'warning' || tit.includes('complaint') || tit.includes('issue')) {
      return <AlertTriangle size={18} color="#d97706" />;
    }
    if (tit.includes('bill') || tit.includes('dues')) {
      return <CreditCard size={18} color="#7c3aed" />;
    }
    return <Info size={18} color="#0284c7" />;
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '9999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: '700' }}>
                {unreadCount} unread
              </span>
            )}
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            System updates, society announcements, and account alerts
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'white', color: '#10b981', border: '1px solid #10b981',
                padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '0.85rem'
              }}
            >
              <CheckCheck size={16} />
              <span>Mark All as Read</span>
            </button>
          )}

          <button
            onClick={fetchNotifications}
            title="Refresh"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1',
              width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.875rem',
            color: filter === 'all' ? '#10b981' : '#64748b',
            borderBottom: filter === 'all' ? '2px solid #10b981' : '2px solid transparent'
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.875rem',
            color: filter === 'unread' ? '#10b981' : '#64748b',
            borderBottom: filter === 'unread' ? '2px solid #10b981' : '2px solid transparent'
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification Cards */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px auto' }} />
          <div>Loading notifications...</div>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <Bell size={24} color="#94a3b8" />
          </div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: '#1e293b' }}>No Notifications Found</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>
            {filter === 'unread' ? 'You have no unread notifications.' : 'No notifications in your account yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredList.map(n => (
            <div
              key={n._id}
              onClick={() => {
                if (!n.read) handleMarkAsRead(n._id);
                if (n.link) navigate(n.link);
              }}
              style={{
                padding: '16px 20px',
                backgroundColor: n.read ? 'white' : '#f0fdf4',
                border: n.read ? '1px solid #e2e8f0' : '1px solid #86efac',
                borderLeft: n.read ? '4px solid #cbd5e1' : '4px solid #10b981',
                borderRadius: '10px',
                cursor: n.link ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {getNotificationIcon(n.type, n.title)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: n.read ? '600' : '700', color: '#0f172a' }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#334155', lineHeight: 1.45 }}>
                  {n.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {n.link ? (
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>View details</span>
                      <ExternalLink size={12} />
                    </span>
                  ) : <span />}

                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n._id, e)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.borderColor = '#10b981';
                        e.currentTarget.style.color = '#10b981';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#475569';
                      }}
                    >
                      <Check size={12} />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Notifications;
