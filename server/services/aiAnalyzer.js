import { v4 as uuidv4 } from 'uuid';

/**
 * Normalizes and parses JSON responses from LLM models,
 * stripping markdown fences and repairing common syntax anomalies.
 */
export function sanitizeAndParseLLMJson(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('LLM returned an empty response');
    }

    let cleaned = rawText.trim();

    // Strip markdown code fences like ```json ... ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
        cleaned = cleaned.replace(/\s*```$/, '');
    }

    // Locate the outermost JSON object bounds if extra text surrounds it
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch (parseErr) {
        // Fallback: remove trailing commas before closing braces/brackets
        try {
            const repaired = cleaned
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/[\u0000-\u001F]+/g, ' ');
            return JSON.parse(repaired);
        } catch (secondaryErr) {
            throw new Error(`Failed to parse structured JSON from LLM: ${parseErr.message}. Output was: ${rawText.substring(0, 300)}...`);
        }
    }
}

/**
 * Standard system instructions for Java code quality and smell review.
 */
const SYSTEM_PROMPT = `You are a Principal Software Quality Engineer and Java Code Review Specialist.
Analyze the submitted Java source code for software quality issues, maintainability defects, and canonical code smells.
Target issues include:
- Code Smells: God Class / Large Class, Long Method, Feature Envy, Data Class, Long Parameter List, Deep Nesting, Inappropriate Intimacy, Primitive Obsession, Brain Method.
- Design & Architecture: Violations of Single Responsibility, High Coupling, Low Cohesion, Leaky Abstractions.
- Resource & Reliability: Unclosed I/O streams, empty catch blocks, unchecked type casts, potential null dereferences.
- Maintainability & Style: Dead code, naming intent violations, misleading method names.

Respond ONLY with valid, raw JSON conforming to this exact schema (no markdown outside the JSON):
{
  "summary": "Overall software quality assessment and core architecture observations",
  "findings": [
    {
      "rule": "Canonical smell or defect name (e.g. LongMethod, FeatureEnvy, GodClass, CloseResource, EmptyCatchBlock)",
      "category": "Design | Complexity | Maintainability | ErrorProne | BestPractices | CodeStyle",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "line": 12,
      "endLine": 25,
      "message": "Precise description of the detected code smell or quality issue",
      "whyItMatters": "Clear explanation of software quality impact (maintainability, cognitive complexity, defect propensity)",
      "suggestedFix": "Detailed refactoring advice",
      "originalSnippet": "The exact source code snippet exhibiting this issue",
      "proposedSnippet": "The refactored, clean Java code snippet demonstrating the fix",
      "expectedBenefit": "Expected architectural improvement (e.g., lower cyclomatic complexity, improved cohesion, testability)"
    }
  ]
}`;

/**
 * Calls the configured LLM provider to review Java source code.
 *
 * @param {string} sourceCode - Raw Java code
 * @param {object} [options={}] - Provider options (provider, apiKey, model, temperature)
 * @returns {Promise<object>} Structured AI code review findings
 */
export async function runAIAnalysis(sourceCode, options = {}) {
    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
        throw new Error('Java source code cannot be empty');
    }

    const provider = (options.provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    const model = options.model || (provider === 'openai' ? 'gpt-4o' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.0;

    // Check credential availability
    if (!apiKey && provider !== 'ollama') {
        const err = new Error(
            `No API key configured for provider "${provider}". Please configure your API key in the Settings panel or in server/.env (e.g., GEMINI_API_KEY or OPENAI_API_KEY).`
        );
        err.code = 'MISSING_API_KEY';
        err.provider = provider;
        throw err;
    }

    const startTime = Date.now();
    const prompt = `Review the following Java source code:\n\n\`\`\`java\n${sourceCode}\n\`\`\``;

    let rawOutput = '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }
                    ],
                    generationConfig: {
                        temperature: temperature,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Gemini API error (${res.status}): ${errBody}`);
            }

            const data = await res.json();
            rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        } else if (provider === 'openai' || provider === 'groq') {
            const baseUrl = provider === 'groq'
                ? 'https://api.groq.com/openai/v1/chat/completions'
                : (options.baseUrl || 'https://api.openai.com/v1/chat/completions');

            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: model,
                    temperature: temperature,
                    response_format: { type: 'json_object' },
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`${provider.toUpperCase()} API error (${res.status}): ${errBody}`);
            }

            const data = await res.json();
            rawOutput = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'ollama') {
            const baseUrl = options.baseUrl || 'http://localhost:11434/api/chat';
            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: model || 'codellama',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ],
                    stream: false,
                    options: { temperature: temperature }
                })
            });

            if (!res.ok) {
                const errBody = await res.text();
                throw new Error(`Ollama API error (${res.status}): ${errBody}`);
            }

            const data = await res.json();
            rawOutput = data.message?.content || '';

        } else {
            throw new Error(`Unsupported AI provider: ${provider}`);
        }

    } catch (networkErr) {
        if (networkErr.name === 'AbortError') {
            throw new Error('AI analysis timed out after 45 seconds');
        }
        throw networkErr;
    } finally {
        clearTimeout(timeout);
    }

    const parsed = sanitizeAndParseLLMJson(rawOutput);
    const rawFindings = Array.isArray(parsed.findings) ? parsed.findings : [];

    const findings = rawFindings.map((f, idx) => ({
        id: `ai_${uuidv4().substring(0, 8)}`,
        rule: f.rule || 'CodeSmell',
        category: f.category || 'Maintainability',
        severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(String(f.severity).toUpperCase())
            ? String(f.severity).toUpperCase()
            : 'MEDIUM',
        line: typeof f.line === 'number' ? f.line : 1,
        endLine: typeof f.endLine === 'number' ? f.endLine : (typeof f.line === 'number' ? f.line : 1),
        column: 1,
        message: f.message || 'AI-detected code quality concern',
        whyItMatters: f.whyItMatters || 'Potential degradation of software quality and readability.',
        suggestedFix: f.suggestedFix || 'Refactor according to clean code best practices.',
        originalSnippet: f.originalSnippet || '',
        proposedSnippet: f.proposedSnippet || '',
        expectedBenefit: f.expectedBenefit || 'Improved code maintainability and testability.',
        source: 'AI_ONLY',
        sourceLabel: `AI Review (${provider} / ${model})`,
        externalInfoUrl: ''
    }));

    const duration = Date.now() - startTime;

    return {
        mode: 'ai',
        status: 'SUCCESS',
        summary: parsed.summary || 'AI code review completed successfully.',
        provider: provider,
        model: model,
        temperature: temperature,
        totalViolations: findings.length,
        findings: findings,
        executionDurationMs: duration,
        analyzedAt: new Date().toISOString()
    };
}
