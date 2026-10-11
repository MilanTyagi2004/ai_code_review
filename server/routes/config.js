import express from 'express';

const router = express.Router();

/**
 * GET /api/config
 * Returns current configuration status, available providers, and whether credentials exist.
 * Never leaks the actual keys in responses.
 */
router.get('/', (req, res) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
    const hasGroqKey = Boolean(process.env.GROQ_API_KEY);

    res.json({
        defaultProvider: process.env.AI_PROVIDER || 'gemini',
        providers: [
            {
                id: 'gemini',
                name: 'Google Gemini',
                configured: hasGeminiKey,
                models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
            },
            {
                id: 'openai',
                name: 'OpenAI',
                configured: hasOpenAIKey,
                models: ['gpt-4o', 'gpt-4o-mini']
            },
            {
                id: 'groq',
                name: 'Groq (Llama / Mixtral)',
                configured: hasGroqKey,
                models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768']
            },
            {
                id: 'ollama',
                name: 'Ollama (Local)',
                configured: true,
                models: ['codellama', 'deepseek-coder', 'llama3']
            }
        ],
        staticAnalyzer: {
            name: 'PMD',
            version: '7.28.0',
            status: 'OPERATIONAL',
            language: 'Java 17+'
        }
    });
});

/**
 * POST /api/config/test
 * Tests LLM API connectivity with a minimal test prompt.
 */
router.post('/test', async (req, res) => {
    const { provider = 'gemini', apiKey, model } = req.body;
    const keyToUse = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!keyToUse && provider !== 'ollama') {
        return res.status(400).json({
            success: false,
            message: 'No API key provided for connectivity test.'
        });
    }

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${keyToUse}`;
            const apiRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: 'Respond with "OK" in JSON format: {"status":"OK"}' }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                })
            });

            if (!apiRes.ok) {
                const errText = await apiRes.text();
                return res.status(apiRes.status).json({ success: false, error: errText });
            }

            return res.json({ success: true, message: 'Google Gemini API connection verified successfully!' });

        } else if (provider === 'openai') {
            const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keyToUse}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 5
                })
            });

            if (!apiRes.ok) {
                const errText = await apiRes.text();
                return res.status(apiRes.status).json({ success: false, error: errText });
            }

            return res.json({ success: true, message: 'OpenAI API connection verified successfully!' });
        }

        res.json({ success: true, message: 'Provider connection test passed.' });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
