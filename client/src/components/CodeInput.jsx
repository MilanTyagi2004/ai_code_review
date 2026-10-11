import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Upload, Play, Shield, Sparkles, GitMerge, FileCode, AlertCircle, RefreshCw } from 'lucide-react';

const SAMPLE_CODES = {
  clean: `package samples;

/**
 * CleanSample represents well-designed, clean Java code following
 * SOLID principles, clean code conventions, and best practices.
 * Expected violations: 0.
 */
public final class CleanSample {

    private final String serviceName;
    private final int timeoutSeconds;

    public CleanSample(String serviceName, int timeoutSeconds) {
        if (serviceName == null || serviceName.isBlank()) {
            throw new IllegalArgumentException("Service name must not be blank");
        }
        if (timeoutSeconds <= 0) {
            throw new IllegalArgumentException("Timeout must be positive");
        }
        this.serviceName = serviceName;
        this.timeoutSeconds = timeoutSeconds;
    }

    public String formatEndpoint(String path) {
        if (path == null) {
            return this.serviceName + "/v1/default";
        }
        return this.serviceName + "/v1/" + path.trim();
    }

    public boolean isValidTimeout(int value) {
        return value > 0 && value <= this.timeoutSeconds;
    }

    public String getServiceName() {
        return this.serviceName;
    }

    public int getTimeoutSeconds() {
        return this.timeoutSeconds;
    }
}`,

  calculator: `package samples;

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
}`,

  godClass: `package samples;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * GodOrderManager illustrates God Class / Large Class smell,
 * Feature Envy (manipulating OrderData internals), and Long Method.
 */
public class GodOrderManager {

    // Smell: DataClass
    public static class OrderData {
        public String orderId;
        public String customerEmail;
        public double subtotal;
        public double tax;
        public double shippingFee;
        public double total;
        public String status;
        public List<String> items = new ArrayList<>();
    }

    private final Map<String, OrderData> orders = new HashMap<>();
    private int counter = 0;

    // Smell: Long Method and Feature Envy
    public OrderData processAndFulfillOrder(String id, String email, List<String> rawItems,
                                             double taxRate, double discountPercent, boolean rush) {
        OrderData order = new OrderData();
        order.orderId = id;
        order.customerEmail = email;
        order.status = "PENDING";

        double calculatedSubtotal = 0.0;
        for (String item : rawItems) {
            order.items.add(item);
            if (item.startsWith("PROMO_")) {
                calculatedSubtotal += 10.0;
            } else if (item.startsWith("PREMIUM_")) {
                calculatedSubtotal += 50.0;
            } else {
                calculatedSubtotal += 20.0;
            }
        }

        if (discountPercent > 0) {
            calculatedSubtotal -= (calculatedSubtotal * (discountPercent / 100.0));
        }

        double calculatedTax = calculatedSubtotal * taxRate;
        double calculatedShipping = rush ? 25.0 : 5.0;

        order.subtotal = calculatedSubtotal;
        order.tax = calculatedTax;
        order.shippingFee = calculatedShipping;
        order.total = calculatedSubtotal + calculatedTax + calculatedShipping;

        if (order.total > 500.0) {
            order.status = "VIP_APPROVED";
        } else {
            order.status = "STANDARD_APPROVED";
        }

        orders.put(id, order);
        counter++;
        return order;
    }
}`,

  leak: `package samples;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * ResourceLeakDemo demonstrates EmptyCatchBlock, CloseResource leak,
 * and UnusedPrivateField smells.
 */
public class ResourceLeakDemo {

    // Smell: UnusedPrivateField
    private String unusedSecretKey = "sk_unused_debug_value";

    // Smell: CloseResource leak (FileInputStream / FileOutputStream unclosed)
    public void copyFileUnsafe(String sourcePath, String destPath) {
        FileInputStream in = null;
        FileOutputStream out = null;
        try {
            in = new FileInputStream(sourcePath);
            out = new FileOutputStream(destPath);
            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        } catch (IOException e) {
            // Smell: EmptyCatchBlock & AvoidPrintStackTrace
            e.printStackTrace();
        }
        // Missing finally block to close 'in' and 'out'
    }

    // Smell: EmptyCatchBlock
    public void processData(String input) {
        try {
            int parsed = Integer.parseInt(input);
            System.out.println("Value: " + parsed);
        } catch (NumberFormatException e) {
            // Smell: Empty catch block ignoring failure
        }
    }
}`
};

export default function CodeInput({
  code,
  setCode,
  fileName,
  setFileName,
  selectedMode,
  setSelectedMode,
  onAnalyze,
  isLoading,
  error
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.java')) {
      alert('Invalid file: Please upload a valid .java source code file.');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('File too large: Maximum supported Java source file size is 500 KB.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCode(event.target.result || '');
    };
    reader.readAsText(file);
  };

  const loadSample = (sampleKey, sampleName) => {
    setCode(SAMPLE_CODES[sampleKey]);
    setFileName(sampleName);
  };

  return (
    <div className="workspace-grid" id="code-workspace-view">
      {/* Left Column: Monaco Java Editor */}
      <div className="editor-card" id="code-editor-container">
        <div className="editor-toolbar">
          <div className="toolbar-file-info" id="active-file-indicator">
            <FileCode size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>{fileName}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
              ({code.split('\\n').length} lines)
            </span>
          </div>

          <div className="toolbar-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".java"
              style={{ display: 'none' }}
              id="file-upload-input"
            />
            <button
              id="upload-java-file-btn"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              title="Upload local .java file"
            >
              <Upload size={14} />
              <span>Upload .java</span>
            </button>

            <button
              id="clear-editor-btn"
              className="btn-secondary"
              onClick={() => setCode('')}
              title="Clear code editor"
            >
              <RefreshCw size={14} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }} id="monaco-wrapper">
          <Editor
            height="100%"
            language="java"
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              renderLineHighlight: 'all',
              lineNumbers: 'on'
            }}
          />
        </div>
      </div>

      {/* Right Column: Mode Selector, Fixture Samples, and Execution */}
      <div className="control-panel" id="analysis-control-panel">
        {/* Analysis Mode Selection */}
        <div>
          <div className="section-label">Select Review Paradigm</div>

          {/* Mode 1: Static */}
          <div
            id="mode-selector-static"
            className={`mode-card ${selectedMode === 'static' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('static')}
          >
            <div className="mode-header">
              <div className="mode-title">
                <Shield size={18} color="#fbbf24" />
                <span>Static Analysis</span>
              </div>
              <span className="mode-badge static">PMD 7</span>
            </div>
            <p className="mode-desc">
              Deterministic, rule-based static verification. 100% offline, zero API key required.
            </p>
          </div>

          {/* Mode 2: AI-Based */}
          <div
            id="mode-selector-ai"
            className={`mode-card ${selectedMode === 'ai' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('ai')}
          >
            <div className="mode-header">
              <div className="mode-title">
                <Sparkles size={18} color="#c084fc" />
                <span>AI-Based Review</span>
              </div>
              <span className="mode-badge ai">LLM</span>
            </div>
            <p className="mode-desc">
              Contextual analysis detecting architectural smells and maintainability anti-patterns.
            </p>
          </div>

          {/* Mode 3: Grounded Hybrid */}
          <div
            id="mode-selector-hybrid"
            className={`mode-card ${selectedMode === 'hybrid' ? 'selected' : ''}`}
            onClick={() => setSelectedMode('hybrid')}
          >
            <div className="mode-header">
              <div className="mode-title">
                <GitMerge size={18} color="#34d399" />
                <span>Grounded Hybrid</span>
              </div>
              <span className="mode-badge hybrid">Recommended</span>
            </div>
            <p className="mode-desc">
              Static verification grounded with contextual AI explanations and concrete fix diffs.
            </p>
          </div>
        </div>

        {/* Quick Load Benchmark Fixtures */}
        <div>
          <div className="section-label">Load Benchmark Samples</div>
          <div className="samples-grid">
            <button
              id="load-sample-clean"
              className="sample-chip"
              onClick={() => loadSample('clean', 'CleanSample.java')}
              title="Clean Java class (0 defects expected)"
            >
              Clean Baseline
            </button>
            <button
              id="load-sample-calculator"
              className="sample-chip"
              onClick={() => loadSample('calculator', 'ComplexCalculator.java')}
              title="Cyclomatic & Cognitive Complexity"
            >
              Complex Methods
            </button>
            <button
              id="load-sample-god"
              className="sample-chip"
              onClick={() => loadSample('godClass', 'GodOrderManager.java')}
              title="God Class, Feature Envy, Data Class"
            >
              God Class &amp; Envy
            </button>
            <button
              id="load-sample-leak"
              className="sample-chip"
              onClick={() => loadSample('leak', 'ResourceLeakDemo.java')}
              title="Resource Leaks & Empty Catch"
            >
              Resource Leaks
            </button>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div
            id="analysis-error-banner"
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Analysis Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Start Analysis Button */}
        <button
          id="start-analysis-submit-btn"
          className="btn-primary"
          onClick={onAnalyze}
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              <span>Running {selectedMode.toUpperCase()} Review...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Execute {selectedMode === 'hybrid' ? 'Grounded Hybrid' : selectedMode === 'ai' ? 'AI Review' : 'PMD Static'} Analysis</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
