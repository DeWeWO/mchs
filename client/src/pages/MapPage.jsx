import MapLibreView from '../components/map/MapLibreView';

export default function MapPage() {
    // Важно: h-full w-full, чтобы занять все пространство внутри Outlet
    return (
        <div className="w-full h-full relative">
            <MapLibreView />
        </div>
    );
}