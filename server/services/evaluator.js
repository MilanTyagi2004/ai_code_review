import fs from 'fs';
import path from 'path';
import { runStaticAnalysis } from './staticAnalyzer.js';
import { runAIAnalysis } from './aiAnalyzer.js';
import { runHybridAnalysis } from './hybridAnalyzer.js';

// Built-in benchmark test fixtures with verified ground truth reference labels
export const BUILTIN_FIXTURES = [
    {
        id: 'fixture_clean',
        name: 'CleanSample.java',
        filePath: path.resolve('..', 'samples', 'CleanSample.java'),
        description: 'Clean Java class adhering to SOLID principles and clean coding standards.',
        expectedLabel: 'CLEAN',
        groundTruthSmells: [] // 0 expected defects (used for True Negative / FPR testing)
    },
    {
        id: 'fixture_complex_calc',
        name: 'ComplexCalculator.java',
        filePath: path.resolve('..', 'samples', 'ComplexCalculator.java'),
        description: 'High cyclomatic complexity, cognitive complexity, deeply nested ifs, and long parameter list.',
        expectedLabel: 'SMELLY',
        groundTruthSmells: [
            { type: 'ExcessiveParameterList', category: 'Design', line: 9 },
            { type: 'AvoidDeeplyNestedIfStmts', category: 'Design', line: 12 },
            { type: 'CollapsibleIfStatements', category: 'Design', line: 11 },
            { type: 'CyclomaticComplexity', category: 'Complexity', line: 9 }
        ]
    },
    {
        id: 'fixture_god_order',
        name: 'GodOrderManager.java',
        filePath: path.resolve('..', 'samples', 'GodOrderManager.java'),
        description: 'MLCQ canonical smells: God Class / Blob, Data Class, Feature Envy, Long Method.',
        expectedLabel: 'SMELLY',
        groundTruthSmells: [
            { type: 'GodClass', category: 'Design', line: 11 },
            { type: 'DataClass', category: 'Design', line: 14 },
            { type: 'FeatureEnvy', category: 'Design', line: 29 },
            { type: 'LongMethod', category: 'Complexity', line: 29 }
        ]
    },
    {
        id: 'fixture_resource_leak',
        name: 'ResourceLeakDemo.java',
        filePath: path.resolve('..', 'samples', 'ResourceLeakDemo.java'),
        description: 'CloseResource unclosed streams, empty catch block, unused private field, console logging.',
        expectedLabel: 'SMELLY',
        groundTruthSmells: [
            { type: 'CloseResource', category: 'ErrorProne', line: 18 },
            { type: 'CloseResource', category: 'ErrorProne', line: 19 },
            { type: 'EmptyCatchBlock', category: 'ErrorProne', line: 40 },
            { type: 'UnusedPrivateField', category: 'BestPractices', line: 14 },
            { type: 'SystemPrintln', category: 'BestPractices', line: 39 }
        ]
    }
];

/**
 * Normalizes rule and smell names for fuzzy matching between static tools and AI models.
 */
function normalizeSmellType(name) {
    if (!name) return '';
    const clean = name.toLowerCase().replace(/[\s\-_]/g, '');

    if (clean.includes('longmethod') || clean.includes('excessivemethod') || clean.includes('brainmethod')) return 'longmethod';
    if (clean.includes('godclass') || clean.includes('largeclass') || clean.includes('blob') || clean.includes('excessiveclass')) return 'godclass';
    if (clean.includes('dataclass')) return 'dataclass';
    if (clean.includes('featureenvy')) return 'featureenvy';
    if (clean.includes('longparameter') || clean.includes('excessiveparameter')) return 'excessiveparameterlist';
    if (clean.includes('closeresource') || clean.includes('resourceleak') || clean.includes('unclosed')) return 'closeresource';
    if (clean.includes('emptycatch')) return 'emptycatchblock';
    if (clean.includes('unusedfield') || clean.includes('unusedprivatefield')) return 'unusedprivatefield';
    if (clean.includes('cyclomatic') || clean.includes('cognitive') || clean.includes('deeplynested') || clean.includes('collapsible')) return 'complexity';
    if (clean.includes('systemprintln') || clean.includes('printstacktrace')) return 'badlogging';

    return clean;
}

/**
 * Checks whether a predicted finding matches a ground-truth reference smell.
 * Matching criterion: normalized smell type matches AND (line proximity within 8 lines OR same method/class).
 */
function isFindingMatchingGroundTruth(finding, truth) {
    const normFinding = normalizeSmellType(finding.rule);
    const normTruth = normalizeSmellType(truth.type);

    if (normFinding === normTruth) {
        if (!truth.line || !finding.line) return true;
        // Line proximity tolerance: within 8 lines
        return Math.abs(finding.line - truth.line) <= 8;
    }
    return false;
}

/**
 * Computes Precision, Recall, F1, and False Positive Rate honestly.
 */
function calculateMetrics({ tp, fp, fn, tn }) {
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : 'Not evaluated';
    const recall = (tp + fn) > 0 ? tp / (tp + fn) : 'Not evaluated';

    let f1 = 'Not evaluated';
    if (typeof precision === 'number' && typeof recall === 'number' && (precision + recall) > 0) {
        f1 = (2 * precision * recall) / (precision + recall);
    }

    const fpr = (fp + tn) > 0 ? fp / (fp + tn) : 'Not evaluated';
    const total = tp + tn + fp + fn;
    const accuracy = total > 0 ? (tp + tn) / total : 'Not evaluated';

    return {
        truePositives: tp,
        falsePositives: fp,
        falseNegatives: fn,
        trueNegatives: tn,
        precision: typeof precision === 'number' ? Number(precision.toFixed(4)) : precision,
        recall: typeof recall === 'number' ? Number(recall.toFixed(4)) : recall,
        f1Score: typeof f1 === 'number' ? Number(f1.toFixed(4)) : f1,
        falsePositiveRate: typeof fpr === 'number' ? Number(fpr.toFixed(4)) : fpr,
        accuracy: typeof accuracy === 'number' ? Number(accuracy.toFixed(4)) : accuracy
    };
}

/**
 * Evaluates a single analysis method against a list of test fixtures.
 */
async function evaluateMethodOnFixtures(methodName, fixtures, aiOptions) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    let totalRuntimeMs = 0;
    const fixtureReports = [];

    for (const fixture of fixtures) {
        let sourceCode = '';
        if (fixture.filePath && fs.existsSync(fixture.filePath)) {
            sourceCode = fs.readFileSync(fixture.filePath, 'utf8');
        } else if (fixture.codeSnippet) {
            sourceCode = fixture.codeSnippet;
        } else {
            continue;
        }

        const start = Date.now();
        let result;

        try {
            if (methodName === 'STATIC') {
                result = await runStaticAnalysis(sourceCode, fixture.name);
            } else if (methodName === 'AI') {
                result = await runAIAnalysis(sourceCode, aiOptions);
            } else {
                result = await runHybridAnalysis(sourceCode, fixture.name, aiOptions);
            }
        } catch (err) {
            fixtureReports.push({
                fixtureName: fixture.name,
                status: 'ERROR',
                errorMessage: err.message
            });
            continue;
        }

        const runtime = Date.now() - start;
        totalRuntimeMs += runtime;

        const predictedFindings = result.findings || [];
        const truthSmells = fixture.groundTruthSmells || [];

        // For clean code sample:
        if (truthSmells.length === 0) {
            if (predictedFindings.length === 0) {
                tn += 1;
            } else {
                fp += predictedFindings.length;
            }
        } else {
            const matchedTruthSet = new Set();
            let fixtureTp = 0;
            let fixtureFp = 0;

            for (const pf of predictedFindings) {
                const matchedTruth = truthSmells.find((ts, idx) =>
                    !matchedTruthSet.has(idx) && isFindingMatchingGroundTruth(pf, ts)
                );

                if (matchedTruth) {
                    matchedTruthSet.add(truthSmells.indexOf(matchedTruth));
                    fixtureTp++;
                    tp++;
                } else {
                    fixtureFp++;
                    fp++;
                }
            }

            const fixtureFn = truthSmells.length - matchedTruthSet.size;
            fn += fixtureFn;

            fixtureReports.push({
                fixtureName: fixture.name,
                expectedSmells: truthSmells.length,
                detectedFindings: predictedFindings.length,
                truePositives: fixtureTp,
                falsePositives: fixtureFp,
                falseNegatives: fixtureFn,
                runtimeMs: runtime
            });
        }
    }

    const metrics = calculateMetrics({ tp, fp, fn, tn });
    const avgRuntime = fixtures.length > 0 ? Math.round(totalRuntimeMs / fixtures.length) : 0;

    return {
        method: methodName,
        totalSamples: fixtures.length,
        averageRuntimeMs: avgRuntime,
        metrics: metrics,
        reports: fixtureReports
    };
}

/**
 * Runs comparative research benchmark across Static-Only, AI-Only, and Hybrid.
 *
 * @param {object} [aiOptions={}] - AI configuration credentials
 * @param {Array} [customFixtures=null] - Optional imported dataset fixtures
 * @returns {Promise<object>} Complete comparative benchmark evaluation
 */
export async function runComparativeEvaluation(aiOptions = {}, customFixtures = null) {
    const fixturesToRun = customFixtures && customFixtures.length > 0 ? customFixtures : BUILTIN_FIXTURES;

    const staticEval = await evaluateMethodOnFixtures('STATIC', fixturesToRun, aiOptions);

    let aiEval = null;
    let hybridEval = null;

    const hasAiKey = Boolean(aiOptions.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);

    if (hasAiKey) {
        aiEval = await evaluateMethodOnFixtures('AI', fixturesToRun, aiOptions);
        hybridEval = await evaluateMethodOnFixtures('HYBRID', fixturesToRun, aiOptions);
    } else {
        aiEval = {
            method: 'AI',
            status: 'SKIPPED',
            message: 'AI evaluation skipped: no API key configured. Static evaluation ran successfully.',
            metrics: { precision: 'Not evaluated', recall: 'Not evaluated', f1Score: 'Not evaluated', falsePositiveRate: 'Not evaluated' }
        };
        hybridEval = {
            method: 'HYBRID',
            status: 'SKIPPED',
            message: 'Hybrid evaluation skipped: no API key configured.',
            metrics: { precision: 'Not evaluated', recall: 'Not evaluated', f1Score: 'Not evaluated', falsePositiveRate: 'Not evaluated' }
        };
    }

    return {
        timestamp: new Date().toISOString(),
        dataset: customFixtures ? 'Custom Imported Dataset' : 'Built-in MLCQ-Aligned Java Benchmarks',
        totalSamples: fixturesToRun.length,
        staticAnalysis: staticEval,
        aiAnalysis: aiEval,
        hybridAnalysis: hybridEval
    };
}

/**
 * Evaluates Run-to-Run Consistency of AI-based review across repeated runs at Temperature=0.
 * Directly addresses research question on LLM determinism (Klishevich et al. / Ullah et al.).
 */
export async function runConsistencyExperiment(sourceCode, iterations = 3, aiOptions = {}) {
    if (!sourceCode || typeof sourceCode !== 'string') {
        throw new Error('Java source code is required for consistency evaluation');
    }

    const runs = [];
    const optionsWithZeroTemp = { ...aiOptions, temperature: 0.0 };

    for (let i = 0; i < iterations; i++) {
        const res = await runAIAnalysis(sourceCode, optionsWithZeroTemp);
        const findingsSummary = (res.findings || []).map(f => `${normalizeSmellType(f.rule)}@line${f.line}`);
        runs.push({
            runIndex: i + 1,
            totalFindings: res.findings.length,
            findingsSignatures: findingsSummary,
            durationMs: res.executionDurationMs
        });
    }

    // Compute pairwise Jaccard similarity across runs
    let totalJaccard = 0;
    let pairCount = 0;

    for (let i = 0; i < runs.length; i++) {
        for (let j = i + 1; j < runs.length; j++) {
            const setA = new Set(runs[i].findingsSignatures);
            const setB = new Set(runs[j].findingsSignatures);

            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const union = new Set([...setA, ...setB]);

            const jaccard = union.size > 0 ? intersection.size / union.size : 1.0;
            totalJaccard += jaccard;
            pairCount++;
        }
    }

    const avgAgreement = pairCount > 0 ? Number((totalJaccard / pairCount).toFixed(4)) : 1.0;

    return {
        iterations: iterations,
        temperature: 0.0,
        averageJaccardConsistency: avgAgreement,
        consistencyPercentage: `${(avgAgreement * 100).toFixed(1)}%`,
        runs: runs,
        researchFinding: avgAgreement >= 0.9
            ? 'High finding stability observed across repeated runs at T=0.'
            : 'Non-determinism observed across repeated runs despite T=0, confirming literature findings (Klishevich et al.).'
    };
}

/**
 * Validates and imports a custom user-supplied dataset (JSON or CSV).
 */
export function validateAndParseDataset(content, format = 'json') {
    if (!content || typeof content !== 'string') {
        throw new Error('Dataset content cannot be empty');
    }

    if (format === 'json') {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            throw new Error('JSON dataset must be an array of test sample objects');
        }

        return parsed.map((item, idx) => {
            if (!item.codeSnippet && !item.filePath) {
                throw new Error(`Sample at index ${idx} is missing 'codeSnippet' or 'filePath'`);
            }
            return {
                id: item.id || `custom_${idx + 1}`,
                name: item.name || `Sample_${idx + 1}.java`,
                codeSnippet: item.codeSnippet || '',
                filePath: item.filePath || null,
                description: item.description || 'Imported Java test case',
                expectedLabel: item.expectedLabel || 'SMELLY',
                groundTruthSmells: Array.isArray(item.groundTruthSmells) ? item.groundTruthSmells : []
            };
        });
    }

    // Basic CSV parser
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV dataset must contain a header and at least one data row');
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const codeIdx = header.findIndex(h => h.includes('code') || h.includes('snippet'));
    const smellIdx = header.findIndex(h => h.includes('smell') || h.includes('label') || h.includes('type'));

    if (codeIdx === -1) {
        throw new Error('CSV dataset must contain a "code" or "code_snippet" column');
    }

    return lines.slice(1).map((line, idx) => {
        const cols = line.split(',');
        const snippet = cols[codeIdx] ? cols[codeIdx].replace(/^"|"$/g, '').trim() : '';
        const smell = cols[smellIdx] ? cols[smellIdx].replace(/^"|"$/g, '').trim() : 'CodeSmell';

        return {
            id: `csv_${idx + 1}`,
            name: `Sample_${idx + 1}.java`,
            codeSnippet: snippet,
            description: `Imported CSV instance: ${smell}`,
            expectedLabel: smell && smell.toLowerCase() !== 'none' ? 'SMELLY' : 'CLEAN',
            groundTruthSmells: smell && smell.toLowerCase() !== 'none' ? [{ type: smell, line: 1 }] : []
        };
    });
}
