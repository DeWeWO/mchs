const prisma = require('../config/db');

// URL внешнего API
const AI_API_URL = process.env.WATER_AI_API_URL || 'https://ai-detector-e2x2.onrender.com/api/status';

// Интервал опроса (3 секунды)
const POLL_INTERVAL = Number(process.env.WATER_AI_POLL_INTERVAL_MS) || 3000;

/**
 * Сервис для опроса AI камеры и отправки алертов через сокеты
 * @param {Server} io - Экземпляр Socket.IO
 */
const startWaterSafetyService = (io) => {
    console.log('✅ Water Safety Service started...');

    setInterval(async () => {
        try {
            // 1. Получаем настройки камеры из БД (координаты)
            const camera = await prisma.waterCamera.findFirst();

            // Дефолтные координаты (если камера не настроена)
            const cameraSettings = camera || {
                lat: 41.55,
                lng: 60.63,
                name: 'Main Water Camera'
            };

            // 2. Опрашиваем внешний API
            // Используем встроенный fetch (Node.js 18+)
            const response = await fetch(AI_API_URL);

            if (!response.ok) {
                // console.warn(`⚠️ AI API Error: ${response.statusText}`);
                return;
            }

            const data = await response.json();

            // API возвращает массив алертов. Берем первый элемент.
            // Пример: [{ status: 'danger', message: '...', time: '...' }]
            if (Array.isArray(data) && data.length > 0) {
                const latestAlert = data[0];
                const currentStatus = latestAlert.status;
                const lastStatus = global.lastWaterStatus || 'unknown';

                // Логируем ТОЛЬКО смену статуса
                if (currentStatus !== lastStatus) {
                    console.log(`🌊 STATUS CHANGE: ${lastStatus} -> ${currentStatus.toUpperCase()} [${new Date().toLocaleTimeString()}]`);
                    global.lastWaterStatus = currentStatus;
                }

                // 3. Проверяем статус
                if (currentStatus === 'danger') {
                    // console.log(` WATER DANGER DETECTED! Sending alert...`);

                    // 4. Отправляем сокет-событие всем клиентам
                    io.emit('water-alert', {
                        active: true,
                        status: 'danger',
                        message: latestAlert.message || 'ОПАСНОСТЬ НА ВОДЕ!',
                        image_url: latestAlert.image_url, // <-- Новое поле
                        lat: cameraSettings.lat,
                        lng: cameraSettings.lng,
                        timestamp: new Date()
                    });
                } else {
                    // Можно отправлять heartbeat, что все спокойно (опционально)
                    io.emit('water-alert', {
                        active: false,
                        status: 'safe',
                        lat: cameraSettings.lat,
                        lng: cameraSettings.lng
                    });
                }
            }

        } catch (error) {
            console.error('❌ Water Safety Polling Error:', error.message);
        }
    }, POLL_INTERVAL);
};

module.exports = startWaterSafetyService;
