import React, { useState } from 'react';
import { Star, X, CheckCircle } from 'lucide-react';

export default function HumanEvalModal({ finding, analysisId, isOpen, onClose, apiBaseUrl = 'http://localhost:5000/api' }) {
  const [clarity, setClarity] = useState(4);
  const [actionability, setActionability] = useState(4);
  const [correctness, setCorrectness] = useState(4);
  const [comments, setComments] = useState('');
  const [role, setRole] = useState('Student / Peer Reviewer');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !finding) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiBaseUrl}/evaluation/human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysisId || 'ad_hoc',
          findingId: finding.id,
          clarityRating: clarity,
          actionabilityRating: actionability,
          correctnessRating: correctness,
          comments,
          evaluatorRole: role
        })
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    }
  };

  const renderStars = (currentVal, setter) => {
    return (
      <div className="rating-group">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${star <= currentVal ? 'active' : ''}`}
            onClick={() => setter(star)}
          >
            ★
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
          {currentVal}/5
        </span>
      </div>
    );
  };

  return (
    <div className="modal-overlay" id="human-eval-modal-overlay">
      <div className="modal-dialog" id="human-eval-dialog">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Human Qualitative Evaluation</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Rule: <strong>{finding.rule}</strong> (Line {finding.line})
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 0.75rem' }} />
            <h3>Feedback Recorded!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Your qualitative evaluation has been saved to the research database.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Clarity */}
            <div>
              <label className="section-label">Explanation Clarity</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                How understandable and well-explained is why this defect matters?
              </p>
              {renderStars(clarity, setClarity)}
            </div>

            {/* Actionability */}
            <div>
              <label className="section-label">Refactoring Actionability</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Can a developer directly apply the suggested fix or proposed code snippet?
              </p>
              {renderStars(actionability, setActionability)}
            </div>

            {/* Correctness */}
            <div>
              <label className="section-label">Finding Correctness</label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>
                Is this a genuine code smell rather than a false alarm?
              </p>
              {renderStars(correctness, setCorrectness)}
            </div>

            {/* Comments */}
            <div>
              <label className="section-label">Qualitative Notes / Commentary</label>
              <textarea
                className="search-input"
                style={{ width: '100%', height: '70px', resize: 'none' }}
                placeholder="Optional reviewer commentary on explanation quality..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Submit Rating</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
