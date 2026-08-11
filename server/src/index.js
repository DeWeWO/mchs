require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const userRoutes = require('./routes/userRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const mchsRoutes = require('./routes/mchsRoutes');
const statsRoutes = require('./routes/statsRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const waterCameraRoutes = require('./routes/waterCameraRoutes');
const geocodingRoutes = require('./routes/geocodingRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const startWaterSafetyService = require('./services/waterSafetyService');
const startOfflineDeviceService = require('./services/offlineDeviceService');

const app = express();
const server = http.createServer(app);

const normalizeOrigin = (origin) => {
    const value = origin?.trim();
    if (!value) return null;

    try {
        return new URL(value).origin;
    } catch {
        return value.replace(/\/+$/, '');
    }
};

const allowedOrigins = [
    process.env.CORS_ORIGINS,
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:4173',
    'https://mchs.unusual.uz'
]
    .filter(Boolean)
    .flatMap((origins) => origins.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

const allowedOriginSet = new Set(allowedOrigins);

const corsOptions = {
    origin(origin, callback) {
        const requestOrigin = normalizeOrigin(origin);
        if (!requestOrigin || allowedOriginSet.has(requestOrigin)) return callback(null, true);

        console.warn(`[CORS] Blocked origin: ${requestOrigin}`);
        const error = new Error('Not allowed by CORS');
        error.status = 403;
        return callback(error);
    },
    credentials: true
};

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
    }
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE_IT')) {
    console.warn('[CONFIG] JWT_SECRET is missing or uses a placeholder value.');
}

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    req.io = io;
    next();
});

app.get('/api', (req, res) => {
    res.send('SERVER IS WORKING!');
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/mchs', mchsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/water-camera', waterCameraRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/sensor-data', sensorRoutes);

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.message === 'Not allowed by CORS') {
        return res.status(err.status || 403).json({ error: err.message });
    }

    console.error('[ERROR]', err);
    return res.status(err.status || err.statusCode || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : (err.message || 'Internal Server Error')
    });
});

startWaterSafetyService(io);
startOfflineDeviceService(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
