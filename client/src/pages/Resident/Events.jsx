import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle } from 'lucide-react';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [myRsvps, setMyRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      setEvents(res.data.data.filter(e => e.status !== 'Draft')); // Only show non-draft
      
      const rsvpRes = await api.get('/events/my/rsvps');
      setMyRsvps(rsvpRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRsvp = async (id) => {
    try {
      await api.post(`/events/${id}/rsvp`);
      alert('RSVP Successful! See you there.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to RSVP');
    }
  };

  const handleCancelRsvp = async (id) => {
    try {
      await api.patch(`/events/${id}/rsvp`);
      alert('RSVP Cancelled');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const getRsvpStatus = (eventId) => {
    return myRsvps.find(r => r.eventId?._id === eventId && r.status === 'Going');
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading events...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Society Events</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Join community gatherings and celebrations</p>
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {events.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Calendar size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No Upcoming Events</h3>
            <p style={{ margin: 0 }}>Check back later for new community activities.</p>
          </div>
        ) : (
          events.map(ev => {
            const isGoing = getRsvpStatus(ev._id);
            const isCompleted = ev.status === 'Completed';
            const isCancelled = ev.status === 'Cancelled';
            
            return (
              <div key={ev._id} style={{ 
                backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', 
                border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ 
                  backgroundColor: isCompleted || isCancelled ? '#64748b' : '#3b82f6', 
                  color: 'white', padding: '20px', position: 'relative' 
                }}>
                  {isGoing && !isCompleted && !isCancelled && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#10b981', color: 'white', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <CheckCircle size={14} /> I'm Going!
                    </div>
                  )}
                  {isCancelled && (
                    <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
                      Cancelled
                    </div>
                  )}
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', paddingRight: isGoing || isCancelled ? '80px' : '0' }}>{ev.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', opacity: 0.9 }}>
                    <Calendar size={16} />
                    <span>{new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, flex: 1 }}>{ev.description}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155' }}>
                      <Clock size={16} color="#64748b" />
                      <span style={{ fontWeight: '500' }}>{ev.startTime} - {ev.endTime}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155' }}>
                      <MapPin size={16} color="#64748b" />
                      <span>{ev.location}</span>
                    </div>
                    {ev.capacity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155' }}>
                        <Users size={16} color="#64748b" />
                        <span>Max Capacity: {ev.capacity}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ marginTop: 'auto' }}>
                    {isCompleted ? (
                      <button disabled style={{ width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'not-allowed' }}>
                        Event Completed
                      </button>
                    ) : isCancelled ? (
                      <button disabled style={{ width: '100%', padding: '12px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '600', cursor: 'not-allowed' }}>
                        Event Cancelled
                      </button>
                    ) : isGoing ? (
                      <button onClick={() => handleCancelRsvp(ev._id)} style={{ width: '100%', padding: '12px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#fef2f2'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'white'}>
                        <XCircle size={18} /> Cancel RSVP
                      </button>
                    ) : (
                      <button onClick={() => handleRsvp(ev._id)} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#2563eb'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#3b82f6'}>
                        <CheckCircle size={18} /> RSVP Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Events;
