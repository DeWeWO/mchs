import { useState } from 'react';
import maplibregl from 'maplibre-gl';
import { MCHS_BASE } from '../data/sensors';

// Используем ORS, так как он идеально совпадает с картой (OSM)
const ORS_API_KEY = import.meta.env.VITE_ORS_KEY;

export function useMapRouting(map) {
    const [routeInfo, setRouteInfo] = useState(null);
    const [routeSteps, setRouteSteps] = useState([]);
    const [travelMode, setTravelMode] = useState('driving-car'); 
    const [isFireMode, setIsFireMode] = useState(false);

    // --- 1. ОТРИСОВКА ---
    const drawRouteLayer = (geoJsonData, color) => {
        if (!map.current) return;

        // Чистим
        if (map.current.getLayer('route-arrows')) map.current.removeLayer('route-arrows');
        if (map.current.getLayer('route')) map.current.removeLayer('route');
        if (map.current.getSource('route')) map.current.removeSource('route');

        // Рисуем
        map.current.addSource('route', { type: 'geojson', data: geoJsonData });
        map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': color,
                'line-width': 6,
                'line-opacity': 0.8
            }
        });

        // Стрелочки
        if (map.current.hasImage('arrow-white')) {
            map.current.addLayer({
                id: 'route-arrows',
                type: 'symbol',
                source: 'route',
                layout: { 'symbol-placement': 'line', 'symbol-spacing': 50, 'icon-image': 'arrow-white', 'icon-size': 0.6 }
            });
        }
    };

    // --- 2. МАРШРУТ (ORS - Идеальное совпадение с картой) ---
    const buildRoute = async (sensor, mode = 'driving-car') => {
        if (!map.current) return;
        setTravelMode(mode);

        try {
            const response = await fetch(`https://api.openrouteservice.org/v2/directions/${mode}/geojson`, {
                method: 'POST',
                headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    coordinates: [[MCHS_BASE.lng, MCHS_BASE.lat], [sensor.lng, sensor.lat]],
                    instructions: true,
                    language: 'ru'
                })
            });

            if (!response.ok) throw new Error('ORS Error');
            const data = await response.json();

            // Рисуем
            drawRouteLayer(data, mode === 'foot-walking' ? '#00ff87' : '#00aaff');

            // Инфо
            const props = data.features[0].properties;
            setRouteInfo({
                distance: (props.summary.distance / 1000).toFixed(1),
                duration: Math.round(props.summary.duration / 60),
                target: sensor.title,
                sensor: sensor
            });
            
            // Шаги
            setRouteSteps(props.segments[0].steps);

            // Зум
            const bounds = new maplibregl.LngLatBounds();
            data.features[0].geometry.coordinates.forEach(coord => bounds.extend(coord));
            map.current.fitBounds(bounds, { padding: 100 });

        } catch (e) {
            console.error(e);
            alert("Не удалось построить маршрут");
        }
    };

    const clearRoute = () => {
        if (!map.current) return;
        if (map.current.getLayer('route-arrows')) map.current.removeLayer('route-arrows');
        if (map.current.getLayer('route')) map.current.removeLayer('route');
        if (map.current.getSource('route')) map.current.removeSource('route');
        setRouteInfo(null);
        setRouteSteps([]);
    };

    // --- 3. ПОЖАРНАЯ (ORS - Изохроны) ---
    const buildFireCoverage = async (lng, lat) => {
        if (!map.current) return;

        try {
            // Запрашиваем зоны (5, 10, 15 мин) для грузовика (driving-hgv)
            const response = await fetch('https://api.openrouteservice.org/v2/isochrones/driving-hgv', {
                method: 'POST',
                headers: { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locations: [[lng, lat]],
                    range: [300, 600, 900], // сек
                    attributes: ['total_pop']
                })
            });
            
            const data = await response.json();

            // Чистим
            if (map.current.getLayer('fire-layer')) map.current.removeLayer('fire-layer');
            if (map.current.getSource('fire-source')) map.current.removeSource('fire-source');

            map.current.addSource('fire-source', { type: 'geojson', data });

            map.current.addLayer({
                'id': 'fire-layer',
                'type': 'fill',
                'source': 'fire-source',
                'layout': {},
                'paint': {
                    'fill-color': [
                        'match', ['get', 'value'],
                        300, '#ef4444', // 5 мин
                        600, '#f97316', // 10 мин
                        900, '#eab308', // 15 мин
                        '#ccc'
                    ],
                    'fill-opacity': 0.5,
                    'fill-outline-color': '#fff'
                }
            });

            setIsFireMode(false);
            
            // Зум
            const bounds = new maplibregl.LngLatBounds();
            data.features.forEach(f => {
                f.geometry.coordinates[0].forEach(c => bounds.extend(c));
            });
            map.current.fitBounds(bounds, { padding: 50 });

            alert("Зоны доступности построены!");

        } catch (e) {
            console.error(e);
            alert("Ошибка расчета зон");
        }
    };

    return { 
        routeInfo, routeSteps, travelMode, buildRoute, clearRoute, 
        isFireMode, setIsFireMode, buildFireCoverage 
    };
}