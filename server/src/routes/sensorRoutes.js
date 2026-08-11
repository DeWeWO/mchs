const express = require('express');
const router = express.Router();
const { checkRole } = require('../middlewares/authMiddleware');
const { ROLES } = require('../constants/enums');
const { processIotData } = require('../controllers/deviceController');

const toBoolean = (value) => value === true || value === 1 || value === '1' || value === 'true';
const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

router.get('/', checkRole([ROLES.SUPER_ADMIN, ROLES.MCHS_USER, ROLES.ADMIN, ROLES.ORG_OPERATOR]), (req, res) => {
    res.json({
        status: 'ok',
        message: 'Legacy endpoint is active. Prefer POST /api/devices/iot/data for device telemetry.'
    });
});

router.post('/', async (req, res) => {
    try {
        const { token, alarm, fire, quake, lpg, gas, co, temp, battery, smoke, methane } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Device token is required' });
        }

        const gasLevel = Math.max(toNumber(gas), toNumber(co), toNumber(lpg));
        const quakeMagnitude = toBoolean(quake) ? 5 : toNumber(quake);
        const smokeDetected = toBoolean(smoke) || toBoolean(fire) || toBoolean(alarm);
        const methaneLevel = toNumber(methane, toNumber(lpg));

        const result = await processIotData({
            token,
            gas: gasLevel,
            smoke: smokeDetected,
            quake: quakeMagnitude,
            methane: methaneLevel,
            battery,
            temp,
            raw: req.body
        }, req.io);

        if (!result) return res.status(404).json({ command: 'RESET' });

        res.json({ command: result.command });
    } catch (error) {
        console.error('[SENSOR] Error processing data:', error);
        res.status(500).json({ error: 'Failed to process sensor data' });
    }
});

module.exports = router;
