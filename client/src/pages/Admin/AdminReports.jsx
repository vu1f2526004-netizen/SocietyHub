import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BarChart3, TrendingUp, AlertTriangle, MessageSquareWarning, Wrench, Calendar, FileText } from 'lucide-react';

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // We reuse the /issues/analytics endpoint and we can extend it later if needed.
        // For now, this serves as our reporting overview.
        const res = await api.get('/issues/analytics');
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading reports...</div></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '40px' }}>No report data available.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Society Reports & Analytics</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Overview of community issues and parking reports</p>
        </div>
        <button 
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
            padding: '10px 16px', borderRadius: '8px', cursor: 'pointer',
            fontWeight: '600', transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
        >
          <FileText size={18} /> Export PDF
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={28} />
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Community Issues</p>
            <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', color: '#0f172a' }}>{data.totalReports || 0}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Reports By Type</h3>
          </div>
          <div style={{ padding: '24px' }}>
            {data.byType?.length === 0 ? (
              <p style={{ color: '#64748b' }}>No data</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.byType?.map(t => (
                  <li key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{t._id}</span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>Reports By Status</h3>
          </div>
          <div style={{ padding: '24px' }}>
            {data.byStatus?.length === 0 ? (
              <p style={{ color: '#64748b' }}>No data</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {data.byStatus?.map(s => (
                  <li key={s._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>{s._id}</span>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600' }}>{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
