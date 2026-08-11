import { useState, useEffect, useRef, useCallback } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';

export function useMapDraw(map) {
    const draw = useRef(null);
    const [drawMode, setDrawMode] = useState('none');
    const [measurement, setMeasurement] = useState(null);

    const updateArea = useCallback(() => {
        if (!draw.current) return;

        const data = draw.current.getAll();
        if (data.features.length === 0) return;

        const feature = data.features[0];

        if (feature.geometry.type === 'Polygon') {
            const area = turf.area(feature);
            setMeasurement({
                type: 'Area',
                value: `${Math.round(area).toLocaleString()} m2`,
                subValue: `${(area / 10000).toFixed(2)} ha`
            });
            return;
        }

        if (feature.geometry.type === 'LineString') {
            const distance = turf.length(feature, { units: 'kilometers' });
            setMeasurement({
                type: 'Distance',
                value: distance < 1 ? `${(distance * 1000).toFixed(0)} m` : `${distance.toFixed(2)} km`
            });
        }
    }, []);

    useEffect(() => {
        if (!map.current) return;

        draw.current = new MapboxDraw({
            displayControlsDefault: false,
            styles: [
                {
                    id: 'gl-draw-line',
                    type: 'line',
                    filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: { 'line-color': '#00aaff', 'line-width': 4 }
                },
                {
                    id: 'gl-draw-polygon-fill',
                    type: 'fill',
                    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    paint: { 'fill-color': '#00aaff', 'fill-outline-color': '#00aaff', 'fill-opacity': 0.2 }
                },
                {
                    id: 'gl-draw-polygon-stroke-active',
                    type: 'line',
                    filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                    paint: { 'line-color': '#00aaff', 'line-width': 4 }
                },
                {
                    id: 'gl-draw-point-active',
                    type: 'circle',
                    filter: ['all', ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
                    paint: { 'circle-radius': 6, 'circle-color': '#fff' }
                }
            ]
        });

        map.current.addControl(draw.current);

        const handleDelete = () => setMeasurement(null);

        map.current.on('draw.create', updateArea);
        map.current.on('draw.update', updateArea);
        map.current.on('draw.delete', handleDelete);

        return () => {
            if (!map.current) return;

            map.current.off('draw.create', updateArea);
            map.current.off('draw.update', updateArea);
            map.current.off('draw.delete', handleDelete);

            if (draw.current) {
                try {
                    map.current.removeControl(draw.current);
                } catch {
                    // noop
                }
            }
        };
    }, [map, updateArea]);

    const startDrawing = (mode) => {
        if (!draw.current) return;

        if (drawMode === mode) {
            draw.current.changeMode('simple_select');
            setDrawMode('none');
            return;
        }

        draw.current.deleteAll();
        setMeasurement(null);

        if (mode === 'line') {
            draw.current.changeMode('draw_line_string');
            setDrawMode('line');
        } else if (mode === 'polygon') {
            draw.current.changeMode('draw_polygon');
            setDrawMode('polygon');
        }
    };

    const clearDraw = () => {
        if (draw.current) {
            draw.current.deleteAll();
            draw.current.changeMode('simple_select');
        }
        setMeasurement(null);
        setDrawMode('none');
    };

    return { drawMode, startDrawing, clearDraw, measurement };
}