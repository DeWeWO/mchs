const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');

// Получаем ключ API из переменных окружения
const MAPTILER_KEY = process.env.MAPTILER_KEY;

// GET /api/geocoding/search?q=London
router.get('/search', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.MAP_OPERATOR]), async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        if (!MAPTILER_KEY) {
            console.error('SERVER ERROR: MAPTILER_KEY is missing in .env');
            return res.status(500).json({ error: 'Server misconfiguration: API Key missing' });
        }

        const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${MAPTILER_KEY}&language=ru&limit=5`;
        console.log(`[GEOCODING] Proxying request to: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`[GEOCODING] API Error: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ error: 'Upstream API error' });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('[GEOCODING] Server Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
