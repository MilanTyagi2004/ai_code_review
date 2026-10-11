import express from 'express';
import {
    getAnalysesHistory,
    getAnalysisById,
    deleteAnalysis,
    exportFindingsAsCsv
} from '../services/db.js';

const router = express.Router();

/**
 * GET /api/history
 * Lists historical analyses.
 */
router.get('/', (req, res) => {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const history = getAnalysesHistory(limit);
    res.json({ history });
});

/**
 * GET /api/history/:id
 * Retrieves full report of a specific past analysis.
 */
router.get('/:id', (req, res) => {
    const record = getAnalysisById(req.params.id);
    if (!record) {
        return res.status(404).json({ error: `Analysis with ID "${req.params.id}" not found.` });
    }
    res.json(record);
});

/**
 * GET /api/history/:id/export/json
 * Downloads the full analysis result as a structured JSON file.
 */
router.get('/:id/export/json', (req, res) => {
    const record = getAnalysisById(req.params.id);
    if (!record) {
        return res.status(404).json({ error: 'Analysis not found' });
    }

    const filename = `code_review_${record.id}_${record.mode}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(record.result, null, 2));
});

/**
 * GET /api/history/:id/export/csv
 * Downloads the analysis findings as a CSV file.
 */
router.get('/:id/export/csv', (req, res) => {
    const record = getAnalysisById(req.params.id);
    if (!record) {
        return res.status(404).json({ error: 'Analysis not found' });
    }

    const csvData = exportFindingsAsCsv(record.result);
    const filename = `code_review_findings_${record.id}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
});

/**
 * DELETE /api/history/:id
 * Deletes an analysis record.
 */
router.delete('/:id', (req, res) => {
    const deleted = deleteAnalysis(req.params.id);
    res.json({ success: true, deletedCount: deleted.changes });
});

export default router;
