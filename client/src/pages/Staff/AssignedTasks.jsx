import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import FileUpload from '../../components/shared/FileUpload';
import { CheckSquare, Wrench, MessageSquareWarning, MapPin, Clock, CalendarDays, Camera, MessageSquare, Play, CheckCircle } from 'lucide-react';

const AssignedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Update state variables for Task Details modal
  const [updateNotes, setUpdateNotes] = useState('');
  const [completionFile, setCompletionFile] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [complaintsRes, repairsRes] = await Promise.all([
        api.get('/complaints/staff/assigned'),
        api.get('/repairs/staff')
      ]);
      
      const compTasks = complaintsRes.data.data.map(t => ({ ...t, taskType: 'Complaint' }));
      const repTasks = repairsRes.data.data.map(t => ({ ...t, taskType: 'Repair' }));
      
      const allTasks = [...compTasks, ...repTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTasks(allTasks);
      
      // Update selected task if it is currently open
      if (selectedTask) {
         const updated = allTasks.find(t => t._id === selectedTask._id);
         if (updated) setSelectedTask(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateTaskStatus = async (e, id, type, status) => {
    e.preventDefault();
    try {
      const endpoint = type === 'Complaint' ? `/complaints/staff/${id}/status` : `/repairs/staff/${id}/status`;
      const data = new FormData();
      data.append('status', status);
      if (updateNotes) data.append('staffNotes', updateNotes);
      if (status === 'Completed' && completionFile) {
        data.append(type === 'Complaint' ? 'completionPhoto' : 'completionPhotoUrl', completionFile);
      }
      
      await api.patch(endpoint, data);
      setUpdateNotes('');
      setCompletionFile(null);
      fetchTasks();
      if (status === 'Completed') setSelectedTask(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Assigned': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'In Progress': return { bg: '#dbeafe', text: '#2563eb' };
      case 'Completed': return { bg: '#dcfce7', text: '#166534' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading tasks...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>My Assigned Tasks</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>View and update complaints and repair tasks assigned to you</p>
      </div>

      {selectedTask ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>
                  {selectedTask.taskType}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: selectedTask.priority === 'High' ? '#ef4444' : '#64748b' }}>
                  {selectedTask.priority} Priority
                </span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0' }}>{selectedTask.title}</h3>
              <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '0.875rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16} /> {selectedTask.location}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={16} /> Created: {new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                {selectedTask.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706' }}><Clock size={16} /> Deadline: {new Date(selectedTask.deadline).toLocaleDateString()}</span>}
              </div>
            </div>
            <button onClick={() => setSelectedTask(null)} style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
              Back to List
            </button>
          </div>

          <div style={{ padding: '24px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#0f172a', margin: '0 0 12px 0' }}>Description</h4>
              <p style={{ margin: 0, color: '#334155', fontSize: '1rem', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                {selectedTask.description}
              </p>
              
              {selectedTask.adminNotes && (
                <div style={{ marginTop: '20px', backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '700', color: '#b45309', margin: '0 0 8px 0' }}>Admin Instructions</h4>
                  <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem' }}>{selectedTask.adminNotes}</p>
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 300px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', margin: '0 0 20px 0' }}>Task Action</h4>
              
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Current Status</span>
                <span style={{ display: 'inline-block', backgroundColor: getStatusColor(selectedTask.status).bg, color: getStatusColor(selectedTask.status).text, padding: '6px 16px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '700' }}>
                  {selectedTask.status}
                </span>
              </div>

              {selectedTask.status !== 'Completed' && (
                <form>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <MessageSquare size={16} /> Work Notes (Optional)
                    </label>
                    <textarea 
                      value={updateNotes} 
                      onChange={e => setUpdateNotes(e.target.value)} 
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', minHeight: '80px', boxSizing: 'border-box' }} 
                      placeholder="Add notes about your progress..."
                    />
                  </div>

                  {selectedTask.status === 'In Progress' && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Camera size={16} /> Completion Photo (Optional)
                      </label>
                      <div style={{ padding: '12px', border: '2px dashed #cbd5e1', borderRadius: '8px', backgroundColor: 'white' }}>
                        <FileUpload onFileSelect={setCompletionFile} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px' }}>
                    {selectedTask.status === 'Assigned' && (
                      <button 
                        onClick={(e) => updateTaskStatus(e, selectedTask._id, selectedTask.taskType, 'In Progress')}
                        style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <Play size={18} /> Accept & Start
                      </button>
                    )}
                    {selectedTask.status === 'In Progress' && (
                      <button 
                        onClick={(e) => updateTaskStatus(e, selectedTask._id, selectedTask.taskType, 'Completed')}
                        style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={18} /> Mark Completed
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {tasks.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <CheckSquare size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No assigned tasks</h3>
              <p style={{ margin: 0 }}>You're all caught up!</p>
            </div>
          ) : (
            tasks.map(task => {
              const statusColor = getStatusColor(task.status);
              const TaskIcon = task.taskType === 'Repair' ? Wrench : MessageSquareWarning;
              
              return (
                <div key={task._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#475569' }}>
                          <TaskIcon size={18} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>{task.taskType}</span>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{task.title}</h3>
                        </div>
                      </div>
                      <span style={{ backgroundColor: statusColor.bg, color: statusColor.text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {task.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#64748b', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={16} /> {task.location}
                      </div>
                      {task.deadline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16} /> Deadline: {new Date(task.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px', display: 'flex', gap: '12px', backgroundColor: '#f8fafc', marginTop: 'auto' }}>
                    <button 
                      onClick={() => setSelectedTask(task)}
                      style={{ flex: 1, padding: '10px', backgroundColor: 'white', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                      onMouseOut={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                    >
                      View Details
                    </button>
                    {task.status === 'Assigned' && (
                      <button 
                        onClick={(e) => updateTaskStatus(e, task._id, task.taskType, 'In Progress')}
                        style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
                      >
                        Start
                      </button>
                    )}
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

export default AssignedTasks;
