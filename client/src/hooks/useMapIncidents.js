import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { io } from 'socket.io-client';
import * as turf from '@turf/turf';
import { SENSORS_DATA } from '../data/sensors';
import { API_URL, SOCKET_URL } from '../config/env';

const API_KEY = import.meta.env.VITE_MAPTILER_KEY;

const createInfoPopupContent = (type, address, lat, lng) => {
    const root = document.createElement('div');
    root.style.padding = '8px';
    root.style.maxWidth = '220px';

    const typeNode = document.createElement('div');
    typeNode.style.fontSize = '10px';
    typeNode.style.opacity = '0.7';
    typeNode.style.textTransform = 'uppercase';
    typeNode.style.fontWeight = '700';
    typeNode.style.marginBottom = '4px';
    typeNode.textContent = type;

    const addressNode = document.createElement('div');
    addressNode.style.fontSize = '14px';
    addressNode.style.fontWeight = '700';
    addressNode.style.lineHeight = '1.2';
    addressNode.style.marginBottom = '6px';
    addressNode.textContent = address;

    const coordNode = document.createElement('div');
    coordNode.style.fontSize = '11px';
    coordNode.style.color = '#00aaff';
    coordNode.style.fontFamily = 'monospace';
    coordNode.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    root.append(typeNode, addressNode, coordNode);
    return root;
};

const createIncidentPopupContent = (type, description, time) => {
    const root = document.createElement('div');
    root.className = 'p-2';

    const title = document.createElement('strong');
    title.textContent = type || 'Incident';

    const desc = document.createElement('div');
    desc.textContent = description || 'No details';

    const meta = document.createElement('small');
    meta.textContent = time;

    root.append(title, document.createElement('br'), desc, document.createElement('br'), meta);
    return root;
};

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

export function useMapIncidents(map, isFireMode, buildFireCoverage) {
    const [isEmergency, setIsEmergency] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);
    const [isInfoMode, setIsInfoMode] = useState(false);
    const [newIncidentCoords, setNewIncidentCoords] = useState(null);
    const [incidents, setIncidents] = useState([]);

    const infoPopupRef = useRef(null);
    const incidentMarkersRef = useRef([]);

    const addIncidentMarker = useCallback((incident) => {
        if (!map.current) return;

        const markerElement = document.createElement('div');
        markerElement.className = 'animate-bounce cursor-pointer';
        markerElement.innerHTML = '<div class="p-2 bg-red-600 text-white rounded-lg shadow-lg border-2 border-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>';

        const time = incident.time || (incident.createdAt ? new Date(incident.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString());
        const marker = new maplibregl.Marker({ element: markerElement })
            .setLngLat([incident.lng, incident.lat])
            .setPopup(
                new maplibregl.Popup({ offset: 25, className: 'glass-popup' })
                    .setDOMContent(createIncidentPopupContent(incident.type, incident.description, time))
            )
            .addTo(map.current);

        incidentMarkersRef.current.push(marker);
    }, [map]);

    useEffect(() => {
        const controller = new AbortController();

        const loadIncidents = async () => {
            try {
                const response = await fetch(`${API_URL}/incidents`, {
                    headers: getAuthHeader(),
                    signal: controller.signal
                });
                if (!response.ok) return;

                const data = await response.json();
                if (!controller.signal.aborted) {
                    setIncidents(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Incident loading error:', error);
                }
            }
        };

        void loadIncidents();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('incident-created', (incident) => {
            setIncidents((prev) => {
                if (!incident?.id || prev.some((item) => item.id === incident.id)) return prev;
                return [incident, ...prev];
            });
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        incidentMarkersRef.current.forEach((marker) => marker.remove());
        incidentMarkersRef.current = [];
        incidents.forEach(addIncidentMarker);
    }, [incidents, addIncidentMarker]);

    const inspectLocation = useCallback(async (lng, lat) => {
        if (!map.current) return;

        try {
            const response = await fetch(
                `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${API_KEY}&language=ru`
            );
            if (!response.ok) return;

            const data = await response.json();
            const place = data?.features?.[0];
            if (!place) return;

            const address = place.place_name || 'Unknown place';
            const type = place.place_type?.[0] === 'building' ? 'Building' : 'Object';

            infoPopupRef.current?.remove();
            infoPopupRef.current = new maplibregl.Popup({ className: 'glass-popup', closeButton: true })
                .setLngLat([lng, lat])
                .setDOMContent(createInfoPopupContent(type, address, lat, lng))
                .addTo(map.current);
        } catch (error) {
            console.error('Geocoding error:', error);
        }
    }, [map]);

    useEffect(() => {
        if (!map.current) return;

        const handleMapClick = (event) => {
            const { lng, lat } = event.lngLat;

            if (isAddMode) {
                setNewIncidentCoords({ lng, lat });
                setIsAddMode(false);
                return;
            }

            if (isFireMode) {
                buildFireCoverage(lng, lat);
                return;
            }

            if (isInfoMode) {
                void inspectLocation(lng, lat);
            }
        };

        map.current.on('click', handleMapClick);

        if (isAddMode) map.current.getCanvas().style.cursor = 'crosshair';
        else if (isFireMode || isInfoMode) map.current.getCanvas().style.cursor = 'help';
        else map.current.getCanvas().style.cursor = 'grab';

        return () => {
            map.current?.off('click', handleMapClick);
        };
    }, [isAddMode, isFireMode, isInfoMode, buildFireCoverage, inspectLocation, map]);

    const saveIncident = async (type, description) => {
        if (!map.current || !newIncidentCoords) return;

        const fallbackIncident = {
            id: Date.now(),
            lng: newIncidentCoords.lng,
            lat: newIncidentCoords.lat,
            type,
            description,
            time: new Date().toLocaleTimeString()
        };

        setNewIncidentCoords(null);

        try {
            const response = await fetch(`${API_URL}/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    type,
                    description,
                    lat: fallbackIncident.lat,
                    lng: fallbackIncident.lng
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save incident');
            }

            const created = await response.json();
            setIncidents((prev) => {
                if (prev.some((incident) => incident.id === created.id)) return prev;
                return [created, ...prev];
            });
        } catch (error) {
            console.error('Incident saving error:', error);
            setIncidents((prev) => [fallbackIncident, ...prev]);
        }
    };

    const toggleEmergency = () => {
        if (!map.current) return;

        const next = !isEmergency;
        setIsEmergency(next);

        if (next) {
            const gasSensor = SENSORS_DATA.find((sensor) => sensor.type === 'gas');
            if (!gasSensor) return;

            const center = turf.point([gasSensor.lng, gasSensor.lat]);
            const sector = turf.sector(center, 1.5, 15, 75);

            const existingSource = map.current.getSource('hazard');
            if (existingSource && typeof existingSource.setData === 'function') {
                existingSource.setData(sector);
            } else {
                map.current.addSource('hazard', { type: 'geojson', data: sector });
            }

            if (!map.current.getLayer('hazard-fill')) {
                map.current.addLayer({
                    id: 'hazard-fill',
                    type: 'fill',
                    source: 'hazard',
                    paint: { 'fill-color': '#ff4757', 'fill-opacity': 0.4 }
                });
            }

            map.current.flyTo({ center: [gasSensor.lng, gasSensor.lat], zoom: 14 });
            return;
        }

        if (map.current.getLayer('hazard-fill')) map.current.removeLayer('hazard-fill');
        if (map.current.getSource('hazard')) map.current.removeSource('hazard');
    };

    useEffect(() => {
        return () => {
            infoPopupRef.current?.remove();
            incidentMarkersRef.current.forEach((marker) => marker.remove());
            incidentMarkersRef.current = [];

            if (!map.current) return;
            if (map.current.getLayer('hazard-fill')) map.current.removeLayer('hazard-fill');
            if (map.current.getSource('hazard')) map.current.removeSource('hazard');
        };
    }, [map]);

    return {
        isEmergency,
        toggleEmergency,
        isAddMode,
        setIsAddMode,
        isInfoMode,
        setIsInfoMode,
        newIncidentCoords,
        setNewIncidentCoords,
        saveIncident
    };
}
