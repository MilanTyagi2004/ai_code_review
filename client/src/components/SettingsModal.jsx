import React, { useState, useEffect } from 'react';
import { Settings, Key, Cpu, Sliders, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, apiBaseUrl = 'http://localhost:5000/api' }) {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [temperature, setTemperature] = useState(0.0);
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
    const savedKey = localStorage.getItem('ai_api_key') || '';
    const savedModel = localStorage.getItem('ai_model') || (savedProvider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash');
    const savedTemp = parseFloat(localStorage.getItem('ai_temperature') || '0.0');

    setProvider(savedProvider);
    setApiKey(savedKey);
    setModel(savedModel);
    setTemperature(savedTemp);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ai_api_key', apiKey.trim());
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_temperature', temperature.toString());
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${apiBaseUrl}/config/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), model })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({ success: true, message: data.message });
      } else {
        setTestStatus({ success: false, message: data.error || data.message || 'Connection test failed.' });
      }
    } catch (err) {
      setTestStatus({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="modal-overlay" id="settings-modal-overlay">
      <div className="modal-dialog" id="settings-dialog">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={22} color="#818cf8" />
            <h2 className="modal-title" style={{ margin: 0 }}>AI Provider &amp; Model Settings</h2>
          </div>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '0.4rem', border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Configure API credentials for <strong>AI-Based Review</strong> and <strong>Grounded Hybrid Review</strong>. Keys are stored locally in your browser session and never hardcoded.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Provider Selection */}
          <div>
            <label className="section-label">AI Provider</label>
            <select
              id="settings-provider-select"
              className="filter-select"
              style={{ width: '100%', padding: '0.75rem' }}
              value={provider}
              onChange={(e) => {
                const p = e.target.value;
                setProvider(p);
                setModel(p === 'openai' ? 'gpt-4o' : p === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');
              }}
            >
              <option value="gemini">Google Gemini (Recommended / Free tier available)</option>
              <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
              <option value="groq">Groq (Ultra-fast Llama-3.3)</option>
              <option value="ollama">Ollama (Offline Local LLM)</option>
            </select>
          </div>

          {/* API Key */}
          {provider !== 'ollama' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="section-label">API Key</label>
                {provider === 'gemini' && (
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}
                  >
                    Get free Gemini key &rarr;
                  </a>
                )}
              </div>
              <input
                id="settings-api-key-input"
                type="password"
                className="search-input"
                style={{ width: '100%', padding: '0.75rem' }}
                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}

          {/* Model Name */}
          <div>
            <label className="section-label">Model Identifier</label>
            <input
              id="settings-model-input"
              type="text"
              className="search-input"
              style={{ width: '100%', padding: '0.75rem' }}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          {/* Temperature Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label className="section-label">Sampling Temperature</label>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                {temperature} (Determinism: {temperature === 0 ? 'Strict / Research' : 'Creative'})
              </span>
            </div>
            <input
              id="settings-temperature-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              style={{ width: '100%', cursor: 'pointer' }}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </div>

          {/* Connection Test Status */}
          {testStatus && (
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                background: testStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: testStatus.success ? '#34d399' : '#fda4af',
                border: `1px solid ${testStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {testStatus.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem' }}>
          <button
            id="test-connection-btn"
            className="btn-secondary"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              id="save-settings-btn"
              className="btn-primary"
              style={{ width: 'auto' }}
              onClick={handleSave}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
