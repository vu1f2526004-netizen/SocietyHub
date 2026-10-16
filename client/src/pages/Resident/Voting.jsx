import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Vote, Clock, CheckCircle, BarChart3, Info } from 'lucide-react';

const Voting = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleVote = async (pollId, optionId) => {
    try {
      await api.post(`/polls/${pollId}/vote`, { optionId });
      alert('Vote cast successfully!');
      fetchPolls();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to vote');
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Active': return { bg: '#dcfce7', text: '#166534' };
      case 'Published': return { bg: '#e0e7ff', text: '#4338ca' };
      case 'Closed': return { bg: '#f1f5f9', text: '#475569' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading polls...</div></div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Society Voting & Decisions</h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Participate in community polls and view decisions</p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {polls.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Vote size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No active polls</h3>
            <p style={{ margin: 0 }}>There are no polls available for voting right now.</p>
          </div>
        ) : (
          polls.map(poll => {
            const { bg, text } = getStatusDisplay(poll.status);
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
            
            return (
              <div key={poll._id} style={{ 
                backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', 
                border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700', color: '#0f172a', maxWidth: '80%' }}>{poll.question}</h3>
                  <span style={{ backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {poll.status}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} />
                    <span>Closes: {new Date(poll.closingDate).toLocaleString()}</span>
                  </div>
                  {poll.status === 'Published' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BarChart3 size={16} />
                      <span>{totalVotes} Total Votes</span>
                    </div>
                  )}
                </div>

                {poll.status === 'Published' ? (
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: '600', color: '#334155' }}>Final Results</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {poll.options.map(opt => {
                        const percentage = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                        return (
                          <div key={opt._id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>
                              <span>{opt.text}</span>
                              <span>{opt.voteCount} votes ({percentage}%)</span>
                            </div>
                            <div style={{ width: '100%', backgroundColor: '#e2e8f0', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ width: `${percentage}%`, backgroundColor: '#3b82f6', height: '100%', borderRadius: '9999px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {poll.decision && (
                      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <strong style={{ display: 'block', marginBottom: '4px' }}>Admin Decision</strong>
                          {poll.decision}
                        </div>
                      </div>
                    )}
                  </div>
                ) : poll.status === 'Active' && !poll.hasVoted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {poll.options.map(opt => (
                      <button 
                        key={opt._id} 
                        onClick={() => handleVote(poll._id, opt._id)}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '16px', backgroundColor: 'white', border: '1px solid #cbd5e1', 
                          borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', color: '#334155',
                          fontWeight: '500', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.backgroundColor = 'white';
                        }}
                      >
                        {opt.text}
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #cbd5e1' }}></div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '500' }}>
                    <CheckCircle size={18} />
                    You have successfully voted in this poll. Results will be visible once published by the Admin.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Voting;
