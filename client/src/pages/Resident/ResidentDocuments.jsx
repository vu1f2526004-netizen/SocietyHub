import React, { useState, useEffect, useCallback } from 'react';
import api, { getAuthToken, getApiBaseUrl } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import RefreshButton from '../../components/shared/RefreshButton';
import { FileText, Download, Folder, File, ExternalLink, Calendar, Search, X } from 'lucide-react';

const ResidentDocuments = () => {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDocs = useCallback(async (isRefresh = false, searchOverride) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const activeSearch = searchOverride !== undefined ? searchOverride : debouncedSearch;
      const params = {};
      if (activeSearch && activeSearch.trim()) params.search = activeSearch.trim();

      const res = await api.get('/documents', { params });
      setDocs(res.data?.data || []);
      if (isRefresh) {
        toast.success('Documents updated');
      }
    } catch (err) {
      console.error(err);
      if (isRefresh) {
        toast.error('Failed to refresh documents');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const categories = ['All', ...new Set(docs.map(d => d.category))];
  
  const filteredDocs = activeCategory === 'All' 
    ? docs 
    : docs.filter(d => d.category === activeCategory);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Rules': return { color: '#ef4444', bg: '#fef2f2' };
      case 'Financial': return { color: '#10b981', bg: '#ecfdf5' };
      case 'Meeting Minutes': return { color: '#3b82f6', bg: '#eff6ff' };
      case 'Notices': return { color: '#f59e0b', bg: '#fffbeb' };
      default: return { color: '#6366f1', bg: '#eef2ff' };
    }
  };

  const getDocViewUrl = (doc) => {
    if (!doc) return '#';
    if (doc.url && /\.(jpg|jpeg|png|webp)$/i.test(doc.url)) {
      return doc.url;
    }
    const token = getAuthToken() || localStorage.getItem('token');
    const apiBase = getApiBaseUrl();
    return `${apiBase}/documents/${doc._id}/file?token=${encodeURIComponent(token || '')}`;
  };

  if (loading && docs.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loader">Loading documents...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>Society Documents</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Access important community files and notices</p>
        </div>
        <RefreshButton onRefresh={() => fetchDocs(true)} loading={refreshing} title="Refresh documents" />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '11px', left: '12px' }} />
          <input
            type="text"
            placeholder="Search documents by title or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
                fetchDocs(false, '');
              }}
              style={{
                position: 'absolute',
                top: '50%',
                right: '10px',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTerm && (
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Found {filteredDocs.length} document{filteredDocs.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: activeCategory === cat ? '#0f172a' : 'white',
              color: activeCategory === cat ? 'white' : '#64748b',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: activeCategory === cat ? '0 4px 6px -1px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {filteredDocs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', backgroundColor: 'white', padding: '48px', textAlign: 'center', color: '#64748b', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <Folder size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155', margin: '0 0 8px 0' }}>No documents found</h3>
            <p style={{ margin: 0 }}>There are no documents in this category.</p>
          </div>
        ) : (
          filteredDocs.map(doc => {
            const { color, bg } = getCategoryIcon(doc.category);
            return (
              <div key={doc._id} style={{ 
                backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', 
                padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
              }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <File size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', lineHeight: 1.3 }}>{doc.title}</h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: color, backgroundColor: bg, padding: '2px 8px', borderRadius: '9999px' }}>
                      {doc.category}
                    </span>
                  </div>
                </div>
                
                <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#475569', flex: 1, lineHeight: 1.5 }}>
                  {doc.description}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <Calendar size={14} />
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                  
                  <a 
                    href={getDocViewUrl(doc)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                      backgroundColor: '#f8fafc', color: '#334155', borderRadius: '8px', 
                      textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500', border: '1px solid #e2e8f0',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = '#0f172a';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    <ExternalLink size={16} /> Open
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ResidentDocuments;
