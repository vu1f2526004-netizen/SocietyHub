import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, Search, Home, Mail, Phone, CalendarDays } from 'lucide-react';

const ResidentsManagement = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users');
        setResidents(res.data.data.filter(u => u.role === 'Resident'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchResidents();
  }, []);

  const filteredResidents = residents.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.flatNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading residents...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Resident Directory</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Manage all registered society residents</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by name, flat, or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {filteredResidents.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <Users size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No residents found</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Resident</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Contact</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Flat</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Joined</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {r.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{r.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
                          <Mail size={14} /> {r.email}
                        </div>
                        {r.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.875rem' }}>
                            <Phone size={14} /> {r.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontSize: '0.875rem', fontWeight: '500' }}>
                        <Home size={16} color="#64748b" /> {r.flatNumber || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={14} /> {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                        Active
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
  );
};

export default ResidentsManagement;
