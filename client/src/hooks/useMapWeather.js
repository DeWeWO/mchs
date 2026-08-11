import { useState, useEffect, useCallback } from 'react';

const MY_OWM_KEY = import.meta.env.VITE_WEATHER_KEY;

export function useMapWeather(map) {
    const [weatherMode, setWeatherMode] = useState('none');

    const applyWeatherLayer = useCallback((mode) => {
        if (!map.current) return;

        if (map.current.getLayer('weather-layer')) map.current.removeLayer('weather-layer');
        if (map.current.getSource('weather-source')) map.current.removeSource('weather-source');

        if (mode === 'none') {
            setWeatherMode('none');
            return;
        }

        if (!MY_OWM_KEY) {
            console.warn('VITE_WEATHER_KEY is missing. Weather layer is disabled.');
            setWeatherMode('none');
            return;
        }

        try {
            const tileType = mode === 'rain' ? 'precipitation_new' : 'clouds_new';
            map.current.addSource('weather-source', {
                type: 'raster',
                tiles: [`https://tile.openweathermap.org/map/${tileType}/{z}/{x}/{y}.png?appid=${MY_OWM_KEY}`],
                tileSize: 256
            });

            map.current.addLayer({
                id: 'weather-layer',
                type: 'raster',
                source: 'weather-source',
                paint: { 'raster-opacity': 0.8 },
                layout: { visibility: 'visible' }
            });

            setWeatherMode(mode);
            if (map.current.getZoom() > 8) map.current.flyTo({ zoom: 6 });
        } catch (error) {
            console.error(error);
        }
    }, [map]);

    const toggleWeather = () => {
        let nextMode = 'none';
        if (weatherMode === 'none') nextMode = 'rain';
        else if (weatherMode === 'rain') nextMode = 'clouds';
        applyWeatherLayer(nextMode);
    };

    useEffect(() => {
        if (!map.current) return;

        const onStyleLoad = () => {
            if (weatherMode !== 'none') {
                setTimeout(() => applyWeatherLayer(weatherMode), 120);
            }
        };

        map.current.on('style.load', onStyleLoad);
        return () => {
            map.current?.off('style.load', onStyleLoad);
        };
    }, [weatherMode, applyWeatherLayer, map]);

    return { weatherMode, toggleWeather };
}