import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ShieldAlert, Siren, Camera, Save, Navigation, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { API_URL, SOCKET_URL, WEATHER_COORDS } from '../config/env';
import { useToast } from '../context/ToastContext';

const API_KEY = import.meta.env.VITE_MAPTILER_KEY;

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

export default function HazardsMap() {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const cameraMarkerRef = useRef(null);
    const sensorMarkerRef = useRef(null); // ESP32 Sensor marker
    const { addToast } = useToast();

    // --- STATE ---
    const [waterCamera, setWaterCamera] = useState(null); // { lat, lng, name }
    const [waterAlert, setWaterAlert] = useState(null);   // { active, status, message ... }
    const [isSaving, setIsSaving] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Logic: Mute alert until "Safe" status comes again
    const isMutedRef = useRef(false);

    // 1. Загрузка настроек камеры и устройств (в будущем)
    useEffect(() => {
        // Загружаем камеру
        fetch(`${API_URL}/water-camera`, { headers: getAuthHeader() })
            .then(res => res.json())
            .then(data => {
                if (data.lat && data.lng) {
                    setWaterCamera(data);
                } else {
                    // Дефолт (если нет в БД)
                    setWaterCamera({ lat: WEATHER_COORDS.lat, lng: WEATHER_COORDS.lon, name: 'AI Camera 1' });
                }
            })
            .catch(err => {
                console.error("Ошибка загрузки камеры:", err);
                // Дефолт на случай ошибки
                setWaterCamera({ lat: WEATHER_COORDS.lat, lng: WEATHER_COORDS.lon, name: 'AI Camera 1' });
            });
    }, []);

    // 2. Инициализация карты
    useEffect(() => {
        if (map.current || !waterCamera) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${API_KEY}`,
            center: [waterCamera.lng, waterCamera.lat],
            zoom: 13,
            pitch: 45, // Немного наклона для 3D эффекта
            attributionControl: false,
        });

        // Добавляем контролы навигации
        map.current.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

        map.current.on('load', () => {
            setMapLoaded(true);
            map.current.resize();

            // Создаем маркер камеры
            createCameraMarker(waterCamera.lng, waterCamera.lat);

            // Создаем маркер БАЗЫ МЧС
            const elBase = document.createElement('div');
            elBase.className = 'base-marker-container';
            elBase.innerHTML = `
                <div class="base-pulse"></div>
                <div class="base-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="M12 8v4"/>
                        <path d="M12 16h.01"/>
                    </svg>
                </div>
                <div class="base-label">ЦУКС МЧС</div>
            `;

            // Координаты базы (Захардкодим или возьмем из конфига, если есть импорт)
            // Лучше импортировать, но пока для надежности пропишем здесь, если импорта нет.
            // ... стоп, я могу добавить импорт.
            new maplibregl.Marker({ element: elBase })
                .setLngLat([WEATHER_COORDS.lon, WEATHER_COORDS.lat])
                .addTo(map.current);
        });

        // 3. SOCKET.IO (Слушаем тревогу)
        const socket = io(SOCKET_URL);

        socket.on('water-alert', (alert) => {
            // alert: { active: true, status: 'danger', lat, lng, message }

            if (alert.status === 'safe') {
                // Если пришел статус SAFE - сбрасываем состояние "Muted",
                // чтобы следующая тревога снова сработала.
                isMutedRef.current = false;
                setWaterAlert(null);
                updateMarkerVisuals(false);
            }
            else if (alert.status === 'danger') {
                // Если статус DANGER, проверяем, не скрыл ли пользователь тревогу
                if (!isMutedRef.current) {
                    setWaterAlert(alert);
                    updateMarkerVisuals(true);
                }
            }
        });

        // 4. ESP32 SENSOR DATA
        socket.on('sensor-update', (data) => {
            console.log('[SENSOR] Data received on map:', data);
            if (!map.current) return;

            // Remove old sensor marker
            if (sensorMarkerRef.current) sensorMarkerRef.current.remove();

            const isAlarm = data.alarm || data.fire || data.quake;
            const el = document.createElement('div');
            el.className = `sensor-marker ${isAlarm ? 'status-danger' : 'status-good'}`;
            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
            el.title = `ESP32: ${data.temp}°C | LPG: ${data.gas_levels?.lpg || 0} | CO: ${data.gas_levels?.co || 0}`;

            // Координаты датчика (дефолт - Ургенч)
            const sensorLat = Number(data.lat) || waterCamera.lat;
            const sensorLng = Number(data.lng) || waterCamera.lng;

            sensorMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([sensorLng, sensorLat])
                .addTo(map.current);
        });

        // 5. ESP32 ALARM
        socket.on('sensor-alarm', (alarm) => {
            console.log('[SENSOR ALARM]', alarm);
            addToast(`🚨 ${alarm.message}`, 'error');
        });

        return () => {
            socket.disconnect();
            map.current?.remove();
            map.current = null;
        };
    }, [waterCamera]); // Пересоздаем карту только если загрузились начальные данные камеры

    // --- ФУНКЦИИ ---

    // Создание маркера
    const createCameraMarker = (lng, lat) => {
        if (cameraMarkerRef.current) cameraMarkerRef.current.remove();

        const el = document.createElement('div');
        el.className = 'camera-marker-container';
        el.innerHTML = `
            <div class="range-circle"></div>
            <div class="radar-scan"></div>
            <div class="camera-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 19a7 7 0 0 1-7-7"/>
                    <path d="M12 5a7 7 0 0 1 7 7"/>
                </svg>
            </div>
            <div class="camera-label">AI VISION</div>
        `;

        cameraMarkerRef.current = new maplibregl.Marker({
            element: el,
            draggable: true
        })
            // Offset коррекция не нужна, если мы центрируем через flex в CSS, 
            // но maplibre позиционирует top-left угол элемента в координату.
            // Если у нас width/height 40px, то центр элемента смещен.
            // MapLibre Marker по умолчанию центрирует, если элемент не 'img'. 
            // Но проверим визуально. Обычно для кастомных div нужен offset [0, 0] если css translate работает, или offset [0, -height/2] для пинов.
            // В нашем случае CSS translate(-50%, -50%) нет на контейнере, но есть flex center.
            .setLngLat([lng, lat])
            .addTo(map.current);

        // Слушаем перетаскивание
        cameraMarkerRef.current.on('dragend', () => {
            const { lng, lat } = cameraMarkerRef.current.getLngLat();
            setWaterCamera(prev => ({ ...prev, lng, lat }));
        });
    };

    // Обновление стилей маркера при тревоге
    const updateMarkerVisuals = (isDanger) => {
        if (!cameraMarkerRef.current) return;
        const el = cameraMarkerRef.current.getElement();
        if (isDanger) {
            el.classList.add('is-danger');
        } else {
            el.classList.remove('is-danger');
        }
    };

    // Сохранение координат в БД
    const saveCameraLocation = async () => {
        setIsSaving(true);
        try {
            await fetch(`${API_URL}/water-camera`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify(waterCamera)
            });
            addToast("Позиция камеры обновлена", "success");
        } catch (e) {
            console.error(e);
            addToast("Ошибка сохранения", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDismiss = () => {
        setWaterAlert(null);
        isMutedRef.current = true; // Блокируем показ до следующего 'safe'
        addToast("Тревога скрыта. Оповещение возобновится при новом инциденте.", "info");
    };

    return (
        <div className="w-full h-full relative bg-[#0b0f19] overflow-hidden font-sans">
            {/* CARD CONTAINER */}
            <div ref={mapContainer} className="absolute inset-0 z-0" />

            {/* ХЕДЕР (Плавающий) */}
            <div className="absolute top-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl"
                >
                    <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/50">
                            <ShieldAlert className="text-white" size={24} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">
                            Система Мониторинга
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">
                                AI WATER SAFETY ACTIVE
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ЕЩЕ НЕ ЗАГРУЗИЛОСЬ */}
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f19] z-50">
                    <div className="animate-spin text-blue-500">
                        <Navigation size={40} />
                    </div>
                </div>
            )}

            {/* КНОПКА СОХРАНЕНИЯ (Появляется снизу) */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
                <AnimatePresence>
                    {waterCamera && (
                        <motion.button
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={saveCameraLocation}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg shadow-blue-900/40 flex items-center gap-2 font-bold transition-all border border-blue-400/20 backdrop-blur-md"
                        >
                            <Save size={18} />
                            {isSaving ? "Сохранение..." : "Сохранить позицию камеры"}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* ИНФО О КАМЕРЕ (Справа сверху) */}
            <div className="absolute top-6 right-6 z-10 hidden md:block">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-72 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
                        <Camera className="text-blue-400" size={20} />
                        <span className="font-bold text-white text-sm">Параметры камеры</span>
                    </div>
                    <div className="space-y-3 text-xs text-gray-300">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                            <span>Статус системы:</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${waterAlert ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                                {waterAlert ? "DANGER DETECTED" : "SYSTEM ONLINE"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-gray-500 block text-[10px] mb-0.5">LATITUDE</span>
                                <span className="text-white font-mono">{waterCamera?.lat?.toFixed(5)}</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-gray-500 block text-[10px] mb-0.5">LONGITUDE</span>
                                <span className="text-white font-mono">{waterCamera?.lng?.toFixed(5)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-500 flex items-center gap-2">
                        <Info size={12} />
                        <span>Можно перемещать маркер на карте</span>
                    </div>
                </div>
            </div>

            {/* 🔥 КРАСНАЯ ТРЕВОГА (OVERLAY) 🔥 */}
            <AnimatePresence>
                {waterAlert && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-40 bg-red-900/30 backdrop-blur-sm flex items-center justify-center p-6 border-[20px] border-red-600/30 animate-pulse pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="bg-black/90 border-2 border-red-500 p-10 rounded-3xl shadow-[0_0_150px_rgba(220,38,38,0.6)] text-center max-w-2xl pointer-events-auto relative overflow-hidden"
                        >
                            {/* Background Stripes */}
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #ff0000 25%, transparent 25%, transparent 50%, #ff0000 50%, #ff0000 75%, transparent 75%, transparent)', backgroundSize: '40px 40px' }}></div>

                            <div className="relative z-10">
                                <div className="w-28 h-28 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce shadow-lg shadow-red-500/50 outline outline-4 outline-offset-4 outline-red-900">
                                    <Siren size={56} className="text-white" />
                                </div>
                                <h2 className="text-5xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-lg">ЧЕЛОВЕК НА ВОДЕ!</h2>
                                <h3 className="text-xl font-bold text-red-500 mb-8 tracking-widest uppercase">Emergency Protocol Activated</h3>

                                <div className="bg-red-950/50 p-4 rounded-xl border border-red-500/30 mb-8">
                                    <p className="text-red-200 text-lg font-medium">
                                        {waterAlert.message || "Камера зафиксировала движение в опасной зоне."}
                                    </p>

                                    {/* ФОТО НАРУШЕНИЯ */}
                                    {waterAlert.image_url && (
                                        <div className="mt-4 rounded-lg overflow-hidden border border-red-500/50 shadow-lg relative group">
                                            <img
                                                src={waterAlert.image_url}
                                                alt="AI Detection"
                                                className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow animate-pulse">
                                                LIVE FEED
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-red-400/70 text-sm mt-3 font-mono">
                                        LOC: {waterAlert.lat?.toFixed(6)} | {waterAlert.lng?.toFixed(6)}
                                    </p>
                                </div>

                                <div className="flex gap-4 justify-center">
                                    <button onClick={handleDismiss} className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all hover:scale-105 active:scale-95">
                                        Принять к сведению (Скрыть)
                                    </button>
                                    <button
                                        onClick={() => {
                                            addToast("Бригада спасателей отправлена! 🚒", "success");
                                            handleDismiss();
                                        }}
                                        className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                        <ShieldAlert size={20} />
                                        ОТПРАВИТЬ СПАСАТЕЛЕЙ
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- СТИЛИ МАРКЕРОВ --- */}
            <style>{`
                /* Контейнер маркера */
                .camera-marker-container {
                    width: 0; 
                    height: 0;
                    position: relative;
                    cursor: grab;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    will-change: transform;
                }
                .camera-marker-container:active {
                    cursor: grabbing;
                }

                /* Зона покрытия (Круг) */
                .range-circle {
                    position: absolute;
                    width: 200px; /* Размер зоны */
                    height: 200px;
                    border: 1px solid rgba(96, 165, 250, 0.3);
                    background: rgba(59, 130, 246, 0.05);
                    border-radius: 50%;
                    pointer-events: none;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }

                /* Радар (Сканирование) */
                .radar-scan {
                    position: absolute;
                    width: 200px;
                    height: 200px;
                    border-radius: 50%;
                    background: conic-gradient(from 0deg, transparent 0deg, rgba(96, 165, 250, 0.2) 60deg, transparent 61deg);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation: radar-spin 4s linear infinite;
                    pointer-events: none;
                }

                /* Иконка */
                .camera-icon-wrapper {
                    position: relative;
                    z-index: 10;
                    width: 44px; /* Чуть больше */
                    height: 44px;
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); /* Blue gradient */
                    border: 2px solid rgba(147, 197, 253, 0.5); /* Semi-transparent border */
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.5), inset 0 0 10px rgba(255,255,255,0.2);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy transition */
                }

                .camera-icon-wrapper svg {
                    filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));
                    width: 22px;
                    height: 22px;
                }
                
                .camera-marker-container:hover .camera-icon-wrapper {
                     transform: scale(1.15);
                     border-color: #ffffff;
                     box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), inset 0 0 15px rgba(255,255,255,0.4);
                }

                /* Лейбл */
                .camera-label {
                    position: absolute;
                    top: -45px;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    color: #fff;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                    opacity: 0;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    pointer-events: none;
                    z-index: 20;
                }
                .camera-marker-container:hover .camera-label {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                /* --- DANGER STATE --- */
                .is-danger .camera-icon-wrapper {
                    background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); /* Red gradient */
                    border-color: #fca5a5;
                    box-shadow: 0 0 40px rgba(239, 68, 68, 0.8), inset 0 0 20px rgba(255,255,255,0.2);
                    animation: shake-smooth 0.5s ease-in-out infinite;
                }
                .is-danger .range-circle {
                    background: rgba(239, 68, 68, 0.1);
                    border-color: rgba(239, 68, 68, 0.4);
                }
                .is-danger .radar-scan {
                    background: conic-gradient(from 0deg, transparent 0deg, rgba(239, 68, 68, 0.3) 60deg, transparent 61deg);
                    animation: radar-spin 1s linear infinite; /* Faster spin on danger */
                }

                @keyframes radar-spin {
                    from { transform: translate(-50%, -50%) rotate(0deg); }
                    to { transform: translate(-50%, -50%) rotate(360deg); }
                }

                @keyframes shake-smooth {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}
