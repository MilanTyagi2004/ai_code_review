import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

import { runStaticAnalysis } from '../services/staticAnalyzer.js';
import { sanitizeAndParseLLMJson } from '../services/aiAnalyzer.js';
import { runHybridAnalysis } from '../services/hybridAnalyzer.js';
import { exportFindingsAsCsv, saveAnalysis, getAnalysisById } from '../services/db.js';
import { validateAndParseDataset } from '../services/evaluator.js';

describe('1. Static Code Analysis Service (PMD 7)', () => {

    test('runs real PMD static analysis on code with intentional smells', async () => {
        const samplePath = path.resolve('..', 'samples', 'TestSample.java');
        const code = fs.readFileSync(samplePath, 'utf8');

        const result = await runStaticAnalysis(code, 'TestSample.java');

        assert.equal(result.status, 'SUCCESS');
        assert.ok(result.totalViolations > 0, 'Expected violations to be detected');
        assert.ok(result.executionDurationMs > 0, 'Expected positive execution duration');

        // Verify that specific PMD rules were detected
        const rules = result.findings.map(f => f.rule);
        assert.ok(rules.includes('UnusedPrivateField') || rules.includes('AvoidDeeplyNestedIfStmts'),
            'Expected UnusedPrivateField or AvoidDeeplyNestedIfStmts in findings');

        // Verify finding structure
        const first = result.findings[0];
        assert.ok(first.id, 'Finding should have an ID');
        assert.ok(first.rule, 'Finding should have a rule name');
        assert.ok(first.category, 'Finding should have a category');
        assert.ok(first.severity, 'Finding should have a severity');
        assert.ok(first.line >= 1, 'Finding should have a valid line number');
        assert.equal(first.source, 'STATIC_ONLY');
    });

    test('returns 0 violations for clean Java code', async () => {
        const cleanPath = path.resolve('..', 'samples', 'CleanSample.java');
        const code = fs.readFileSync(cleanPath, 'utf8');

        const result = await runStaticAnalysis(code, 'CleanSample.java');

        assert.equal(result.status, 'SUCCESS');
        assert.equal(result.totalViolations, 0, 'Clean code should have 0 violations');
        assert.equal(result.findings.length, 0);
    });

    test('rejects empty Java input with an informative error', async () => {
        await assert.rejects(
            async () => await runStaticAnalysis('   \n  '),
            { message: 'Java source code cannot be empty' }
        );
    });
});

describe('2. AI Review Response Sanitization & Error Handling', () => {

    test('parses clean JSON from LLM response', () => {
        const raw = JSON.stringify({
            summary: 'Clean architecture',
            findings: [
                { rule: 'FeatureEnvy', severity: 'HIGH', line: 15, message: 'Class accesses external data excessively' }
            ]
        });

        const parsed = sanitizeAndParseLLMJson(raw);
        assert.equal(parsed.findings.length, 1);
        assert.equal(parsed.findings[0].rule, 'FeatureEnvy');
    });

    test('strips markdown code fences from LLM responses', () => {
        const raw = '```json\n{\n  "summary": "Detected smells",\n  "findings": []\n}\n```';
        const parsed = sanitizeAndParseLLMJson(raw);
        assert.equal(parsed.summary, 'Detected smells');
        assert.deepEqual(parsed.findings, []);
    });

    test('handles trailing commas and extra commentary around JSON', () => {
        const raw = 'Here is the analysis:\n{\n  "summary": "Analysis completed",\n  "findings": [],\n}\nHope this helps!';
        const parsed = sanitizeAndParseLLMJson(raw);
        assert.equal(parsed.summary, 'Analysis completed');
    });

    test('throws descriptive error on malformed unparseable text', () => {
        assert.throws(
            () => sanitizeAndParseLLMJson('This is just plain text without any JSON brackets at all.'),
            /Failed to parse structured JSON from LLM/
        );
    });
});

describe('3. Grounded Hybrid Analysis Attribution & Fallback', () => {

    test('falls back gracefully to verified static findings when AI key is missing', async () => {
        const code = `package test;
public class Demo {
    private int deadField = 10;
}`;
        // Call without API key
        const result = await runHybridAnalysis(code, 'Demo.java', { apiKey: '' });

        assert.equal(result.mode, 'hybrid');
        assert.equal(result.status, 'PARTIAL_SUCCESS');
        assert.ok(result.warning.includes('AI credentials not configured'));
        assert.ok(result.findings.length > 0);
        assert.equal(result.attributionBreakdown.staticOnly, result.findings.length);
        assert.equal(result.attributionBreakdown.hybridConfirmed, 0);
    });
});

describe('4. Evaluation Metric Calculations & Dataset Validation', () => {

    test('validates and parses custom JSON benchmark dataset', () => {
        const sampleJson = JSON.stringify([
            {
                name: 'TestItem.java',
                codeSnippet: 'public class TestItem { public void run() {} }',
                expectedLabel: 'SMELLY',
                groundTruthSmells: [{ type: 'LongMethod', line: 1 }]
            }
        ]);

        const parsed = validateAndParseDataset(sampleJson, 'json');
        assert.equal(parsed.length, 1);
        assert.equal(parsed[0].name, 'TestItem.java');
        assert.equal(parsed[0].groundTruthSmells[0].type, 'LongMethod');
    });

    test('rejects malformed datasets missing code snippets', () => {
        const invalidJson = JSON.stringify([{ name: 'NoCode.java' }]);
        assert.throws(
            () => validateAndParseDataset(invalidJson, 'json'),
            /missing 'codeSnippet' or 'filePath'/
        );
    });
});

describe('5. Database Persistence & Export Functionality', () => {

    test('saves analysis and retrieves by ID', () => {
        const dummyResult = {
            mode: 'static',
            totalViolations: 2,
            executionDurationMs: 120,
            summary: 'Test summary',
            analyzedAt: new Date().toISOString(),
            findings: [
                { id: 'f1', rule: 'UnusedPrivateField', severity: 'MEDIUM', line: 5, message: 'Unused' },
                { id: 'f2', rule: 'AvoidDeeplyNestedIfStmts', severity: 'HIGH', line: 12, message: 'Nested' }
            ]
        };

        const saved = saveAnalysis(dummyResult, 'TestRun.java');
        assert.ok(saved.id, 'Saved record should receive unique ID');

        const fetched = getAnalysisById(saved.id);
        assert.ok(fetched);
        assert.equal(fetched.filename, 'TestRun.java');
        assert.equal(fetched.total_violations, 2);
    });

    test('exports findings to valid CSV format', () => {
        const analysis = {
            findings: [
                {
                    id: 'f1',
                    rule: 'CloseResource',
                    category: 'ErrorProne',
                    severity: 'HIGH',
                    sourceLabel: 'PMD 7',
                    line: 20,
                    endLine: 20,
                    message: 'Unclosed stream',
                    whyItMatters: 'Resource leak',
                    suggestedFix: 'Use try-with-resources',
                    expectedBenefit: 'Safe descriptor disposal'
                }
            ]
        };

        const csv = exportFindingsAsCsv(analysis);
        assert.ok(csv.startsWith('"ID","Rule/Smell"'), 'CSV should start with expected headers');
        assert.ok(csv.includes('"CloseResource"'), 'CSV should contain rule name');
        assert.ok(csv.includes('"Use try-with-resources"'), 'CSV should contain suggested fix');
    });
});
