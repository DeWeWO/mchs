import { toPng } from 'html-to-image';

export function useMapExport(map) {

    const takeScreenshot = async () => {
        if (!map.current) return;

        try {
            const mapCanvas = map.current.getCanvas();
            const mapContainer = map.current.getContainer();

            // 1. Принудительная перерисовка
            map.current.triggerRepaint();

            // 2. Получаем картинку карты (Base64)
            const mapImgUrl = mapCanvas.toDataURL("image/png");

            // 3. ТРЮК: Ставим картинку как фон контейнера
            const originalBackground = mapContainer.style.backgroundImage;
            mapContainer.style.backgroundImage = `url(${mapImgUrl})`;
            mapContainer.style.backgroundSize = '100% 100%';
            mapContainer.style.backgroundRepeat = 'no-repeat';
            mapContainer.style.backgroundPosition = 'center';

            // 4. Скрываем канвас (чтобы библиотека не ругалась)
            mapCanvas.style.visibility = 'hidden';

            // 5. Снимаем контейнер (Фон + HTML маркеры)
            const dataUrl = await toPng(mapContainer, {
                cacheBust: true,
                pixelRatio: 2,
                skipAutoScale: true,
                filter: (node) => node.tagName !== 'CANVAS'
            });

            // 6. Восстанавливаем
            mapCanvas.style.visibility = 'visible';
            mapContainer.style.backgroundImage = originalBackground;

            // 7. Скачиваем
            const link = document.createElement('a');
            link.download = `mchs-map-${new Date().toISOString().slice(0,19).replace(/:/g, "-")}.png`;
            link.href = dataUrl;
            link.click();

        } catch (e) {
            console.error("Ошибка экспорта:", e);
            if (map.current) {
                map.current.getCanvas().style.visibility = 'visible';
                map.current.getContainer().style.backgroundImage = '';
            }
            alert("Не удалось создать скриншот.");
        }
    };

    return { takeScreenshot };
}