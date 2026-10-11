# Automated Code Review Tool using AI and Software Quality Improvement System

[![Java](https://img.shields.io/badge/Java-17%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green.svg)](https://nodejs.org/)
[![PMD](https://img.shields.io/badge/PMD%20Static%20Engine-7.28.0-blue.svg)](https://pmd.github.io/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-cyan.svg)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL-lightgrey.svg)](https://www.sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-12%2F12%20Passing-brightgreen.svg)]()

> **B.Tech CSE Core Capstone Project & Software Quality Research System**  
> An end-to-end platform comparing **Static-Only**, **AI-Based**, and **Grounded Hybrid** review paradigms on Java source code using empirical evaluation metrics.

---

## 1. Project Overview & Research Objective

Automated code review aims to detect design defects, code smells, and maintainability concerns before integration. Traditional static analyzers (such as PMD) are deterministic and precise, but are constrained by rigid syntax rules and lack contextual reasoning. Conversely, Large Language Models (LLMs) can explain issues and suggest refactoring, but are susceptible to hallucination, false positives, and run-to-run non-determinism.

This project delivers a **Grounded Hybrid Architecture** that combines:
1. **Deterministic Static Analysis**: Powered by **PMD 7 for Java**, verifying complexity and rule violations with zero hallucinations.
2. **AI-Based Review**: Powered by configurable LLMs (Google Gemini, OpenAI GPT-4o, Groq, Ollama) generating natural-language explanations and refactoring code diffs.
3. **Grounded Hybrid Review**: Grounding LLM verdicts in actual static analyzer evidence, correlating findings, and providing traceable attribution (`STATIC_ONLY`, `AI_ONLY`, `HYBRID_CONFIRMED`).
4. **Empirical Benchmarking**: Measuring Precision, Recall, F1-Score, False Positive Rate (FPR), Runtime Latency, and Run-to-Run Determinism at $T=0$ against developer-labelled benchmarks (MLCQ dataset).

---

## 2. System Architecture

```
+-----------------------------------------------------------------------------------+
|                            React + Vite Frontend                                  |
|   (Monaco Java Editor, Glassmorphism Dashboard, Evaluation Suite, History Log)   |
+------------------------------------------+----------------------------------------+
                                           | HTTP REST API (Port 5000)
                                           v
+-----------------------------------------------------------------------------------+
|                           Express.js Backend Engine                               |
|   - Request Validation (500KB cap, .java verification)                            |
|   - Safe Sandboxing (Temporary file isolation, 25s subprocess timeout)            |
|   - Correlation Engine (Cross-paradigm finding synthesis & deduplication)        |
+-------------------+----------------------+--------------------+-------------------+
                    |                      |                    |
                    v                      v                    v
      +-------------------------+  +--------------+  +--------------------+
      |  PMD 7.28.0 Engine     |  | Configurable |  | SQLite Database    |
      |  (Java 17 LTS Runtime)  |  | LLM Provider |  | (reviews.db - WAL) |
      |  - Design Complexity    |  | - Gemini     |  | - Analyses History |
      |  - Resource Leaks       |  | - OpenAI     |  | - Human Ratings   |
      |  - Code Smells          |  | - Groq       |  | - JSON/CSV Export |
      |  - Best Practices       |  | - Ollama     |  +--------------------+
      +-------------------------+  +--------------+
```

---

## 3. Analysis Paradigms

| Paradigm | Underlying Engine | Key Strengths | Limitations | API Key Required? |
| :--- | :--- | :--- | :--- | :--- |
| **Static Analysis** | PMD 7.28.0 (`java`) | 100% deterministic, zero hallucinations, fast ($< 3.5$s) | Rule-bound, misses contextual smells | ❌ **No (100% Offline)** |
| **AI Review** | Configurable LLM | Deep natural-language reasoning, refactoring diffs | Non-deterministic, potential false alarms | ✔️ Yes (Gemini/OpenAI) |
| **Grounded Hybrid** | PMD 7 + LLM | Highest recall, verified evidence, actionable fixes | Moderate inference latency | ✔️ Yes (Falls back to Static) |

---

## 4. Repository Structure

```
Autmated code review/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header, tabs & PMD status indicator
│   │   │   ├── CodeInput.jsx       # Monaco editor & benchmark sample loader
│   │   │   ├── Dashboard.jsx       # Findings list, diff viewer & KPI cards
│   │   │   ├── EvaluationTab.jsx   # Research benchmark & consistency runner
│   │   │   ├── HistoryTab.jsx      # Persisted review sessions & exports
│   │   │   ├── SettingsModal.jsx   # LLM provider & API credentials
│   │   │   └── HumanEvalModal.jsx  # Qualitative 5-star rating dialog
│   │   ├── App.jsx                 # Main application state orchestration
│   │   ├── index.css               # Vanilla CSS design system tokens
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── server/                     # Node.js + Express Backend
│   ├── config/
│   │   └── pmd-ruleset.xml         # PMD 7 ruleset (smells, complexity, leaks)
│   ├── database/
│   │   └── reviews.db              # SQLite database (auto-generated)
│   ├── routes/
│   │   ├── analyze.js              # POST /api/analyze
│   │   ├── evaluation.js           # Benchmark, consistency & human rating APIs
│   │   ├── history.js              # History logs & CSV/JSON download APIs
│   │   └── config.js               # Provider status & connectivity test APIs
│   ├── services/
│   │   ├── staticAnalyzer.js       # Real PMD 7 execution via Java 17
│   │   ├── aiAnalyzer.js           # Multi-provider LLM review & JSON repair
│   │   ├── hybridAnalyzer.js       # Grounded correlation & source attribution
│   │   ├── evaluator.js            # Precision/Recall/F1 & consistency suite
│   │   └── db.js                   # SQLite queries & CSV/JSON export
│   ├── tests/
│   │   └── backend.test.js         # Automated test suite (node:test)
│   ├── index.js                    # Server entrypoint (Port 5000)
│   └── package.json
├── samples/                    # Verified Java Test Fixtures
│   ├── CleanSample.java            # Clean code (0 violations baseline)
│   ├── ComplexCalculator.java      # Cyclomatic Complexity & Deep Nesting
│   ├── GodOrderManager.java        # God Class, Data Class, Feature Envy
│   └── ResourceLeakDemo.java       # CloseResource leaks, Empty Catch
├── tools/                      # Static analysis binaries
│   └── pmd-bin-7.28.0/             # Official PMD 7.28.0 distribution
├── .env.example                # Example environment credentials
├── .gitignore
├── package.json                # Root package for unified scripts
└── README.md                   # Complete system documentation
```

---

## 5. Prerequisites

- **Node.js**: v18+ (tested on `v22.19.0`)
- **npm**: v9+ (tested on `10.9.3`)
- **Java JDK**: 17 LTS or 21+ (`java` available in system PATH)
- **Git**

---

## 6. Installation & Configuration

### Step 1: Install Dependencies

From the project root:
```bash
# Install root orchestration tools
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

cd ..
```

### Step 2: Configure Environment Variables (Optional for Static Review)

Create `.env` in `server/` (or copy from `.env.example`):
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=5000
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note**: Static Analysis (PMD 7) runs **100% offline without any API key**. API keys can also be configured dynamically in the web UI via the **Settings** modal.

---

## 7. Starting the Application

### Option A: Unified Start (Frontend + Backend Concurrently)
From the project root:
```bash
npm run dev
```

### Option B: Separate Terminal Commands
**Terminal 1 (Backend Server):**
```bash
cd server
npm start
# Server starts on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite dev server starts on http://localhost:5173
```

Open your browser and navigate to: **`http://localhost:5173`**

---

## 8. REST API Documentation

### Analysis Endpoints

#### `POST /api/analyze`
Executes code review analysis.
- **Request Body (JSON or `multipart/form-data`)**:
  - `sourceCode` (string): Java source code (max 500 KB)
  - `fileName` (string, optional): e.g., `"OrderService.java"`
  - `mode` (string): `"static" | "ai" | "hybrid"`
  - `aiOptions` (object, optional): `{ provider, model, temperature }`
- **Headers (Optional)**:
  - `x-api-key`: Client-supplied API key
  - `x-ai-provider`: `"gemini" | "openai" | "groq"`
- **Response**:
  ```json
  {
    "success": true,
    "id": "rev_xxx",
    "mode": "hybrid",
    "totalViolations": 4,
    "attributionBreakdown": {
      "hybridConfirmed": 2,
      "staticOnly": 1,
      "aiOnly": 1
    },
    "findings": [
      {
        "id": "static_xxx",
        "rule": "CyclomaticComplexity",
        "category": "Design",
        "severity": "HIGH",
        "line": 9,
        "message": "The method computeTax has a cyclomatic complexity of 14",
        "whyItMatters": "Increases execution paths making testing harder",
        "suggestedFix": "Extract helper methods or apply Strategy Pattern",
        "originalSnippet": "if (basePrice > 0) { ... }",
        "proposedSnippet": "// Refactored clean code",
        "source": "HYBRID_CONFIRMED",
        "sourceLabel": "Hybrid (PMD Verified + GEMINI Enriched)"
      }
    ],
    "executionDurationMs": 3412
  }
  ```

### Evaluation Endpoints

#### `POST /api/evaluation/run`
Executes comparative benchmarks across all benchmark samples.
- **Returns**: Precision, Recall, F1-Score, False Positive Rate, and Latency for Static, AI, and Hybrid.

#### `POST /api/evaluation/consistency`
Measures finding stability across 3 repeated runs at $T=0$.
- **Returns**: Jaccard similarity score, consistency percentage, and empirical findings.

#### `POST /api/evaluation/import`
Validates and imports custom MLCQ or JSON/CSV benchmark datasets.

#### `POST /api/evaluation/human`
Saves human peer evaluation rating (1-5 stars for Clarity, Actionability, Correctness).

### History & Export Endpoints

- `GET /api/history`: List previous review sessions.
- `GET /api/history/:id`: Retrieve detailed past report.
- `GET /api/history/:id/export/json`: Download analysis as JSON file.
- `GET /api/history/:id/export/csv`: Download findings as CSV spreadsheet.
- `DELETE /api/history/:id`: Delete record.

---

## 9. Running Automated Tests

Run the backend test suite:
```bash
cd server
npm test
```

### Test Suite Results:
```
# Subtest: 1. Static Code Analysis Service (PMD 7)
    ok 1 - runs real PMD static analysis on code with intentional smells
    ok 2 - returns 0 violations for clean Java code
    ok 3 - rejects empty Java input with an informative error
ok 1 - 1. Static Code Analysis Service (PMD 7)

# Subtest: 2. AI Review Response Sanitization & Error Handling
    ok 1 - parses clean JSON from LLM response
    ok 2 - strips markdown code fences from LLM responses
    ok 3 - handles trailing commas and extra commentary around JSON
    ok 4 - throws descriptive error on malformed unparseable text
ok 2 - 2. AI Review Response Sanitization & Error Handling

# Subtest: 3. Grounded Hybrid Analysis Attribution & Fallback
    ok 1 - falls back gracefully to verified static findings when AI key is missing
ok 3 - 3. Grounded Hybrid Analysis Attribution & Fallback

# Subtest: 4. Evaluation Metric Calculations & Dataset Validation
    ok 1 - validates and parses custom JSON benchmark dataset
    ok 2 - rejects malformed datasets missing code snippets
ok 4 - 4. Evaluation Metric Calculations & Dataset Validation

# Subtest: 5. Database Persistence & Export Functionality
    ok 1 - saves analysis and retrieves by ID
    ok 2 - exports findings to valid CSV format
ok 5 - 5. Database Persistence & Export Functionality

# tests 12
# suites 5
# pass 12
# fail 0
```

---

## 10. Security & Reliability

- **No Code Execution**: Uploaded Java code is statically analyzed and reviewed by LLMs; it is **never compiled or executed**.
- **Sandboxed Execution**: PMD is executed on isolated temporary directories created with unique UUIDs. Temporary files are destroyed in `finally` blocks.
- **Process Timeouts**: Subprocesses are bounded by strict 25-second timeouts to eliminate hanging threads.
- **Secret Protection**: API keys are masked in responses and logs, and sanitized from error stacks.
- **Offline Resilience**: If the LLM provider is offline or credentials are missing, Static Analysis (PMD 7) remains **100% operational**.

---

## 11. Research Assumptions & Limitations

1. **Java Language Scope**: Evaluation and static rules are scoped to Java 8–21 source code.
2. **Matching Criterion**: Matching between predictions and ground-truth reference labels uses normalized smell categories and line proximity ($\pm 8$ lines).
3. **LLM Determinism**: As established in literature (*Klishevich et al., 2025*), LLMs exhibit minor non-determinism even at $T=0$. The included consistency experiment quantitatively captures this variance.
