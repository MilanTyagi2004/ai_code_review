import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CodeInput from './components/CodeInput';
import Dashboard from './components/Dashboard';
import EvaluationTab from './components/EvaluationTab';
import HistoryTab from './components/HistoryTab';
import SettingsModal from './components/SettingsModal';
import HumanEvalModal from './components/HumanEvalModal';

const API_BASE_URL = 'http://localhost:5000/api';

const DEFAULT_JAVA_CODE = `package samples;

/**
 * ComplexCalculator demonstrates Cyclomatic Complexity, Cognitive Complexity,
 * Deeply Nested Conditions, and Excessive Parameter List smells.
 */
public class ComplexCalculator {

    // Smell: ExcessiveParameterList (6 parameters)
    public double computeTaxAndDiscount(double basePrice, double taxRate, double discountRate,
                                         int customerTier, boolean isHoliday, boolean isVip) {
        double result = basePrice;

        // Smells: AvoidDeeplyNestedIfStmts & CollapsibleIfStatements & High Complexity
        if (basePrice > 0) {
            if (taxRate >= 0) {
                if (discountRate >= 0) {
                    if (customerTier > 0) {
                        if (customerTier == 1) {
                            result = basePrice * (1 + taxRate) * 0.95;
                        } else if (customerTier == 2) {
                            result = basePrice * (1 + taxRate) * 0.90;
                        } else if (customerTier == 3) {
                            result = basePrice * (1 + taxRate) * 0.85;
                        } else {
                            result = basePrice * (1 + taxRate);
                        }
                    }
                }
            }
        }

        // Additional complexity branches (Cyclomatic Complexity > 10)
        if (isHoliday) {
            if (isVip) {
                result -= 25.0;
            } else {
                result -= 10.0;
            }
        } else {
            if (isVip) {
                result -= 15.0;
            }
        }

        if (result < 0) {
            result = 0.0;
        }

        return result;
    }
}`;

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [code, setCode] = useState(DEFAULT_JAVA_CODE);
  const [fileName, setFileName] = useState('ComplexCalculator.java');
  const [selectedMode, setSelectedMode] = useState('hybrid');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ratingFinding, setRatingFinding] = useState(null);

  // Execute Analysis
  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError('Please provide or paste Java code to review.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const storedKey = localStorage.getItem('ai_api_key') || '';
    const storedProvider = localStorage.getItem('ai_provider') || 'gemini';
    const storedModel = localStorage.getItem('ai_model') || (storedProvider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash');
    const storedTemp = parseFloat(localStorage.getItem('ai_temperature') || '0.0');

    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': storedKey,
          'x-ai-provider': storedProvider
        },
        body: JSON.stringify({
          sourceCode: code,
          fileName: fileName,
          mode: selectedMode,
          aiOptions: {
            provider: storedProvider,
            model: storedModel,
            temperature: storedTemp
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'MISSING_API_KEY') {
          setError(`${data.error} — Tip: ${data.suggestion}`);
        } else {
          setError(data.error || 'Failed to complete analysis.');
        }
        return;
      }

      setAnalysisResult(data);
      // Seamlessly navigate to Dashboard to view results
      setActiveTab('dashboard');

    } catch (networkErr) {
      setError(`Cannot reach backend server at ${API_BASE_URL}. Ensure server is running on port 5000.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load a historical analysis into current view
  const handleLoadPastAnalysis = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/history/${id}`);
      const data = await res.json();
      if (data && data.result) {
        setAnalysisResult(data.result);
        if (data.result.sourceCode) {
          setCode(data.result.sourceCode);
        }
        setFileName(data.filename);
        setSelectedMode(data.mode);
        setActiveTab('dashboard');
      }
    } catch (err) {
      alert(`Failed to load historical record: ${err.message}`);
    }
  };

  // Export handlers
  const handleExportJson = () => {
    if (!analysisResult) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code_review_${analysisResult.fileName || 'report'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!analysisResult) return;
    if (analysisResult.id) {
      window.open(`${API_BASE_URL}/history/${analysisResult.id}/export/csv`, '_blank');
    } else {
      alert('Analysis must be saved to database before downloading CSV.');
    }
  };

  return (
    <div className="app-container" id="app-root-layout">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content" id="main-content-viewport">
        {activeTab === 'workspace' && (
          <CodeInput
            code={code}
            setCode={setCode}
            fileName={fileName}
            setFileName={setFileName}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            analysisResult={analysisResult}
            onRateFinding={(finding) => setRatingFinding(finding)}
            onExportJson={handleExportJson}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationTab apiBaseUrl={API_BASE_URL} />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            apiBaseUrl={API_BASE_URL}
            onLoadPastAnalysis={handleLoadPastAnalysis}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiBaseUrl={API_BASE_URL}
      />

      {/* Human Qualitative Evaluation Modal */}
      <HumanEvalModal
        finding={ratingFinding}
        analysisId={analysisResult?.id}
        isOpen={Boolean(ratingFinding)}
        onClose={() => setRatingFinding(null)}
        apiBaseUrl={API_BASE_URL}
      />
    </div>
  );
}
