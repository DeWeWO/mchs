import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../config/env';

const getAuthHeader = () => {
    try {
        const stored = JSON.parse(localStorage.getItem('mchs_user'));
        return stored?.token ? { Authorization: `Bearer ${stored.token}` } : {};
    } catch {
        return {};
    }
};

export function useMapSearch(map) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const abortRef = useRef(null);
    const requestIdRef = useRef(0);

    const searchPlaces = useCallback(async (searchQuery) => {
        const trimmed = searchQuery.trim();
        if (trimmed.length <= 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        const requestId = ++requestIdRef.current;

        setIsSearching(true);

        try {
            const url = `${API_URL}/geocoding/search?q=${encodeURIComponent(trimmed)}`;
            const response = await fetch(url, { headers: getAuthHeader(), signal: controller.signal });
            if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);

            const data = await response.json();
            if (controller.signal.aborted || requestId !== requestIdRef.current) return;

            setResults(data.features || []);
            setShowResults(true);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Search error:', error);
            }
        } finally {
            if (!controller.signal.aborted && requestId === requestIdRef.current) {
                setIsSearching(false);
            }
        }
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            void searchPlaces(query);
        }, 500);

        return () => clearTimeout(debounce);
    }, [query, searchPlaces]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const flyToLocation = (feature) => {
        if (!map.current) return;

        const [lng, lat] = feature.center;

        if (feature.bbox) {
            map.current.fitBounds(
                [[feature.bbox[0], feature.bbox[1]], [feature.bbox[2], feature.bbox[3]]],
                { padding: 50, maxZoom: 16 }
            );
        } else {
            map.current.flyTo({
                center: [lng, lat],
                zoom: 16,
                speed: 1.5
            });
        }

        setShowResults(false);
        setQuery(feature.place_name_ru || feature.place_name || '');
    };

    return {
        query,
        setQuery,
        results,
        isSearching,
        showResults,
        setShowResults,
        flyToLocation
    };
}
