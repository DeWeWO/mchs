import { useRef, useEffect, useState } from 'react';

export function useMapRotate(map) {
    const rotateRef = useRef(null);
    const [isRotating, setIsRotating] = useState(false);
    
    // Флаг: трогает ли пользователь карту прямо сейчас?
    const isInteracting = useRef(false);

    const startRotation = () => {
        if (!map.current) return;
        
        // Если режим уже включен — выключаем совсем (кнопка)
        if (isRotating) {
            stopRotation();
            return;
        }

        setIsRotating(true);
        
        function rotate() {
            // Вращаем ТОЛЬКО если пользователь НЕ трогает карту
            if (!isInteracting.current && map.current) {
                map.current.easeTo({ 
                    bearing: map.current.getBearing() + 0.15, // Чуть быстрее (0.15)
                    duration: 0,
                    easing: t => t
                });
            }
            // Цикл продолжается вечно, пока включен режим
            rotateRef.current = requestAnimationFrame(rotate);
        }
        rotate();
    };

    const stopRotation = () => {
        if (rotateRef.current) {
            cancelAnimationFrame(rotateRef.current);
            rotateRef.current = null;
        }
        setIsRotating(false);
    };

    // Слушатели событий мыши/пальца
    useEffect(() => {
        if (!map.current) return;
        
        const onDown = () => { isInteracting.current = true; };
        const onUp = () => { isInteracting.current = false; };

        // Когда нажали кнопку мыши или коснулись экрана
        map.current.on('mousedown', onDown);
        map.current.on('touchstart', onDown);
        map.current.on('dragstart', onDown); // На всякий случай

        // Когда отпустили
        map.current.on('mouseup', onUp);
        map.current.on('touchend', onUp);
        map.current.on('dragend', onUp);

        // Очистка при выходе
        return () => {
            if (map.current) {
                map.current.off('mousedown', onDown);
                map.current.off('touchstart', onDown);
                map.current.off('dragstart', onDown);
                map.current.off('mouseup', onUp);
                map.current.off('touchend', onUp);
                map.current.off('dragend', onUp);
            }
            if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
        };
    }, []);

    return { isRotating, toggleRotation: startRotation };
}