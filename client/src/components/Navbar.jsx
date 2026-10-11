import React from 'react';
import { ShieldCheck, Sparkles, GitMerge, FileCode, BarChart3, History, Settings } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenSettings, pmdStatus = 'Online' }) {
  return (
    <header className="top-navbar" id="main-header">
      <div className="brand-section">
        <div className="brand-icon" id="brand-logo-icon">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="brand-title" id="project-main-title">Automated Code Review System</h1>
          <p className="brand-subtitle" id="project-subtitle">AI &amp; Software Quality Research Platform</p>
        </div>
      </div>

      <nav className="nav-tabs" id="primary-navigation-tabs">
        <button
          id="nav-tab-workspace"
          className={`nav-tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <FileCode size={16} />
          <span>Code Input</span>
        </button>

        <button
          id="nav-tab-dashboard"
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart3 size={16} />
          <span>Results Dashboard</span>
        </button>

        <button
          id="nav-tab-evaluation"
          className={`nav-tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          <GitMerge size={16} />
          <span>Research Evaluation</span>
        </button>

        <button
          id="nav-tab-history"
          className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Review History</span>
        </button>
      </nav>

      <div className="nav-actions">
        <div className="status-badge" id="pmd-status-indicator" title="Static analysis engine operational">
          <span className="status-dot"></span>
          <span>PMD 7 {pmdStatus}</span>
        </div>

        <button
          className="settings-btn"
          id="open-settings-button"
          onClick={onOpenSettings}
          title="Configure AI API keys & models"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
