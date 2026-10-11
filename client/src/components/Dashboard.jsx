import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  GitMerge,
  Star,
  Clock,
  Layers
} from 'lucide-react';

export default function Dashboard({ analysisResult, onRateFinding, onExportJson, onExportCsv }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [expandedCards, setExpandedCards] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const findings = analysisResult?.findings || [];

  // Toggle card expansion
  const toggleCard = (id) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy code snippet to clipboard
  const handleCopyCode = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Severity counts
  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    findings.forEach(f => {
      const sev = (f.severity || 'MEDIUM').toUpperCase();
      if (counts[sev] !== undefined) counts[sev]++;
    });
    return counts;
  }, [findings]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set();
    findings.forEach(f => { if (f.category) set.add(f.category); });
    return Array.from(set);
  }, [findings]);

  // Attribution counts
  const attributionCounts = useMemo(() => {
    let hybrid = 0;
    let staticOnly = 0;
    let aiOnly = 0;
    findings.forEach(f => {
      if (f.source === 'HYBRID_CONFIRMED') hybrid++;
      else if (f.source === 'STATIC_ONLY') staticOnly++;
      else if (f.source === 'AI_ONLY') aiOnly++;
    });
    return { hybrid, staticOnly, aiOnly };
  }, [findings]);

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
      const matchesSearch = searchTerm === '' ||
        (f.rule && f.rule.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.message && f.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.category && f.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeverity = selectedSeverity === 'ALL' || f.severity === selectedSeverity;
      const matchesCategory = selectedCategory === 'ALL' || f.category === selectedCategory;
      const matchesSource = selectedSource === 'ALL' || f.source === selectedSource;

      return matchesSearch && matchesSeverity && matchesCategory && matchesSource;
    });
  }, [findings, searchTerm, selectedSeverity, selectedCategory, selectedSource]);

  if (!analysisResult) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }} id="empty-dashboard-placeholder">
        <Layers size={48} color="#64748b" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Analysis Results Yet</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
          Select or paste Java source code in the <strong>Code Input</strong> workspace and execute Static, AI, or Grounded Hybrid Review to view findings.
        </p>
      </div>
    );
  }

  return (
    <div id="results-dashboard-view">
      {/* Top Metrics KPI Cards */}
      <div className="kpi-row" id="dashboard-kpi-summary">
        {/* Total Issues */}
        <div className="kpi-card" id="kpi-total-issues">
          <div className="kpi-header">
            <span>TOTAL ISSUES DETECTED</span>
            <AlertTriangle size={18} color="#fbbf24" />
          </div>
          <div className="kpi-value">{analysisResult.totalViolations || findings.length}</div>
          <div className="kpi-subtext">File: {analysisResult.fileName || 'SubmittedCode.java'}</div>
        </div>

        {/* Severity Distribution */}
        <div className="kpi-card" id="kpi-severity-distribution">
          <div className="kpi-header">
            <span>SEVERITY PROFILE</span>
            <Layers size={18} color="#f43f5e" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
            <span className="sev-pill CRITICAL">Crit: {severityCounts.CRITICAL}</span>
            <span className="sev-pill HIGH">High: {severityCounts.HIGH}</span>
            <span className="sev-pill MEDIUM">Med: {severityCounts.MEDIUM}</span>
            <span className="sev-pill LOW">Low: {severityCounts.LOW}</span>
          </div>
          <div className="kpi-subtext">Mapped according to PMD/Sonar standards</div>
        </div>

        {/* Paradigm Attribution */}
        <div className="kpi-card" id="kpi-attribution-breakdown">
          <div className="kpi-header">
            <span>SOURCE ATTRIBUTION</span>
            <GitMerge size={18} color="#34d399" />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
            <span className="source-tag HYBRID_CONFIRMED">Hybrid: {attributionCounts.hybrid}</span>
            <span className="source-tag STATIC_ONLY">Static: {attributionCounts.staticOnly}</span>
            <span className="source-tag AI_ONLY">AI: {attributionCounts.aiOnly}</span>
          </div>
          <div className="kpi-subtext">Grounded cross-paradigm evidence</div>
        </div>

        {/* Execution Duration */}
        <div className="kpi-card" id="kpi-execution-time">
          <div className="kpi-header">
            <span>EXECUTION LATENCY</span>
            <Clock size={18} color="#38bdf8" />
          </div>
          <div className="kpi-value">{analysisResult.executionDurationMs || 0}<span style={{ fontSize: '1rem', fontWeight: 500 }}> ms</span></div>
          <div className="kpi-subtext">Mode: {analysisResult.mode?.toUpperCase()}</div>
        </div>
      </div>

      {/* Summary Banner if available */}
      {analysisResult.summary && (
        <div
          id="analysis-summary-banner"
          className="glass-card"
          style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-indigo)' }}
        >
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="#818cf8" />
            <span>Analysis Architecture Summary</span>
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            {analysisResult.summary}
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filters-bar" id="dashboard-filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748b" />
          <input
            id="filter-search-input"
            type="text"
            className="search-input"
            placeholder="Search by rule, message, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Severity Filter */}
          <select
            id="filter-severity-select"
            className="filter-select"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          {/* Category Filter */}
          <select
            id="filter-category-select"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            id="filter-source-select"
            className="filter-select"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="ALL">All Sources</option>
            <option value="HYBRID_CONFIRMED">Hybrid Grounded</option>
            <option value="STATIC_ONLY">Static (PMD)</option>
            <option value="AI_ONLY">AI Semantic</option>
          </select>

          {/* Export Actions */}
          <button
            id="export-json-button"
            className="btn-secondary"
            onClick={onExportJson}
            title="Export complete analysis report as JSON"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>

          <button
            id="export-csv-button"
            className="btn-secondary"
            onClick={onExportCsv}
            title="Export findings table as CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Findings List */}
      <div className="findings-container" id="findings-cards-list">
        {filteredFindings.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem' }}>No Violations Found Matching Filter</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              The current filter criteria returned zero findings.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedCards[finding.id] !== false; // expanded by default

            return (
              <div key={finding.id} className="finding-card" id={`finding-card-${finding.id}`}>
                {/* Clickable Header */}
                <div
                  className="finding-header"
                  onClick={() => toggleCard(finding.id)}
                  id={`finding-header-${finding.id}`}
                >
                  <div className="finding-title-group">
                    <span className={`sev-pill ${finding.severity}`}>{finding.severity}</span>
                    <span className="finding-rule">{finding.rule}</span>
                    <span className="finding-line-badge">Line {finding.line}{finding.endLine && finding.endLine !== finding.line ? `-${finding.endLine}` : ''}</span>
                    <span className={`source-tag ${finding.source}`}>{finding.sourceLabel || finding.source}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{finding.category}</span>
                    {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="finding-body" id={`finding-body-${finding.id}`}>
                    {/* Message & Why it matters */}
                    <div>
                      <div className="finding-section-title">Issue Description</div>
                      <p className="finding-text">{finding.message}</p>
                    </div>

                    {finding.whyItMatters && (
                      <div>
                        <div className="finding-section-title">Why This Issue Matters</div>
                        <p className="finding-text" style={{ color: '#cbd5e1' }}>
                          {finding.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* Suggested Refactoring Advice */}
                    {finding.suggestedFix && (
                      <div>
                        <div className="finding-section-title">Actionable Recommendation</div>
                        <p className="finding-text" style={{ color: '#38bdf8' }}>
                          {finding.suggestedFix}
                        </p>
                      </div>
                    )}

                    {/* Code Snippet Comparison (Original vs Proposed Fix) */}
                    {(finding.originalSnippet || finding.snippet || finding.proposedSnippet) && (
                      <div>
                        <div className="finding-section-title">Code Improvement Recommendation</div>
                        <div className="diff-container">
                          {/* Original Snippet */}
                          <div className="diff-pane">
                            <div className="diff-pane-header">
                              <span style={{ color: '#fda4af' }}>Original Code (Line {finding.line})</span>
                            </div>
                            <pre className="diff-code">{finding.originalSnippet || finding.snippet || '// Snippet not available'}</pre>
                          </div>

                          {/* Proposed Refactored Snippet */}
                          <div className="diff-pane">
                            <div className="diff-pane-header">
                              <span style={{ color: '#6ee7b7' }}>Proposed Refactoring</span>
                              {finding.proposedSnippet && (
                                <button
                                  id={`copy-fix-btn-${finding.id}`}
                                  className="btn-secondary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyCode(finding.id, finding.proposedSnippet);
                                  }}
                                  title="Copy suggested code fix"
                                >
                                  <Copy size={12} />
                                  <span>{copiedId === finding.id ? 'Copied!' : 'Copy Fix'}</span>
                                </button>
                              )}
                            </div>
                            <pre className="diff-code">
                              {finding.proposedSnippet || '// AI fix snippet available in Hybrid/AI mode with API key configured.'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expected Quality Benefit */}
                    {finding.expectedBenefit && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase' }}>
                            Expected Benefit:
                          </span>{' '}
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {finding.expectedBenefit}
                          </span>
                        </div>

                        {/* Qualitative Human Feedback Button */}
                        <button
                          id={`rate-finding-btn-${finding.id}`}
                          className="btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => onRateFinding(finding)}
                          title="Rate explanation clarity and actionability for research dataset"
                        >
                          <Star size={12} color="#fbbf24" />
                          <span>Human Evaluation</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
