import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Vote, Plus, BarChart3, CheckCircle, Clock } from 'lucide-react';

const VotingManagement = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ question: '', option1: '', option2: '', closingDate: '', status: 'Active' });

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const res = await api.get('/polls');
      setPolls(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPolls(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        question: formData.question,
        options: [{ text: formData.option1 }, { text: formData.option2 }],
        openingDate: new Date(),
        closingDate: formData.closingDate,
        status: formData.status
      };
      await api.post('/polls/admin', payload);
      alert('Poll created successfully');
      setShowForm(false);
      setFormData({ question: '', option1: '', option2: '', closingDate: '', status: 'Active' });
      fetchPolls();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create poll');
    }
  };

  const publishResult = async (id) => {
    const decision = prompt("Enter the final decision summary:");
    if (!decision) return;
    try {
      await api.post(`/polls/admin/${id}/publish-result`, { decision });
      fetchPolls();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to publish');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading polls...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Voting & Polls</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Create polls and publish results to the community</p>
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
          {showForm ? <Vote size={18} /> : <Plus size={18} />}
          {showForm ? 'View Polls' : 'Create Poll'}
        </button>
      </div>

      {showForm ? (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', color: '#0f172a' }}>Create New Poll</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Question / Topic*</label>
              <input type="text" required value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Which color to paint the lobby?" />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Option 1*</label>
                <input type="text" required value={formData.option1} onChange={e => setFormData({...formData, option1: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., Blue" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Option 2*</label>
                <input type="text" required value={formData.option2} onChange={e => setFormData({...formData, option2: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} placeholder="E.g., White" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#334155' }}>Closing Date & Time*</label>
              <input type="datetime-local" required value={formData.closingDate} onChange={e => setFormData({...formData, closingDate: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              Create Poll
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {polls.length === 0 ? (
             <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
               <Vote size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
               <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No polls found</h3>
               <p style={{ margin: 0 }}>Create a poll to gather community feedback.</p>
             </div>
          ) : (
            polls.map(poll => {
              const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.voteCount || 0), 0);
              
              return (
                <div key={poll._id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{poll.question}</h3>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Ends: {new Date(poll.closingDate).toLocaleString()}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BarChart3 size={14} /> {totalVotes} Total Votes</span>
                      </div>
                    </div>
                    <span style={{ 
                      backgroundColor: poll.status === 'Active' ? '#dcfce7' : '#f1f5f9', 
                      color: poll.status === 'Active' ? '#166534' : '#475569', 
                      padding: '4px 12px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' 
                    }}>
                      {poll.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {poll.options.map(opt => {
                      const percentage = totalVotes === 0 ? 0 : Math.round(((opt.voteCount || 0) / totalVotes) * 100);
                      return (
                        <div key={opt._id} style={{ position: 'relative', backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percentage}%`, backgroundColor: '#dbeafe', zIndex: 0, transition: 'width 0.5s ease-out' }}></div>
                          <div style={{ position: 'relative', zIndex: 1, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '500', color: '#334155', fontSize: '0.875rem' }}>{opt.text}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{opt.voteCount || 0} votes</span>
                              <span style={{ fontWeight: '600', color: '#3b82f6', fontSize: '0.875rem', width: '40px', textAlign: 'right' }}>{percentage}%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {poll.status === 'Active' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                      <button 
                        onClick={() => publishResult(poll._id)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                          backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', 
                          fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' 
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#2563eb'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                      >
                        <CheckCircle size={16} /> Publish Decision
                      </button>
                    </div>
                  )}
                  {poll.status === 'Published' && poll.finalDecision && (
                     <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.875rem' }}>
                       <strong>Final Decision:</strong> {poll.finalDecision}
                     </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  );
};

export default VotingManagement;
