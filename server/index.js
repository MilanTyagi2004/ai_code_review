import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

import analyzeRouter from './routes/analyze.js';
import evaluationRouter from './routes/evaluation.js';
import historyRouter from './routes/history.js';
import configRouter from './routes/config.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security and middleware setup
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-ai-provider']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'Automated Code Review Engine',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Mount application API routers
app.use('/api/analyze', analyzeRouter);
app.use('/api/evaluation', evaluationRouter);
app.use('/api/history', historyRouter);
app.use('/api/config', configRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[SERVER ERROR]', err.message);

    // Sanitize any accidentally exposed API keys from error message
    const sanitizedMessage = String(err.message || 'Internal Server Error')
        .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza[REDACTED]')
        .replace(/sk-[0-9A-Za-z]{32,}/g, 'sk-[REDACTED]');

    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        error: sanitizedMessage,
        code: err.code || 'INTERNAL_ERROR'
    });
});

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(` Automated Code Review & Quality System API Server `);
        console.log(` Listening on: http://localhost:${PORT} `);
        console.log(` Static Analyzer: PMD 7.28.0 (Operational) `);
        console.log(`=======================================================`);
    });
}

export default app;
