import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  Shield,
  Sparkles,
  Play,
  RotateCw,
  UploadCloud,
  CheckCircle,
  FileText,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';

export default function EvaluationTab({ apiBaseUrl = 'http://localhost:5000/api' }) {
  const [evalData, setEvalData] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [humanSummary, setHumanSummary] = useState(null);
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [isRunningConsistency, setIsRunningConsistency] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  // Load fixtures and human ratings on mount
  useEffect(() => {
    fetch(`${apiBaseUrl}/evaluation/fixtures`)
      .then(res => res.json())
      .then(data => setFixtures(data.fixtures || []))
      .catch(err => console.error('Error fetching fixtures:', err));

    fetch(`${apiBaseUrl}/evaluation/human`)
      .then(res => res.json())
      .then(data => setHumanSummary(data))
      .catch(err => console.error('Error fetching human summary:', err));
  }, [apiBaseUrl]);

  // Execute comparative evaluation
  const handleRunBenchmark = async () => {
    setIsRunningBench(true);
    try {
      const storedKey = localStorage.getItem('ai_api_key') || '';
      const storedProvider = localStorage.getItem('ai_provider') || 'gemini';

      const res = await fetch(`${apiBaseUrl}/evaluation/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': storedKey,
          'x-ai-provider': storedProvider
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      if (data.success) {
        setEvalData(data);
      } else {
        alert(`Evaluation error: ${data.error || 'Failed to complete benchmark'}`);
      }
    } catch (err) {
      alert(`Benchmark execution failed: ${err.message}`);
    } finally {
      setIsRunningBench(false);
    }
  };

  // Run Consistency Experiment (repeated runs at T=0)
  const handleRunConsistency = async () => {
    setIsRunningConsistency(true);
    try {
      const storedKey = localStorage.getItem('ai_api_key') || '';
      const sampleCode = `package samples;
public class GodOrderManager {
    public static class OrderData {
        public String id; public double total;
    }
    public void process(OrderData o) {
        if (o.total > 100) { o.total *= 0.9; }
    }
}`;

      const res = await fetch(`${apiBaseUrl}/evaluation/consistency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': storedKey
        },
        body: JSON.stringify({
          sourceCode: sampleCode,
          iterations: 3
        })
      });

      const data = await res.json();
      if (data.success) {
        setConsistencyResult(data);
      } else {
        alert(`Consistency error: ${data.error}`);
      }
    } catch (err) {
      alert(`Consistency experiment failed: ${err.message}`);
    } finally {
      setIsRunningConsistency(false);
    }
  };

  // Import custom dataset
  const handleImportDataset = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/evaluation/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: importContent, format: 'json' })
      });

      const data = await res.json();
      if (data.success) {
        setImportMessage(`Imported ${data.sampleCount} benchmark samples!`);
        setShowImportModal(false);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div id="research-evaluation-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Benchmark Execution Card */}
      <div className="glass-card" id="benchmark-control-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Empirical Evaluation: Static vs. AI vs. Hybrid
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Evaluates detection capability, precision, recall, and runtime latency across developer-labelled Java samples.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              id="import-dataset-button"
              className="btn-secondary"
              onClick={() => setShowImportModal(true)}
            >
              <UploadCloud size={16} />
              <span>Import Dataset (JSON/CSV)</span>
            </button>

            <button
              id="run-benchmark-evaluation-btn"
              className="btn-primary"
              style={{ width: 'auto' }}
              onClick={handleRunBenchmark}
              disabled={isRunningBench}
            >
              {isRunningBench ? (
                <>
                  <div className="spinner"></div>
                  <span>Benchmarking Runtimes...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Execute Comparative Benchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {importMessage && (
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
            {importMessage}
          </div>
        )}

        {/* Comparative Metrics Table */}
        {evalData ? (
          <div style={{ overflowX: 'auto' }} id="comparative-metrics-table-wrapper">
            <table className="benchmark-table" id="research-metrics-table">
              <thead>
                <tr>
                  <th>Analysis Approach</th>
                  <th>Samples</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1-Score</th>
                  <th>False Positive Rate (FPR)</th>
                  <th>Accuracy</th>
                  <th>Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {/* Static PMD Row */}
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Shield size={16} color="#fbbf24" />
                      <span>Static Analysis (PMD 7)</span>
                    </div>
                  </td>
                  <td>{evalData.staticAnalysis?.totalSamples || 0}</td>
                  <td style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {evalData.staticAnalysis?.metrics?.precision !== 'Not evaluated'
                      ? `${(evalData.staticAnalysis.metrics.precision * 100).toFixed(1)}%`
                      : 'Not evaluated'}
                  </td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>
                    {evalData.staticAnalysis?.metrics?.recall !== 'Not evaluated'
                      ? `${(evalData.staticAnalysis.metrics.recall * 100).toFixed(1)}%`
                      : 'Not evaluated'}
                  </td>
                  <td style={{ color: '#a78bfa', fontWeight: 700 }}>
                    {evalData.staticAnalysis?.metrics?.f1Score !== 'Not evaluated'
                      ? evalData.staticAnalysis.metrics.f1Score
                      : 'Not evaluated'}
                  </td>
                  <td>
                    {evalData.staticAnalysis?.metrics?.falsePositiveRate !== 'Not evaluated'
                      ? `${(evalData.staticAnalysis.metrics.falsePositiveRate * 100).toFixed(1)}%`
                      : 'Not evaluated'}
                  </td>
                  <td>
                    {evalData.staticAnalysis?.metrics?.accuracy !== 'Not evaluated'
                      ? `${(evalData.staticAnalysis.metrics.accuracy * 100).toFixed(1)}%`
                      : 'Not evaluated'}
                  </td>
                  <td>{evalData.staticAnalysis?.averageRuntimeMs} ms</td>
                </tr>

                {/* AI Review Row */}
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Sparkles size={16} color="#c084fc" />
                      <span>AI-Only Review (LLM)</span>
                    </div>
                  </td>
                  <td>{evalData.aiAnalysis?.totalSamples || 0}</td>
                  <td>
                    {evalData.aiAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.aiAnalysis?.metrics?.precision * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {evalData.aiAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.aiAnalysis?.metrics?.recall * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {evalData.aiAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : evalData.aiAnalysis?.metrics?.f1Score}
                  </td>
                  <td>
                    {evalData.aiAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.aiAnalysis?.metrics?.falsePositiveRate * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {evalData.aiAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.aiAnalysis?.metrics?.accuracy * 100).toFixed(1)}%`}
                  </td>
                  <td>{evalData.aiAnalysis?.averageRuntimeMs ? `${evalData.aiAnalysis.averageRuntimeMs} ms` : 'N/A'}</td>
                </tr>

                {/* Grounded Hybrid Row */}
                <tr style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#34d399' }}>
                      <GitMerge size={16} color="#34d399" />
                      <span>Grounded Hybrid Analysis</span>
                    </div>
                  </td>
                  <td>{evalData.hybridAnalysis?.totalSamples || 0}</td>
                  <td style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {evalData.hybridAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.hybridAnalysis?.metrics?.precision * 100).toFixed(1)}%`}
                  </td>
                  <td style={{ color: '#34d399', fontWeight: 700 }}>
                    {evalData.hybridAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.hybridAnalysis?.metrics?.recall * 100).toFixed(1)}%`}
                  </td>
                  <td style={{ color: '#a78bfa', fontWeight: 700 }}>
                    {evalData.hybridAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : evalData.hybridAnalysis?.metrics?.f1Score}
                  </td>
                  <td>
                    {evalData.hybridAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.hybridAnalysis?.metrics?.falsePositiveRate * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {evalData.hybridAnalysis?.status === 'SKIPPED'
                      ? <span style={{ color: 'var(--text-dim)' }}>API Key Required</span>
                      : `${(evalData.hybridAnalysis?.metrics?.accuracy * 100).toFixed(1)}%`}
                  </td>
                  <td>{evalData.hybridAnalysis?.averageRuntimeMs ? `${evalData.hybridAnalysis.averageRuntimeMs} ms` : 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Click <strong>"Execute Comparative Benchmark"</strong> to evaluate Static, AI, and Hybrid paradigms against the benchmark ground truth.
          </div>
        )}
      </div>

      {/* Two Column Grid: Consistency Experiment & Human Rating Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Consistency Experiment Card */}
        <div className="glass-card" id="consistency-experiment-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCw size={18} color="#818cf8" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Run-to-Run Determinism (T=0)</h3>
            </div>
            <button
              id="run-consistency-experiment-btn"
              className="btn-secondary"
              onClick={handleRunConsistency}
              disabled={isRunningConsistency}
            >
              {isRunningConsistency ? 'Measuring...' : 'Test Stability'}
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Evaluates findings consistency across 3 repeated runs at Temperature=0. Measures Jaccard finding signature overlap (Klishevich et al., 2025).
          </p>

          {consistencyResult ? (
            <div style={{ background: '#090d16', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Consistency Score:</span>
                <span style={{ color: '#34d399', fontWeight: 800, fontSize: '1.1rem' }}>
                  {consistencyResult.consistencyPercentage}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong>Empirical Observation:</strong> {consistencyResult.researchFinding}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Click "Test Stability" to execute repeated-run consistency evaluation.
            </div>
          )}
        </div>

        {/* Human Qualitative Evaluation Card */}
        <div className="glass-card" id="human-evaluation-summary-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Award size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Human Evaluation Summary</h3>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Aggregated subjective quality ratings by peer reviewers on explanation clarity, actionability, and correctness (Scale: 1-5).
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CLARITY</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
                {humanSummary?.averageClarity || 'Not evaluated'}
              </div>
            </div>

            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>ACTIONABILITY</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
                {humanSummary?.averageActionability || 'Not evaluated'}
              </div>
            </div>

            <div style={{ background: '#090d16', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CORRECTNESS</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.2rem' }}>
                {humanSummary?.averageCorrectness || 'Not evaluated'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'right' }}>
            Total User Ratings Submitted: {humanSummary?.totalEvaluations || 0}
          </div>
        </div>
      </div>

      {/* Fixtures Overview */}
      <div className="glass-card" id="benchmark-fixtures-overview">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Active Benchmark Fixtures (MLCQ &amp; Canonical Java Smells)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {fixtures.map(f => (
            <div key={f.id} style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>{f.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{f.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: f.expectedLabel === 'CLEAN' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                  Label: {f.expectedLabel}
                </span>
                <span style={{ color: 'var(--text-dim)' }}>Ground Truth: {f.groundTruthSmellsCount} smells</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dataset Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" id="dataset-import-modal">
          <div className="modal-dialog">
            <h3 className="modal-title">Import Custom Benchmark Dataset</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Paste an array of Java test items conforming to MLCQ schema:
            </p>
            <textarea
              id="dataset-import-textarea"
              style={{
                width: '100%',
                height: '180px',
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}
              placeholder='[ { "name": "CustomSample.java", "codeSnippet": "public class Foo {}", "groundTruthSmells": [{"type": "LongMethod", "line": 5}] } ]'
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={handleImportDataset}>Validate &amp; Load</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
