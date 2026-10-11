import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const DB_DIR = path.resolve('database');
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'reviews.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        mode TEXT NOT NULL,
        total_violations INTEGER NOT NULL,
        execution_duration_ms INTEGER NOT NULL,
        summary TEXT,
        created_at TEXT NOT NULL,
        result_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS human_evaluations (
        id TEXT PRIMARY KEY,
        analysis_id TEXT NOT NULL,
        finding_id TEXT NOT NULL,
        clarity_rating INTEGER NOT NULL,
        actionability_rating INTEGER NOT NULL,
        correctness_rating INTEGER NOT NULL,
        comments TEXT,
        evaluator_role TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS benchmark_runs (
        id TEXT PRIMARY KEY,
        dataset_name TEXT NOT NULL,
        total_samples INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        metrics_json TEXT NOT NULL
    );
`);

/**
 * Saves an analysis record to the database.
 */
export function saveAnalysis(analysisResult, originalFileName = 'SubmittedCode.java') {
    const id = `rev_${uuidv4().substring(0, 10)}`;
    const stmt = db.prepare(`
        INSERT INTO analyses (
            id, filename, mode, total_violations, execution_duration_ms, summary, created_at, result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        originalFileName,
        analysisResult.mode || 'static',
        analysisResult.totalViolations || (analysisResult.findings ? analysisResult.findings.length : 0),
        analysisResult.executionDurationMs || 0,
        analysisResult.summary || '',
        analysisResult.analyzedAt || new Date().toISOString(),
        JSON.stringify(analysisResult)
    );

    return { ...analysisResult, id };
}

/**
 * Retrieves all previous analyses in reverse chronological order.
 */
export function getAnalysesHistory(limit = 50) {
    const stmt = db.prepare(`
        SELECT id, filename, mode, total_violations, execution_duration_ms, summary, created_at
        FROM analyses
        ORDER BY created_at DESC
        LIMIT ?
    `);
    return stmt.all(limit);
}

/**
 * Retrieves a single analysis by its unique ID.
 */
export function getAnalysisById(id) {
    const stmt = db.prepare(`SELECT * FROM analyses WHERE id = ?`);
    const row = stmt.get(id);
    if (!row) return null;
    return {
        ...row,
        result: JSON.parse(row.result_json)
    };
}

/**
 * Deletes an analysis record.
 */
export function deleteAnalysis(id) {
    const stmt = db.prepare(`DELETE FROM analyses WHERE id = ?`);
    return stmt.run(id);
}

/**
 * Saves a human qualitative evaluation feedback record.
 */
export function saveHumanEvaluation({
    analysisId,
    findingId,
    clarityRating,
    actionabilityRating,
    correctnessRating,
    comments = '',
    evaluatorRole = 'Researcher / Developer'
}) {
    const id = `heval_${uuidv4().substring(0, 10)}`;
    const stmt = db.prepare(`
        INSERT INTO human_evaluations (
            id, analysis_id, finding_id, clarity_rating, actionability_rating, correctness_rating, comments, evaluator_role, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        analysisId,
        findingId,
        Math.min(5, Math.max(1, Number(clarityRating) || 3)),
        Math.min(5, Math.max(1, Number(actionabilityRating) || 3)),
        Math.min(5, Math.max(1, Number(correctnessRating) || 3)),
        comments,
        evaluatorRole,
        new Date().toISOString()
    );

    return { id, success: true };
}

/**
 * Retrieves all human evaluations for research summary.
 */
export function getHumanEvaluations() {
    const stmt = db.prepare(`
        SELECT * FROM human_evaluations ORDER BY created_at DESC
    `);
    const records = stmt.all();

    if (records.length === 0) {
        return {
            totalEvaluations: 0,
            averageClarity: 'Not evaluated',
            averageActionability: 'Not evaluated',
            averageCorrectness: 'Not evaluated',
            evaluations: []
        };
    }

    const avgClarity = (records.reduce((acc, r) => acc + r.clarity_rating, 0) / records.length).toFixed(2);
    const avgActionability = (records.reduce((acc, r) => acc + r.actionability_rating, 0) / records.length).toFixed(2);
    const avgCorrectness = (records.reduce((acc, r) => acc + r.correctness_rating, 0) / records.length).toFixed(2);

    return {
        totalEvaluations: records.length,
        averageClarity: Number(avgClarity),
        averageActionability: Number(avgActionability),
        averageCorrectness: Number(avgCorrectness),
        evaluations: records
    };
}

/**
 * Exports findings of an analysis as standard CSV string.
 */
export function exportFindingsAsCsv(analysisResult) {
    const findings = analysisResult.findings || [];
    const headers = [
        '"ID"',
        '"Rule/Smell"',
        '"Category"',
        '"Severity"',
        '"Source"',
        '"Line"',
        '"EndLine"',
        '"Message"',
        '"Why It Matters"',
        '"Suggested Fix"',
        '"Expected Benefit"'
    ];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    const rows = findings.map(f => [
        escapeCsv(f.id),
        escapeCsv(f.rule),
        escapeCsv(f.category),
        escapeCsv(f.severity),
        escapeCsv(f.sourceLabel || f.source),
        escapeCsv(f.line),
        escapeCsv(f.endLine),
        escapeCsv(f.message),
        escapeCsv(f.whyItMatters),
        escapeCsv(f.suggestedFix),
        escapeCsv(f.expectedBenefit)
    ].join(','));

    return [headers.join(','), ...rows].join('\r\n');
}

export default db;
