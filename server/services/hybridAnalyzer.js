import { v4 as uuidv4 } from 'uuid';
import { runStaticAnalysis } from './staticAnalyzer.js';
import { sanitizeAndParseLLMJson } from './aiAnalyzer.js';

/**
 * Builds the specialized hybrid prompt supplying source code alongside
 * real, verified PMD findings for grounded enrichment.
 */
function buildHybridPrompt(sourceCode, staticFindings) {
    const findingsSummary = staticFindings.map(f => ({
        staticId: f.id,
        rule: f.rule,
        category: f.category,
        line: f.line,
        endLine: f.endLine,
        message: f.message
    }));

    return `You are performing a GROUNDED HYBRID Code Review on Java source code.
You are provided with:
1. The Java source code.
2. The ACTUAL, VERIFIED static analysis findings detected by PMD 7.

VERIFIED PMD STATIC FINDINGS:
${JSON.stringify(findingsSummary, null, 2)}

SOURCE CODE:
\`\`\`java
${sourceCode}
\`\`\`

YOUR TASK:
1. GROUNDED ENRICHMENT: For each verified PMD finding above, explain why this exact pattern is problematic in this specific context, and provide a concrete refactored code snippet showing how to resolve it. Include the corresponding "staticId" to correlate evidence.
2. COMPLEMENTARY SMELL DETECTION: Identify context-dependent, semantic smells that rule-based static analyzers miss (such as Feature Envy, Inappropriate Intimacy, Weak Domain Cohesion, Misleading Names). For these new findings, set "staticId" to null.
3. TRACEABILITY RULE: You MUST NOT claim PMD detected an issue unless it appears in the VERIFIED PMD list above.

Respond ONLY with valid, raw JSON adhering to this schema:
{
  "summary": "Synthesis of static and AI findings",
  "groundedEnrichments": [
    {
      "staticId": "static_xxx",
      "whyItMatters": "Deep contextual explanation of why this matters in this code",
      "suggestedFix": "Concrete refactoring advice",
      "originalSnippet": "Code snippet exhibiting the smell",
      "proposedSnippet": "Refactored Java code",
      "expectedBenefit": "Expected software quality benefit"
    }
  ],
  "additionalFindings": [
    {
      "rule": "Smell name (e.g., FeatureEnvy, InappropriateIntimacy, WeakCohesion)",
      "category": "Design | Architecture | Maintainability | DomainModeling",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
      "line": 10,
      "endLine": 20,
      "message": "Detailed explanation of the semantic smell",
      "whyItMatters": "Why this smell impairs maintainability or extensibility",
      "suggestedFix": "How to refactor",
      "originalSnippet": "Snippet exhibiting the smell",
      "proposedSnippet": "Refactored code snippet",
      "expectedBenefit": "Architecture benefit"
    }
  ]
}`;
}

/**
 * Runs the Grounded Hybrid Code Review:
 * 1. Executes real PMD static analysis.
 * 2. Feeds verified static findings + code to configured LLM.
 * 3. Synthesizes findings with traceable attribution:
 *    - HYBRID_CONFIRMED: PMD verified + AI contextual explanation & fix snippet
 *    - STATIC_ONLY: PMD rule violation without AI overlap
 *    - AI_ONLY: Purely semantic finding detected by AI
 *
 * @param {string} sourceCode - Raw Java code
 * @param {string} [fileName="SubmittedCode.java"] - Java filename
 * @param {object} [aiOptions={}] - AI configuration options
 * @returns {Promise<object>} Combined hybrid review results
 */
export async function runHybridAnalysis(sourceCode, fileName = 'SubmittedCode.java', aiOptions = {}) {
    const startTime = Date.now();

    // Step 1: Execute real PMD static analysis
    const staticResult = await runStaticAnalysis(sourceCode, fileName);
    const staticFindings = staticResult.findings || [];

    const provider = (aiOptions.provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const apiKey = aiOptions.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    const model = aiOptions.model || (provider === 'openai' ? 'gpt-4o' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');
    const temperature = typeof aiOptions.temperature === 'number' ? aiOptions.temperature : 0.0;

    // If no AI credentials configured, return static analysis with clear notification
    if (!apiKey && provider !== 'ollama') {
        return {
            mode: 'hybrid',
            status: 'PARTIAL_SUCCESS',
            warning: 'AI credentials not configured. Displaying verified static analysis findings. Configure an API key to enable grounded AI enrichment.',
            fileName: staticResult.fileName,
            totalViolations: staticFindings.length,
            attributionBreakdown: {
                hybridConfirmed: 0,
                staticOnly: staticFindings.length,
                aiOnly: 0
            },
            findings: staticFindings.map(f => ({
                ...f,
                source: 'STATIC_ONLY',
                sourceLabel: 'Static Analysis (PMD 7 - AI Skipped)'
            })),
            executionDurationMs: Date.now() - startTime,
            analyzedAt: new Date().toISOString()
        };
    }

    // Step 2: Feed code + verified static findings to LLM
    const hybridPrompt = buildHybridPrompt(sourceCode, staticFindings);
    let rawOutput = '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: hybridPrompt }] }],
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
                : (aiOptions.baseUrl || 'https://api.openai.com/v1/chat/completions');

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
                        { role: 'user', content: hybridPrompt }
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
            const baseUrl = aiOptions.baseUrl || 'http://localhost:11434/api/chat';
            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: model || 'codellama',
                    messages: [{ role: 'user', content: hybridPrompt }],
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
        }

    } finally {
        clearTimeout(timeout);
    }

    const parsed = sanitizeAndParseLLMJson(rawOutput);
    const enrichments = Array.isArray(parsed.groundedEnrichments) ? parsed.groundedEnrichments : [];
    const additionals = Array.isArray(parsed.additionalFindings) ? parsed.additionalFindings : [];

    // Map enrichments by staticId for rapid correlation
    const enrichmentMap = new Map();
    for (const e of enrichments) {
        if (e.staticId) {
            enrichmentMap.set(e.staticId, e);
        }
    }

    // Step 3: Correlate Static Findings with AI Enrichments
    let hybridCount = 0;
    let staticOnlyCount = 0;
    const mergedFindings = [];

    for (const sf of staticFindings) {
        const matchingEnrichment = enrichmentMap.get(sf.id);

        if (matchingEnrichment) {
            hybridCount++;
            mergedFindings.push({
                ...sf,
                source: 'HYBRID_CONFIRMED',
                sourceLabel: `Hybrid (PMD Verified + ${provider.toUpperCase()} Enriched)`,
                whyItMatters: matchingEnrichment.whyItMatters || sf.whyItMatters,
                suggestedFix: matchingEnrichment.suggestedFix || sf.suggestedFix,
                originalSnippet: matchingEnrichment.originalSnippet || sf.snippet,
                proposedSnippet: matchingEnrichment.proposedSnippet || '',
                expectedBenefit: matchingEnrichment.expectedBenefit || 'Elimination of verified static defect with contextual architecture refactoring.'
            });
        } else {
            staticOnlyCount++;
            mergedFindings.push({
                ...sf,
                source: 'STATIC_ONLY',
                sourceLabel: 'Static Analysis (PMD 7)'
            });
        }
    }

    // Step 4: Append Complementary Semantic AI Findings
    let aiOnlyCount = 0;
    for (const af of additionals) {
        // Prevent duplicate findings if AI repeated an issue at same line with same rule
        const isDuplicate = staticFindings.some(sf =>
            sf.line === af.line && sf.rule.toLowerCase() === (af.rule || '').toLowerCase()
        );

        if (!isDuplicate) {
            aiOnlyCount++;
            mergedFindings.push({
                id: `ai_${uuidv4().substring(0, 8)}`,
                rule: af.rule || 'SemanticSmell',
                category: af.category || 'Architecture & Design',
                severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(String(af.severity).toUpperCase())
                    ? String(af.severity).toUpperCase()
                    : 'MEDIUM',
                line: typeof af.line === 'number' ? af.line : 1,
                endLine: typeof af.endLine === 'number' ? af.endLine : (typeof af.line === 'number' ? af.line : 1),
                column: 1,
                message: af.message || 'Semantic code quality concern detected by AI model',
                whyItMatters: af.whyItMatters || 'Potential degradation of architectural maintainability.',
                suggestedFix: af.suggestedFix || 'Refactor according to clean domain design.',
                originalSnippet: af.originalSnippet || '',
                proposedSnippet: af.proposedSnippet || '',
                expectedBenefit: af.expectedBenefit || 'Improved cohesion and modular encapsulation.',
                source: 'AI_ONLY',
                sourceLabel: `AI Semantic Detector (${model})`,
                externalInfoUrl: ''
            });
        }
    }

    const duration = Date.now() - startTime;

    return {
        mode: 'hybrid',
        status: 'SUCCESS',
        summary: parsed.summary || 'Hybrid static-AI analysis completed successfully.',
        provider: provider,
        model: model,
        fileName: staticResult.fileName,
        totalViolations: mergedFindings.length,
        attributionBreakdown: {
            hybridConfirmed: hybridCount,
            staticOnly: staticOnlyCount,
            aiOnly: aiOnlyCount
        },
        findings: mergedFindings,
        executionDurationMs: duration,
        analyzedAt: new Date().toISOString()
    };
}
