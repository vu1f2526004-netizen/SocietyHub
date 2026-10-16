import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ParkingAnalytics = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const res = await api.get('/issues/analytics');
      setData(res.data.data);
    };
    fetchAnalytics();
  }, []);

  if (!data) return <p>Loading Analytics...</p>;

  return (
    <div>
      <h2>Parking / Community Issues Analytics</h2>
      <div style={{ padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem', maxWidth: '300px' }}>
        <h3>Total Reports: {data.totalReports}</h3>
      </div>
      
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ border: '1px solid #ccc', padding: '1rem', flex: 1 }}>
          <h3>By Type</h3>
          <ul>
            {data.byType.map(t => <li key={t._id}>{t._id}: {t.count}</li>)}
          </ul>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '1rem', flex: 1 }}>
          <h3>By Status</h3>
          <ul>
            {data.byStatus.map(s => <li key={s._id}>{s._id}: {s.count}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParkingAnalytics;
