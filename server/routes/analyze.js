import express from 'express';
import multer from 'multer';
import path from 'path';
import { runStaticAnalysis } from '../services/staticAnalyzer.js';
import { runAIAnalysis } from '../services/aiAnalyzer.js';
import { runHybridAnalysis } from '../services/hybridAnalyzer.js';
import { saveAnalysis } from '../services/db.js';

const router = express.Router();

// Configure multer memory storage with 500KB file limit and .java extension check
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 }, // 500 KB limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.java') {
            return cb(new Error('Invalid file type: Only .java source files are permitted.'));
        }
        cb(null, true);
    }
});

/**
 * Validates Java source code input.
 */
function validateJavaInput(sourceCode) {
    if (!sourceCode || typeof sourceCode !== 'string') {
        throw new Error('Java source code is required.');
    }
    const trimmed = sourceCode.trim();
    if (trimmed.length === 0) {
        throw new Error('Submitted Java code cannot be empty.');
    }
    if (trimmed.length > 500 * 1024) {
        throw new Error('Submitted Java code exceeds maximum allowed size (500 KB).');
    }
}

// Conditional upload middleware: only invoke multer when Content-Type is multipart/form-data
const handleUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        return upload.single('file')(req, res, next);
    }
    next();
};

/**
 * POST /api/analyze
 * Main code review analysis endpoint supporting static, ai, and hybrid modes.
 */
router.post('/', handleUpload, async (req, res, next) => {
    try {
        let sourceCode = req.body.sourceCode;
        let fileName = req.body.fileName || 'SubmittedCode.java';
        const mode = (req.body.mode || 'static').toLowerCase();

        // If file was uploaded via multipart form
        if (req.file) {
            sourceCode = req.file.buffer.toString('utf8');
            fileName = req.file.originalname;
        }

        // Validate Java input
        validateJavaInput(sourceCode);

        // Parse optional AI options
        let aiOptions = {};
        if (req.body.aiOptions) {
            aiOptions = typeof req.body.aiOptions === 'string'
                ? JSON.parse(req.body.aiOptions)
                : req.body.aiOptions;
        }

        // Support header-based API key
        if (req.headers['x-api-key']) {
            aiOptions.apiKey = req.headers['x-api-key'];
        }
        if (req.headers['x-ai-provider']) {
            aiOptions.provider = req.headers['x-ai-provider'];
        }

        let result;

        if (mode === 'static') {
            result = await runStaticAnalysis(sourceCode, fileName);
        } else if (mode === 'ai') {
            result = await runAIAnalysis(sourceCode, aiOptions);
            result.fileName = fileName;
        } else if (mode === 'hybrid') {
            result = await runHybridAnalysis(sourceCode, fileName, aiOptions);
        } else {
            return res.status(400).json({
                error: `Invalid analysis mode "${mode}". Supported modes: "static", "ai", "hybrid".`
            });
        }

        // Persist analysis in SQLite history
        const savedRecord = saveAnalysis(result, fileName);

        return res.json({
            success: true,
            ...savedRecord,
            sourceCode: sourceCode
        });

    } catch (err) {
        if (err.code === 'MISSING_API_KEY') {
            return res.status(400).json({
                error: err.message,
                code: 'MISSING_API_KEY',
                provider: err.provider,
                suggestion: 'You can still use "Static Analysis (PMD)" without an API key, or provide a key in Settings.'
            });
        }
        next(err);
    }
});

export default router;
