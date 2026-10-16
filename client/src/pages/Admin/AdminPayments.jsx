import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Receipt, Search, Filter, IndianRupee, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await api.get('/payments/admin');
        setPayments(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'Success': return { bg: '#dcfce7', text: '#166534', icon: CheckCircle };
      case 'Pending': return { bg: '#fef3c7', text: '#d97706', icon: Clock };
      case 'Failed': return { bg: '#fee2e2', text: '#dc2626', icon: AlertCircle };
      default: return { bg: '#f1f5f9', text: '#475569', icon: Receipt };
    }
  };

  const filteredPayments = payments.filter(p => {
    const searchString = `${p.residentId?.name} ${p.residentId?.flatNumber} ${p.receiptNumber} ${p.billId?.month}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="loader">Loading payments...</div></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Payment Records</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Track all maintenance and fee payments</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by resident, flat, receipt, or month..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative', minWidth: '200px' }}>
          <Filter size={18} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '12px' }} />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: 'white', appearance: 'none', boxSizing: 'border-box' }}
          >
            <option value="All">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {filteredPayments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <Receipt size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No payments found</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Resident</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Bill Month</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Receipt / Order ID</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Date</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Amount</th>
                  <th style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(p => {
                  const { bg, text, icon: StatusIcon } = getStatusDisplay(p.status);
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>{p.residentId?.name || 'Unknown'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Flat: {p.residentId?.flatNumber || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#334155', fontWeight: '500' }}>
                        {p.billId?.month || 'Unknown'}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: '500' }}>{p.receiptNumber || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{p.razorpayOrderId}</div>
                      </td>
                      <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: '#64748b' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '600', color: '#0f172a', fontSize: '0.875rem' }}>
                          <IndianRupee size={14} /> {p.amount}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          backgroundColor: bg, color: text, padding: '4px 10px', borderRadius: '9999px', 
                          fontSize: '0.75rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' 
                        }}>
                          <StatusIcon size={12} />
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPayments;
