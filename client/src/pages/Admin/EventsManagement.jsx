import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CalendarDays, Plus, MapPin, Users, Clock, Edit, Trash2 } from 'lucide-react';

const EventsManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', date: '', startTime: '', endTime: '', location: '', capacity: '', status: 'Published' });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      setEvents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events/admin', formData);
      alert('Event created successfully');
      fetchEvents();
      setShowForm(false);
      setFormData({ title: '', description: '', date: '', startTime: '', endTime: '', location: '', capacity: '', status: 'Published' });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create event');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Published': return { bg: '#dcfce7', text: '#166534' };
      case 'Draft': return { bg: '#f1f5f9', text: '#475569' };
      case 'Completed': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Cancelled': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading events...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Events Management</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Organize and manage society events and meetings</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#10b981', color: 'white', border: 'none',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '600', transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          {showForm ? <CalendarDays size={18} /> : <Plus size={18} />}
          {showForm ? 'View Events' : 'Create Event'}
        </button>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Create New Event</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 300px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Event Title*</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Diwali Celebration" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Status*</label>
                <select required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Description*</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '80px', resize: 'vertical' }} placeholder="Describe the event details..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Date*</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Start Time*</label>
                <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>End Time*</label>
                <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 300px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Location*</label>
                <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Clubhouse" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Capacity*</label>
                <input type="number" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="Max attendees" />
              </div>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px', alignSelf: 'flex-start' }}>
              Create Event
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {events.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CalendarDays size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No events found</h3>
              <p style={{ margin: 0 }}>Create a new event to bring the community together.</p>
            </div>
          ) : (
            events.map(ev => {
              const statusColor = getStatusColor(ev.status);
              return (
                <div key={ev._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{ev.title}</h3>
                      <span style={{ backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {ev.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                        <Clock size={16} />
                        <span>{new Date(ev.date).toLocaleDateString()} • {ev.startTime} - {ev.endTime}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                        <MapPin size={16} />
                        <span>{ev.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                        <Users size={16} />
                        <span>{ev.participants?.length || 0} / {ev.capacity} RSVPs</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', color: '#475569', cursor: 'pointer' }}>
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default EventsManagement;
