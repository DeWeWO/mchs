import { useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Siren, ShieldAlert, Flame, Mountain, Wind } from "lucide-react";

// UI Components
import MapSearch from "./ui/MapSearch";
import MapToolbar from "./ui/MapToolbar";
import RoutePanel from "./ui/RoutePanel";
import MeasurementPanel from "./ui/MeasurementPanel";
import IncidentModal from "./ui/IncidentModal";
import CCTVViewer from "./ui/CCTVViewer";
import EmergencyButton from "./ui/EmergencyButton";
import SensorInfoPanel from "./SensorInfoPanel";
import BuildingPanel from "./BuildingPanel";

// Hooks
import { useMapInit } from "../../hooks/useMapInit";
import { useMapWeather } from "../../hooks/useMapWeather";
import { useMapRouting } from "../../hooks/useMapRouting";
import { useMapIncidents } from "../../hooks/useMapIncidents";
import { useMapDraw } from "../../hooks/useMapDraw";
import { useMapSearch } from "../../hooks/useMapSearch";
import { useMapExport } from "../../hooks/useMapExport";
import { useMapRotate } from "../../hooks/useMapRotate";

export default function MapLibreView() {
  const mapContainer = useRef(null);

  // 1. Инициализация карты и данных с Бэкенда
  const {
    map, isLoaded, mapStyle, toggleMapStyle,
    selectedSensor, setSelectedSensor,
    selectedBuilding, setSelectedBuilding,
    realSensors,
    cctvUrl, setCctvUrl,
    is3DEnabled, toggle3D,
    isTrafficEnabled, toggleTraffic,
    showBuildings, toggleBuildings,
    showSensors, toggleSensors,
    sensorAlarm, setSensorAlarm
  } = useMapInit(mapContainer);

  // 2. Подключение остальных инструментов
  const { takeScreenshot } = useMapExport(map);
  const { weatherMode, toggleWeather } = useMapWeather(map);
  const { isRotating, toggleRotation } = useMapRotate(map);
  const { routeInfo, routeSteps, travelMode, buildRoute, clearRoute, isFireMode, setIsFireMode, buildFireCoverage } = useMapRouting(map);
  const { isEmergency, toggleEmergency, isAddMode, setIsAddMode, isInfoMode, setIsInfoMode, newIncidentCoords, setNewIncidentCoords, saveIncident } = useMapIncidents(map, isFireMode, buildFireCoverage);
  const { drawMode, startDrawing, clearDraw, measurement } = useMapDraw(map);
  const { query, setQuery, results, isSearching, showResults, setShowResults, flyToLocation } = useMapSearch(map);

  const handleDispatch = (building) => {
    alert(`Бригада направлена на объект: ${building.title}`);
  };

  // Определяем тип тревоги для UI
  const getAlarmInfo = (alarm) => {
    if (!alarm) return {};
    if (alarm.type === 'FIRE') return { icon: Flame, title: 'ПОЖАР ОБНАРУЖЕН!', subtitle: 'Датчик зафиксировал возгорание' };
    if (alarm.type === 'EARTHQUAKE') return { icon: Mountain, title: 'ЗЕМЛЕТРЯСЕНИЕ!', subtitle: 'Зафиксирована сейсмическая активность' };
    return { icon: Wind, title: 'УТЕЧКА ГАЗА!', subtitle: 'Превышение допустимой концентрации' };
  };

  const alarmInfo = getAlarmInfo(sensorAlarm);
  const AlarmIcon = alarmInfo.icon || Siren;
  const MotionDiv = motion.div;
  const selectedBuildingSensors = useMemo(
    () => (selectedBuilding ? realSensors.filter((s) => s.buildingId === selectedBuilding.id) : []),
    [realSensors, selectedBuilding]
  );

  return (
    <div className="relative w-full h-full group overflow-hidden bg-bg-app">
      {/* Контейнер карты */}
      <div ref={mapContainer} className="absolute inset-0 z-0 outline-none" />

      {/* Лоадер */}
      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <span className="text-brand-blue text-sm font-medium tracking-wide">Загрузка ГИС...</span>
          </div>
        </div>
      )}

      {/* ЛЕВЫЙ ИНТЕРФЕЙС (Поиск и Тулбар) */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
        <MapSearch
          query={query} setQuery={setQuery} results={results}
          isSearching={isSearching} showResults={showResults}
          setShowResults={setShowResults} flyToLocation={flyToLocation}
        />
        <div className="pointer-events-auto">
          <MapToolbar
            mapStyle={mapStyle} toggleMapStyle={toggleMapStyle}
            is3DEnabled={is3DEnabled} toggle3D={toggle3D}
            isTrafficEnabled={isTrafficEnabled} toggleTraffic={toggleTraffic}
            weatherMode={weatherMode} toggleWeather={toggleWeather}
            drawMode={drawMode} startDrawing={startDrawing}
            isFireMode={isFireMode} setIsFireMode={setIsFireMode}
            isAddMode={isAddMode} setIsAddMode={setIsAddMode}
            isInfoMode={isInfoMode} setIsInfoMode={setIsInfoMode}
            takeScreenshot={takeScreenshot}
            isRotating={isRotating} toggleRotation={toggleRotation}
            showBuildings={showBuildings} toggleBuildings={toggleBuildings}
            showSensors={showSensors} toggleSensors={toggleSensors}
          />
        </div>
      </div>

      {/* ЦЕНТРАЛЬНЫЕ КНОПКИ */}
      <EmergencyButton isActive={isEmergency} onToggle={toggleEmergency} />
      <MeasurementPanel measurement={measurement} onClear={clearDraw} />

      {/* ПАНЕЛИ И МОДАЛКИ */}
      <RoutePanel
        routeInfo={routeInfo} routeSteps={routeSteps}
        travelMode={travelMode} buildRoute={buildRoute} clearRoute={clearRoute}
      />
      <IncidentModal
        isOpen={!!newIncidentCoords}
        onClose={() => setNewIncidentCoords(null)}
        onSave={saveIncident}
      />
      <CCTVViewer url={cctvUrl} onClose={() => setCctvUrl(null)} />

      {/* БОКОВЫЕ ПАНЕЛИ ОБЪЕКТОВ */}
      <AnimatePresence>
        {selectedSensor && (
          <SensorInfoPanel
            sensor={selectedSensor}
            onClose={() => setSelectedSensor(null)}
            onBuildRoute={(s) => buildRoute(s, "driving-car")}
          />
        )}

        {selectedBuilding && (
          <BuildingPanel
            building={selectedBuilding}
            sensors={selectedBuildingSensors}
            onClose={() => setSelectedBuilding(null)}
            onBuildRoute={(b) => buildRoute(b, "driving-car")}
            onDispatch={handleDispatch}
          />
        )}
      </AnimatePresence>

      {/* 🔥 ТРЕВОГА ОТ ДАТЧИКА ESP32 🔥 */}
      <AnimatePresence>
        {sensorAlarm && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-red-900/30 backdrop-blur-sm flex items-center justify-center p-6 pointer-events-none"
            style={{ border: '20px solid rgba(220,38,38,0.3)', animation: 'pulse 1.5s infinite' }}
          >
            <MotionDiv
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-black/90 border-2 border-red-500 p-10 rounded-3xl text-center max-w-2xl pointer-events-auto relative overflow-hidden"
              style={{ boxShadow: '0 0 150px rgba(220,38,38,0.6)' }}
            >
              {/* Полосы опасности */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #ff0000 25%, transparent 25%, transparent 50%, #ff0000 50%, #ff0000 75%, transparent 75%, transparent)', backgroundSize: '40px 40px' }}></div>

              <div className="relative z-10">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8"
                  style={{
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                    animation: 'bounce 1s infinite',
                    boxShadow: '0 10px 25px rgba(220,38,38,0.5)',
                    outline: '4px solid rgba(127,29,29,0.8)',
                    outlineOffset: '8px'
                  }}
                >
                  <AlarmIcon size={56} color="white" />
                </div>

                <h2 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '-0.05em', textShadow: '0 4px 6px rgba(0,0,0,0.5)' }}>
                  {alarmInfo.title}
                </h2>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {alarmInfo.subtitle}
                </h3>

                <div style={{ background: 'rgba(69,10,10,0.5)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '2rem' }}>
                  <p style={{ color: '#fecaca', fontSize: '1.1rem', fontWeight: 500 }}>
                    {sensorAlarm.message}
                  </p>
                  <p style={{ color: 'rgba(248,113,113,0.7)', fontSize: '0.875rem', marginTop: '0.75rem', fontFamily: 'monospace' }}>
                    Датчик: {sensorAlarm.id} | Время: {new Date().toLocaleTimeString()}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setSensorAlarm(null)}
                    style={{ padding: '0.75rem 2rem', borderRadius: '0.75rem', background: '#1e293b', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
                    onMouseOver={e => e.target.style.background = '#334155'}
                    onMouseOut={e => e.target.style.background = '#1e293b'}
                  >
                    Принять к сведению
                  </button>
                  <button
                    onClick={() => {
                      alert("Бригада МЧС направлена на место! 🚒");
                      setSensorAlarm(null);
                    }}
                    style={{ padding: '0.75rem 2rem', borderRadius: '0.75rem', background: '#dc2626', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(220,38,38,0.4)', transition: 'all 0.2s' }}
                    onMouseOver={e => e.target.style.background = '#ef4444'}
                    onMouseOut={e => e.target.style.background = '#dc2626'}
                  >
                    <ShieldAlert size={20} />
                    ОТПРАВИТЬ БРИГАДУ
                  </button>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
