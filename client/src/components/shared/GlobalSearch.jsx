import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Search, 
  X, 
  Loader2, 
  Users, 
  Receipt, 
  MessageSquareWarning, 
  ShieldCheck, 
  IndianRupee,
  ArrowRight 
} from 'lucide-react';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Debounce input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search query when debouncedQuery changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchGlobalSearch = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/global-search', {
          params: { q: debouncedQuery }
        });
        if (isMounted) {
          setResults(res.data?.data || null);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Global search error:', err);
        if (isMounted) {
          setResults(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchGlobalSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation / escape
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleSelect = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  const totalResultsCount = results ? (
    (results.residents?.length || 0) +
    (results.bills?.length || 0) +
    (results.complaints?.length || 0) +
    (results.staff?.length || 0) +
    (results.payments?.length || 0)
  ) : 0;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '280px' }} className="md-flex">
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          {loading ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#0284c7' }} />
          ) : (
            <Search size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() && results) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Global search (residents, bills...)"
          style={{
            padding: '9px 34px 9px 38px',
            borderRadius: '9999px',
            border: '1px solid var(--sh-slate-200)',
            backgroundColor: 'var(--sh-slate-100)',
            fontSize: '0.85rem',
            width: '100%',
            outline: 'none',
            color: 'var(--sh-slate-900)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.backgroundColor = 'var(--sh-white)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.15)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'var(--sh-slate-200)';
            e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: 'var(--sh-slate-400)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '50%'
            }}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Dropdown Results */}
      {isOpen && query.trim() && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '380px',
          maxHeight: '440px',
          overflowY: 'auto',
          backgroundColor: 'var(--sh-white)',
          borderRadius: '12px',
          boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--sh-slate-200)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading && !results && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--sh-slate-500)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#10b981' }} />
              <span>Searching society records...</span>
            </div>
          )}

          {!loading && totalResultsCount === 0 && (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--sh-slate-500)' }}>
              <Search size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
              <div style={{ fontWeight: '600', color: 'var(--sh-slate-900)', fontSize: '0.9rem' }}>No matching records found</div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--sh-slate-400)' }}>
                No residents, bills, complaints, staff, or payments match "{query}"
              </p>
            </div>
          )}

          {results && totalResultsCount > 0 && (
            <div style={{ padding: '8px 0' }}>
              {/* Residents Section */}
              {results.residents?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sh-slate-100)' }}>
                    <Users size={14} color="#10b981" />
                    <span>Residents ({results.residents.length})</span>
                  </div>
                  {results.residents.map(r => (
                    <div
                      key={r._id}
                      onClick={() => handleSelect(`/admin/residents?search=${encodeURIComponent(r.name || r.flatNumber || '')}`)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--sh-slate-100)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--sh-slate-900)' }}>{r.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                          Flat: <span style={{ fontWeight: '600', color: '#10b981' }}>{r.flatNumber || 'Unassigned'}</span> • {r.email}
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--sh-slate-400)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Maintenance Bills Section */}
              {results.bills?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sh-slate-100)' }}>
                    <Receipt size={14} color="#16a34a" />
                    <span>Bills & Fees ({results.bills.length})</span>
                  </div>
                  {results.bills.map(b => (
                    <div
                      key={b._id}
                      onClick={() => handleSelect(`/admin/maintenance?search=${encodeURIComponent(b.month || b.flatNumber || b.title || '')}`)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--sh-slate-100)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--sh-slate-900)' }}>
                          {b.title || `${b.month} Maintenance`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                          Flat: {b.flatNumber || b.residentId?.flatNumber || '—'} • ₹{Number(b.amount || 0).toLocaleString()} • <span style={{ color: b.status === 'Paid' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>{b.status}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--sh-slate-400)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Complaints Section */}
              {results.complaints?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sh-slate-100)' }}>
                    <MessageSquareWarning size={14} color="#d97706" />
                    <span>Complaints ({results.complaints.length})</span>
                  </div>
                  {results.complaints.map(c => (
                    <div
                      key={c._id}
                      onClick={() => handleSelect(`/admin/complaints?search=${encodeURIComponent(c.title || '')}`)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--sh-slate-100)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--sh-slate-900)' }}>{c.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                          {c.category} • Flat {c.createdBy?.flatNumber || '—'} • <span style={{ fontWeight: '600' }}>{c.status}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--sh-slate-400)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Staff Section */}
              {results.staff?.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sh-slate-100)' }}>
                    <ShieldCheck size={14} color="#6366f1" />
                    <span>Security Staff ({results.staff.length})</span>
                  </div>
                  {results.staff.map(s => (
                    <div
                      key={s._id}
                      onClick={() => handleSelect(`/admin/staff?search=${encodeURIComponent(s.name || '')}`)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--sh-slate-100)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--sh-slate-900)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                          Phone: {s.mobile || s.phone || '—'} • Role: {s.role}
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--sh-slate-400)" />
                    </div>
                  ))}
                </div>
              )}

              {/* Payments Section */}
              {results.payments?.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ padding: '6px 14px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--sh-slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--sh-slate-100)' }}>
                    <IndianRupee size={14} color="#059669" />
                    <span>Payments ({results.payments.length})</span>
                  </div>
                  {results.payments.map(p => (
                    <div
                      key={p._id}
                      onClick={() => handleSelect(`/admin/payments?search=${encodeURIComponent(p.receiptNumber || p.razorpayPaymentId || '')}`)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--sh-slate-100)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--sh-slate-100)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--sh-slate-900)' }}>
                          Receipt: {p.receiptNumber || p.razorpayPaymentId || 'Payment'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sh-slate-500)' }}>
                          Flat {p.residentId?.flatNumber || '—'} • ₹{Number(p.amount || 0).toLocaleString()} • <span style={{ color: p.status === 'Success' ? '#16a34a' : '#d97706', fontWeight: '600' }}>{p.status}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--sh-slate-400)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
