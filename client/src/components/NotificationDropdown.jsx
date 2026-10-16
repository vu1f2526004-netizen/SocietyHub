import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  ExternalLink, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  CreditCard,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

const NotificationDropdown = ({ userRole = 'Resident' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await api.get('/notifications');
      if (res.data?.success) {
        const list = res.data.data || [];
        setNotifications(list);
        const count = typeof res.data.unreadCount === 'number' 
          ? res.data.unreadCount 
          : list.filter(n => !n.read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
      if (!isSilent) setError('Failed to load notifications');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Initial fetch and 25s polling
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 25000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(true);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      await handleMarkAsRead(n._id);
    }
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const getFullNotificationPageRoute = () => {
    if (userRole === 'Admin') return '/admin/notifications';
    if (userRole === 'SecurityStaff') return '/staff/notifications';
    return '/resident/notifications';
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type, title = '') => {
    const t = (type || '').toLowerCase();
    const tit = (title || '').toLowerCase();

    if (t === 'success' || tit.includes('payment') || tit.includes('approved')) {
      return <CheckCircle size={16} color="#16a34a" />;
    }
    if (tit.includes('request') || tit.includes('registration')) {
      return <UserPlus size={16} color="#2563eb" />;
    }
    if (t === 'warning' || tit.includes('complaint') || tit.includes('issue')) {
      return <AlertTriangle size={16} color="#d97706" />;
    }
    if (tit.includes('bill') || tit.includes('dues')) {
      return <CreditCard size={16} color="#7c3aed" />;
    }
    return <Info size={16} color="#0284c7" />;
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        title="Notifications"
        aria-label="Notifications"
        style={{
          background: isOpen ? '#f1f5f9' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: isOpen ? '#0f172a' : '#64748b',
          position: 'relative',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease'
        }}
        onMouseOver={e => {
          if (!isOpen) e.currentTarget.style.backgroundColor = '#f8fafc';
        }}
        onMouseOut={e => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Bell size={21} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '10px',
              fontWeight: '700',
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.18s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
                onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px auto' }} />
                <span style={{ fontSize: '0.85rem' }}>Loading notifications...</span>
              </div>
            ) : error ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                  <Bell size={20} color="#94a3b8" />
                </div>
                <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem' }}>All caught up!</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>No new notifications right now.</div>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    backgroundColor: n.read ? 'white' : '#f0fdf4',
                    borderLeft: n.read ? '3px solid transparent' : '3px solid #10b981',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = n.read ? '#f8fafc' : '#eafaf1'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = n.read ? 'white' : '#f0fdf4'}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {getNotificationIcon(n.type, n.title)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: n.read ? '600' : '700', fontSize: '0.84rem', color: '#0f172a', lineHeight: 1.3 }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {n.message}
                    </p>
                    {n.link && (
                      <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '500' }}>
                        <span>Open details</span>
                        <ExternalLink size={10} />
                      </div>
                    )}
                  </div>
                  {!n.read && (
                    <button
                      title="Mark as read"
                      onClick={(e) => handleMarkAsRead(n._id, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#10b981'}
                      onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '10px 18px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              backgroundColor: '#fafafa'
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(getFullNotificationPageRoute());
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                padding: '4px 8px'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#0f172a'}
              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;
