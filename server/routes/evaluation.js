import express from 'express';
import {
    runComparativeEvaluation,
    runConsistencyExperiment,
    validateAndParseDataset,
    BUILTIN_FIXTURES
} from '../services/evaluator.js';
import {
    saveHumanEvaluation,
    getHumanEvaluations
} from '../services/db.js';

const router = express.Router();

/**
 * GET /api/evaluation/fixtures
 * Returns information about the built-in benchmark fixtures and ground truth labels.
 */
router.get('/fixtures', (req, res) => {
    res.json({
        fixtures: BUILTIN_FIXTURES.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            expectedLabel: f.expectedLabel,
            groundTruthSmellsCount: f.groundTruthSmells.length,
            groundTruthSmells: f.groundTruthSmells
        }))
    });
});

/**
 * POST /api/evaluation/run
 * Executes the comparative research benchmark across Static, AI, and Hybrid.
 */
router.post('/run', async (req, res, next) => {
    try {
        let aiOptions = req.body.aiOptions || {};
        if (req.headers['x-api-key']) {
            aiOptions.apiKey = req.headers['x-api-key'];
        }
        if (req.headers['x-ai-provider']) {
            aiOptions.provider = req.headers['x-ai-provider'];
        }

        const customFixtures = req.body.customFixtures || null;
        const evaluationResults = await runComparativeEvaluation(aiOptions, customFixtures);

        res.json({
            success: true,
            ...evaluationResults
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/evaluation/consistency
 * Evaluates repeated-run consistency of AI smell detection at T=0.
 */
router.post('/consistency', async (req, res, next) => {
    try {
        const { sourceCode, iterations = 3 } = req.body;
        if (!sourceCode) {
            return res.status(400).json({ error: 'Source code is required for consistency evaluation.' });
        }

        let aiOptions = req.body.aiOptions || {};
        if (req.headers['x-api-key']) {
            aiOptions.apiKey = req.headers['x-api-key'];
        }

        const consistencyResult = await runConsistencyExperiment(sourceCode, Math.min(5, Math.max(2, iterations)), aiOptions);

        res.json({
            success: true,
            ...consistencyResult
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/evaluation/import
 * Imports and validates custom dataset (MLCQ or CSV/JSON benchmark).
 */
router.post('/import', (req, res, next) => {
    try {
        const { content, format = 'json' } = req.body;
        const parsedFixtures = validateAndParseDataset(content, format);

        res.json({
            success: true,
            message: `Successfully validated and imported ${parsedFixtures.length} benchmark samples.`,
            sampleCount: parsedFixtures.length,
            fixtures: parsedFixtures
        });
    } catch (err) {
        res.status(400).json({
            error: err.message,
            suggestion: 'Ensure dataset matches JSON schema ([{ name, codeSnippet, groundTruthSmells: [{ type, line }] }]) or CSV format.'
        });
    }
});

/**
 * POST /api/evaluation/human
 * Saves human feedback rating explanation clarity, actionability, and correctness.
 */
router.post('/human', (req, res, next) => {
    try {
        const {
            analysisId,
            findingId,
            clarityRating,
            actionabilityRating,
            correctnessRating,
            comments,
            evaluatorRole
        } = req.body;

        if (!analysisId || !findingId) {
            return res.status(400).json({ error: 'analysisId and findingId are required.' });
        }

        const result = saveHumanEvaluation({
            analysisId,
            findingId,
            clarityRating,
            actionabilityRating,
            correctnessRating,
            comments,
            evaluatorRole
        });

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/evaluation/human
 * Retrieves aggregated human qualitative evaluation statistics.
 */
router.get('/human', (req, res) => {
    const summary = getHumanEvaluations();
    res.json(summary);
});

export default router;
