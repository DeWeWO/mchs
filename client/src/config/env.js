const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BACKEND_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BACKEND_URL;
const WEATHER_KEY = import.meta.env.VITE_WEATHER_KEY || '';
const WEATHER_COORDS = {
    lat: Number(import.meta.env.VITE_CITY_LAT) || 41.55,
    lon: Number(import.meta.env.VITE_CITY_LON) || 60.63
};

const ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MCHS_USER: 'MCHS_USER',
    ORG_OPERATOR: 'ORG_OPERATOR',
    MAP_OPERATOR: 'MAP_OPERATOR',
    HAZARD_OPERATOR: 'HAZARD_OPERATOR'
});

const DEVICE_TYPES = Object.freeze({
    MULTI: 'multi',
    GAS: 'gas',
    SMOKE: 'smoke',
    RADIATION: 'radiation',
    WATER_CAMERA: 'water_camera'
});

const DEVICE_STATUSES = Object.freeze({
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    WARNING: 'WARNING',
    DANGER: 'DANGER'
});

export { BACKEND_URL, API_URL, SOCKET_URL, WEATHER_KEY, WEATHER_COORDS, ROLES, DEVICE_TYPES, DEVICE_STATUSES };
