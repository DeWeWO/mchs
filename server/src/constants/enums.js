const ROLES = Object.freeze({
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    MCHS_USER: 'MCHS_USER',
    ORG_OPERATOR: 'ORG_OPERATOR',
    MAP_OPERATOR: 'MAP_OPERATOR',
    HAZARD_OPERATOR: 'HAZARD_OPERATOR'
});

const DEVICE_STATUSES = Object.freeze({
    ONLINE: 'ONLINE',
    OFFLINE: 'OFFLINE',
    WARNING: 'WARNING',
    DANGER: 'DANGER'
});

const DEVICE_TYPES = Object.freeze({
    MULTI: 'multi',
    GAS: 'gas',
    SMOKE: 'smoke',
    RADIATION: 'radiation',
    WATER_CAMERA: 'water_camera'
});

const INCIDENT_STATUSES = Object.freeze({
    NEW: 'NEW',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    FALSE_ALARM: 'FALSE_ALARM'
});

module.exports = { ROLES, DEVICE_STATUSES, DEVICE_TYPES, INCIDENT_STATUSES };
