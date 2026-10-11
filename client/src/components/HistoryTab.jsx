import React, { useState, useEffect } from 'react';
import { History, Download, Trash2, ExternalLink, Calendar, Clock, AlertTriangle, Layers } from 'lucide-react';

export default function HistoryTab({ apiBaseUrl = 'http://localhost:5000/api', onLoadPastAnalysis }) {
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = () => {
    setIsLoading(true);
    fetch(`${apiBaseUrl}/history`)
      .then(res => res.json())
      .then(data => {
        setHistoryList(data.history || []);
      })
      .catch(err => console.error('Error fetching history:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [apiBaseUrl]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis record?')) return;

    try {
      await fetch(`${apiBaseUrl}/history/${id}`, { method: 'DELETE' });
      setHistoryList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleExportJson = (id, e) => {
    e.stopPropagation();
    window.open(`${apiBaseUrl}/history/${id}/export/json`, '_blank');
  };

  const handleExportCsv = (id, e) => {
    e.stopPropagation();
    window.open(`${apiBaseUrl}/history/${id}/export/csv`, '_blank');
  };

  return (
    <div id="review-history-view">
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Analysis History</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Persisted code review reports stored securely in SQLite database.
            </p>
          </div>
          <button className="btn-secondary" onClick={fetchHistory} id="refresh-history-btn">
            Refresh Log
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading historical records...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <History size={42} color="#64748b" style={{ margin: '0 auto 0.75rem' }} />
          <h3>No Reviews Recorded Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Run a Static, AI, or Grounded Hybrid Review to generate persisted session reports.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} id="history-items-list">
          {historyList.map(item => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.15rem 1.5rem',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onClick={() => onLoadPastAnalysis(item.id)}
              id={`history-row-${item.id}`}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {item.filename}
                  </span>
                  <span
                    className={`mode-badge ${item.mode}`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {item.mode?.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={13} />
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertTriangle size={13} color="#fbbf24" />
                    {item.total_violations} issues
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} />
                    {item.execution_duration_ms} ms
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  id={`export-history-json-${item.id}`}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  onClick={(e) => handleExportJson(item.id, e)}
                  title="Download JSON report"
                >
                  <Download size={13} />
                  <span>JSON</span>
                </button>

                <button
                  id={`export-history-csv-${item.id}`}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                  onClick={(e) => handleExportCsv(item.id, e)}
                  title="Download CSV table"
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>

                <button
                  id={`delete-history-${item.id}`}
                  className="btn-secondary"
                  style={{ padding: '0.35rem 0.5rem', color: '#fda4af' }}
                  onClick={(e) => handleDelete(item.id, e)}
                  title="Delete from database"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
