import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';

const MyRepairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [file, setFile] = useState(null);

  const fetchRepairs = async () => {
    const res = await api.get('/repairs/staff');
    setRepairs(res.data.data);
  };

  useEffect(() => { fetchRepairs(); }, []);

  const updateStatus = async (id, status) => {
    const data = new FormData();
    data.append('status', status);
    if (status === 'Completed' && file) {
      data.append('completionPhoto', file);
    }
    await api.patch(`/repairs/staff/${id}/status`, data);
    setFile(null);
    fetchRepairs();
  };

  return (
    <div>
      <h2>My Repair Tasks</h2>
      {repairs.map(r => (
        <div key={r._id} style={{ border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem' }}>
          <h3>{r.title} <small>({r.status})</small></h3>
          <p><strong>Location:</strong> {r.location}</p>
          <p>{r.description}</p>

          {r.status === 'Assigned' && <button onClick={() => updateStatus(r._id, 'In Progress')}>Accept & Start</button>}
          {r.status === 'In Progress' && (
             <div style={{ marginTop: '1rem' }}>
               <FileUpload label="Completion Photo" onFileSelect={setFile} />
               <button onClick={() => updateStatus(r._id, 'Completed')}>Mark Completed</button>
             </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MyRepairs;
