import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { io } from "socket.io-client";
import { MCHS_BASE } from "../data/mockData";
import { useTheme } from "../context/ThemeContext";
import { API_URL, SOCKET_URL, WEATHER_COORDS } from "../config/env";

const API_KEY = import.meta.env.VITE_MAPTILER_KEY;
const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY;

const STYLE_LIGHT = `https://api.maptiler.com/maps/streets-v2/style.json?key=${API_KEY}`;
const STYLE_DARK = `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${API_KEY}`;
const STYLE_SAT = `https://api.maptiler.com/maps/hybrid/style.json?key=${API_KEY}`;

const parseCoordinate = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const hasValidCoords = (lat, lng) => (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
);

const getSensorIconSvg = (type) => {
    if (type === 'smoke' || type === 'fire') {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';
    }
    if (type === 'gas' || type === 'aqi') {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c0-1.7-1.3-3-3-3h-11a3 3 0 0 1-3-3c0-1.3.8-2.4 2-2.8C2.9 6.2 5.2 3.5 9 3.5c3 0 5.5 2.1 6.3 5 2.4.4 4.2 2.5 4.2 5 0 .5-.1 1-.2 1.4"/></svg>';
    }
    if (type === 'radiation') {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
};

const normalizeDevice = (device) => ({
    ...device,
    title: device.title || device.name,
    value: device.value ?? device.lastValue ?? 'Ozhidanie...',
    floor: Number.parseInt(device.floor || 1, 10) || 1,
    buildingId: device.buildingId ?? device.organizationId ?? null,
    lat: parseCoordinate(device.lat),
    lng: parseCoordinate(device.lng)
});

const removeMarkerStore = (store) => {
    store.forEach((entry) => entry.marker.remove());
    store.clear();
};

export function useMapInit(mapContainer) {
    const map = useRef(null);
    const socketRef = useRef(null);
    const buildingMarkersRef = useRef(new Map());
    const sensorMarkersRef = useRef(new Map());
    const baseMarkerRef = useRef(null);
    const syncMarkersRef = useRef(() => {});
    const is3DEnabledRef = useRef(false);
    const isTrafficEnabledRef = useRef(false);
    const { theme } = useTheme();

    const [isLoaded, setIsLoaded] = useState(false);
    const [mapStyle, setMapStyle] = useState(theme === "dark" ? "dark" : "light");

    const [realSensors, setRealSensors] = useState([]);
    const [realBuildings, setRealBuildings] = useState([]);
    const [sensorAlarm, setSensorAlarm] = useState(null);

    const [selectedSensor, setSelectedSensor] = useState(null);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [cctvUrl, setCctvUrl] = useState(null);

    const [is3DEnabled, setIs3DEnabled] = useState(false);
    const [isTrafficEnabled, setIsTrafficEnabled] = useState(false);
    const [showBuildings, setShowBuildings] = useState(true);
    const [showSensors, setShowSensors] = useState(true);

    const getAuthHeader = () => {
        try {
            const stored = JSON.parse(localStorage.getItem('mchs_user'));
            return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
        } catch {
            return {};
        }
    };

    const fetchData = useCallback(async (signal) => {
        try {
            const headers = getAuthHeader();

            const [orgRes, deviceRes] = await Promise.all([
                fetch(`${API_URL}/organizations`, { headers, signal }),
                fetch(`${API_URL}/devices`, { headers, signal })
            ]);

            if (!orgRes.ok || !deviceRes.ok) {
                throw new Error('Failed to load organizations/devices');
            }

            const orgsData = await orgRes.json();
            const devicesData = await deviceRes.json();

            if (signal?.aborted) return;

            const safeOrgs = Array.isArray(orgsData) ? orgsData : [];
            const safeDevices = Array.isArray(devicesData) ? devicesData : [];

            setRealBuildings(
                safeOrgs.map((org) => ({
                    ...org,
                    title: org.name,
                    lat: parseCoordinate(org.lat),
                    lng: parseCoordinate(org.lng)
                }))
            );

            setRealSensors(safeDevices.map(normalizeDevice));
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(error);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        socket.on("device-update", (update) => {
            setRealSensors((prev) => {
                const index = prev.findIndex((sensor) => sensor.id === update.id);
                if (index === -1) {
                    return [...prev, normalizeDevice(update)];
                }

                const current = prev[index];
                const merged = normalizeDevice({
                    ...current,
                    ...update,
                    title: update.name ?? current.title,
                    buildingId: update.organizationId ?? current.buildingId
                });

                const next = [...prev];
                next[index] = merged;
                return next;
            });
        });

        socket.on("sensor-update", (data) => {
            setRealSensors((prev) => {
                const index = prev.findIndex((sensor) => sensor.id === data.id);
                const normalized = normalizeDevice({
                    ...(index >= 0 ? prev[index] : {}),
                    id: data.id,
                    title: index >= 0 ? prev[index].title : "Smart Sensor ESP32",
                    lat: index >= 0 ? prev[index].lat : Number(data.lat) || WEATHER_COORDS.lat,
                    lng: index >= 0 ? prev[index].lng : Number(data.lng) || WEATHER_COORDS.lon,
                    type: index >= 0 ? prev[index].type : 'multi',
                    status: (data.alarm || data.fire || data.quake) ? 'DANGER' : 'ONLINE',
                    value: `${data.temp}C`,
                    details: data,
                    lastSeen: new Date().toISOString()
                });

                if (index === -1) {
                    return [...prev, normalized];
                }

                const next = [...prev];
                next[index] = normalized;
                return next;
            });
        });

        socket.on("sensor-alarm", (alarm) => {
            setSensorAlarm(alarm);
        });

        socket.on("global-alert", () => {
            void fetchData();
        });

        return () => {
            controller.abort();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [fetchData]);

    const syncBaseMarker = useCallback(() => {
        if (!map.current) return;

        if (!baseMarkerRef.current) {
            const elBase = document.createElement("div");
            elBase.className = 'base-marker-container';
            elBase.innerHTML = `
                <div class="base-pulse"></div>
                <div class="base-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4 8 4v14"/>
                        <path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V21"/>
                        <path d="M9 10a1 1 0 1 1-2 0"/>
                    </svg>
                </div>
                <div class="base-label">GLAVNYY SHTAB</div>
            `;
            elBase.onclick = () => map.current?.flyTo({ center: [MCHS_BASE.lng, MCHS_BASE.lat], zoom: 16 });
            baseMarkerRef.current = new maplibregl.Marker({ element: elBase })
                .setLngLat([MCHS_BASE.lng, MCHS_BASE.lat])
                .addTo(map.current);
        }
    }, []);

    const syncBuildingMarkers = useCallback(() => {
        if (!map.current) return;

        const store = buildingMarkersRef.current;
        if (!showBuildings) {
            removeMarkerStore(store);
            return;
        }

        const dangerBuildingIds = new Set(
            realSensors
                .filter((sensor) => sensor.status === 'DANGER' && sensor.buildingId)
                .map((sensor) => String(sensor.buildingId))
        );

        const nextIds = new Set();

        realBuildings.forEach((building) => {
            const lat = parseCoordinate(building.lat);
            const lng = parseCoordinate(building.lng);
            if (!hasValidCoords(lat, lng)) return;

            const markerId = String(building.id);
            const hasDanger = dangerBuildingIds.has(markerId);
            const nextClass = `building-marker ${hasDanger ? 'is-danger' : ''}`;
            nextIds.add(markerId);

            let entry = store.get(markerId);
            if (!entry) {
                const el = document.createElement("div");
                el.className = nextClass;
                el.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                        <path d="M6 12H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
                        <path d="M10 6h4"/>
                        <path d="M10 10h4"/>
                        <path d="M10 14h4"/>
                        <path d="M10 18h4"/>
                    </svg>
                `;
                const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current);
                entry = { marker, el, lat, lng, className: nextClass };
                store.set(markerId, entry);
            }

            if (entry.className !== nextClass) {
                entry.el.className = nextClass;
                entry.className = nextClass;
            }

            if (entry.lat !== lat || entry.lng !== lng) {
                entry.marker.setLngLat([lng, lat]);
                entry.lat = lat;
                entry.lng = lng;
            }

            entry.el.onclick = (event) => {
                event.stopPropagation();
                setSelectedBuilding(building);
                map.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 45 });
            };
        });

        store.forEach((_entry, id) => {
            if (!nextIds.has(id)) {
                store.get(id)?.marker.remove();
                store.delete(id);
            }
        });
    }, [realBuildings, realSensors, showBuildings]);

    const syncSensorMarkers = useCallback(() => {
        if (!map.current) return;

        const store = sensorMarkersRef.current;
        if (!showSensors) {
            removeMarkerStore(store);
            return;
        }

        const nextIds = new Set();

        realSensors.forEach((sensor) => {
            if (sensor.buildingId) return;

            const lat = parseCoordinate(sensor.lat);
            const lng = parseCoordinate(sensor.lng);
            if (!hasValidCoords(lat, lng)) return;

            const markerId = String(sensor.id);
            const statusClass = sensor.status === 'DANGER'
                ? 'status-danger'
                : sensor.status === 'WARNING'
                    ? 'status-warning'
                    : 'status-good';
            const nextClass = `sensor-marker ${statusClass}`;
            const nextIcon = getSensorIconSvg(sensor.type);
            nextIds.add(markerId);

            let entry = store.get(markerId);
            if (!entry) {
                const el = document.createElement("div");
                el.className = nextClass;
                el.innerHTML = nextIcon;
                const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current);
                entry = { marker, el, lat, lng, className: nextClass, icon: nextIcon };
                store.set(markerId, entry);
            }

            if (entry.className !== nextClass) {
                entry.el.className = nextClass;
                entry.className = nextClass;
            }

            if (entry.icon !== nextIcon) {
                entry.el.innerHTML = nextIcon;
                entry.icon = nextIcon;
            }

            if (entry.lat !== lat || entry.lng !== lng) {
                entry.marker.setLngLat([lng, lat]);
                entry.lat = lat;
                entry.lng = lng;
            }

            entry.el.onclick = (event) => {
                event.stopPropagation();
                setSelectedSensor(sensor);
                map.current?.flyTo({ center: [lng, lat], zoom: 18 });
            };
        });

        store.forEach((_entry, id) => {
            if (!nextIds.has(id)) {
                store.get(id)?.marker.remove();
                store.delete(id);
            }
        });
    }, [realSensors, showSensors]);

    const syncMarkers = useCallback(() => {
        if (!map.current) return;
        syncBuildingMarkers();
        syncSensorMarkers();
        syncBaseMarker();
    }, [syncBuildingMarkers, syncSensorMarkers, syncBaseMarker]);

    useEffect(() => {
        syncMarkersRef.current = syncMarkers;
    }, [syncMarkers]);

    useEffect(() => {
        is3DEnabledRef.current = is3DEnabled;
    }, [is3DEnabled]);

    useEffect(() => {
        isTrafficEnabledRef.current = isTrafficEnabled;
    }, [isTrafficEnabled]);

    useEffect(() => {
        if (map.current) return;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: theme === "dark" ? STYLE_DARK : STYLE_LIGHT,
            center: [60.6333, 41.5514],
            zoom: 13,
            pitch: 60,
            bearing: -20,
            attributionControl: false
        });

        map.current.on("load", () => {
            setIsLoaded(true);
        });

        return () => {
            removeMarkerStore(buildingMarkersRef.current);
            removeMarkerStore(sensorMarkersRef.current);
            if (baseMarkerRef.current) {
                baseMarkerRef.current.remove();
                baseMarkerRef.current = null;
            }
            map.current?.remove();
            map.current = null;
            setIsLoaded(false);
        };
    }, []);

    useEffect(() => {
        if (!isLoaded || !map.current) return;
        syncMarkers();
    }, [isLoaded, syncMarkers]);

    const add3DBuildings = () => {
        if (!map.current || map.current.getLayer("3d-buildings")) return;
        if (!map.current.getSource("openmaptiles")) {
            map.current.addSource("openmaptiles", {
                type: "vector",
                url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${API_KEY}`
            });
        }
        map.current.addLayer({
            id: "3d-buildings",
            source: "openmaptiles",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
                "fill-extrusion-color": theme === "dark" ? "#334155" : "#cbd5e1",
                "fill-extrusion-height": ["get", "render_height"],
                "fill-extrusion-base": ["get", "render_min_height"],
                "fill-extrusion-opacity": 0.8
            }
        });
    };

    const toggleMapStyle = () => {
        setMapStyle((prev) => {
            if (prev === 'dark') return 'satellite';
            if (prev === 'satellite') return 'light';
            return 'dark';
        });
    };

    useEffect(() => {
        if (!map.current) return;

        const styleUrl = mapStyle === 'satellite'
            ? STYLE_SAT
            : mapStyle === 'light'
                ? STYLE_LIGHT
                : STYLE_DARK;

        map.current.setStyle(styleUrl);

        map.current.once('style.load', () => {
            syncMarkersRef.current();
            if (is3DEnabledRef.current) enable3D();
            if (isTrafficEnabledRef.current) enableTraffic();
        });
    }, [mapStyle]);

    const enable3D = () => {
        if (!map.current) return;

        if (!map.current.getSource("maptiler-terrain")) {
            map.current.addSource("maptiler-terrain", {
                type: "raster-dem",
                url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${API_KEY}`,
                tileSize: 512,
                maxzoom: 14
            });
        }

        map.current.setTerrain({ source: "maptiler-terrain", exaggeration: 1.5 });
        add3DBuildings();
    };

    const disable3D = () => {
        if (!map.current) return;

        map.current.setTerrain(null);
        if (map.current.getLayer("3d-buildings")) {
            map.current.removeLayer("3d-buildings");
        }
    };

    const toggle3D = () => setIs3DEnabled((prev) => !prev);

    useEffect(() => {
        if (!isLoaded || !map.current) return;

        if (is3DEnabled) {
            enable3D();
            map.current.easeTo({ pitch: 60, bearing: -20 });
        } else {
            disable3D();
            map.current.easeTo({ pitch: 45, bearing: 0 });
        }
    }, [is3DEnabled, isLoaded, mapStyle]);

    const enableTraffic = () => {
        if (!map.current) return;

        const sourceId = 'tomtom-traffic';
        const layerId = 'traffic-layer';

        if (!map.current.getSource(sourceId)) {
            map.current.addSource(sourceId, {
                type: 'raster',
                tiles: [`https://api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`],
                tileSize: 256
            });
        }

        if (!map.current.getLayer(layerId)) {
            map.current.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': 0.7 }
            });
        }
    };

    const toggleTraffic = () => setIsTrafficEnabled((prev) => !prev);

    useEffect(() => {
        if (!isLoaded || !map.current) return;

        const layerId = 'traffic-layer';
        if (isTrafficEnabled) {
            enableTraffic();
            if (map.current.getLayer(layerId)) {
                map.current.setLayoutProperty(layerId, 'visibility', 'visible');
            }
        } else if (map.current.getLayer(layerId)) {
            map.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
    }, [isTrafficEnabled, isLoaded]);

    const toggleBuildings = () => setShowBuildings((prev) => !prev);
    const toggleSensors = () => setShowSensors((prev) => !prev);

    return {
        map,
        isLoaded,
        mapStyle,
        toggleMapStyle,
        selectedSensor,
        setSelectedSensor,
        selectedBuilding,
        setSelectedBuilding,
        realSensors,
        cctvUrl,
        setCctvUrl,
        is3DEnabled,
        toggle3D,
        isTrafficEnabled,
        toggleTraffic,
        showBuildings,
        toggleBuildings,
        showSensors,
        toggleSensors,
        sensorAlarm,
        setSensorAlarm
    };
}
