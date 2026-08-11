import { 
    Layers, Map as MapIcon, Mountain, TrafficCone, 
    Cloud, CloudRain, Ruler, Square, Truck, 
    PlusCircle, MapPin, Camera, RefreshCw,
    Building2, Activity // <--- Новые иконки
} from "lucide-react";

export default function MapToolbar({ 
    mapStyle, toggleMapStyle,
    is3DEnabled, toggle3D,
    isTrafficEnabled, toggleTraffic,
    weatherMode, toggleWeather,
    drawMode, startDrawing,
    isFireMode, setIsFireMode, setIsAddMode, setIsInfoMode,
    isAddMode, isInfoMode,
    takeScreenshot,
    isRotating, toggleRotation,
    showBuildings, toggleBuildings, // <--- Пропсы
    showSensors, toggleSensors      // <--- Пропсы
}) {
    
    const handleModeSwitch = (modeType, setter) => {
        if (modeType !== 'add') setIsAddMode(false);
        if (modeType !== 'fire') setIsFireMode(false);
        if (modeType !== 'info') setIsInfoMode(false);
        if (setter) setter(prev => !prev);
    };

    return (
        <div className="glass-panel p-2 rounded-xl flex flex-col gap-1 w-12 transition-all duration-300 overflow-hidden hover:w-48 group/toolbar shadow-2xl">
            {/* ГРУППА: СЛОИ ОБЪЕКТОВ (НОВОЕ) */}
            <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider opacity-0 group-hover/toolbar:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap">
                Объекты
            </div>
            <ToolbarButton
                icon={Building2}
                label={showBuildings ? "Скрыть здания" : "Показать здания"}
                active={showBuildings}
                onClick={toggleBuildings}
                color="blue"
            />
            <ToolbarButton
                icon={Activity}
                label={showSensors ? "Скрыть датчики" : "Показать датчики"}
                active={showSensors}
                onClick={toggleSensors}
                color="green"
            />
            
            <div className="h-px bg-border w-full my-1" />

            {/* ГРУППА: ВИД */}
            <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider opacity-0 group-hover/toolbar:opacity-100 transition-opacity duration-300 delay-75 whitespace-nowrap">
                Вид
            </div>
            {/* ... ОСТАЛЬНЫЕ КНОПКИ КАК БЫЛИ ... */}
            <ToolbarButton icon={MapIcon} label={mapStyle === "dark" ? "Спутник" : "Схема"} active={mapStyle === "satellite"} onClick={toggleMapStyle} />
            <ToolbarButton icon={Mountain} label="3D Рельеф" active={is3DEnabled} onClick={toggle3D} />
            <ToolbarButton icon={TrafficCone} label="Пробки" active={isTrafficEnabled} onClick={toggleTraffic} />
            <ToolbarButton icon={weatherMode === "rain" ? CloudRain : Cloud} label={weatherMode === "none" ? "Погода" : weatherMode === "rain" ? "Осадки" : "Облака"} active={weatherMode !== "none"} onClick={toggleWeather} />

            <div className="h-px bg-border w-full my-1" />

            {/* ИНСТРУМЕНТЫ */}
            <ToolbarButton icon={Ruler} label="Линейка" active={drawMode === "line"} onClick={() => startDrawing("line")} />
            <ToolbarButton icon={Square} label="Площадь" active={drawMode === "polygon"} onClick={() => startDrawing("polygon")} />
            <ToolbarButton icon={Truck} label="Пожарная (5м)" active={isFireMode} onClick={() => handleModeSwitch('fire', setIsFireMode)} color="orange" />

            <div className="h-px bg-border w-full my-1" />

            {/* ДЕЙСТВИЯ */}
            <ToolbarButton icon={PlusCircle} label="Инцидент" active={isAddMode} onClick={() => handleModeSwitch('add', setIsAddMode)} color="blue" />
            <ToolbarButton icon={MapPin} label="Узнать адрес" active={isInfoMode} onClick={() => handleModeSwitch('info', setIsInfoMode)} color="green" />
            <ToolbarButton icon={Camera} label="Снимок" onClick={takeScreenshot} />
            <ToolbarButton icon={RefreshCw} label="Авто-обзор" active={isRotating} onClick={toggleRotation} spin={isRotating} />
        </div>
    );
}

function ToolbarButton({ icon: Icon, label, active, onClick, color = "brand-blue", spin = false }) {
    const activeBg = color === "orange" ? "bg-orange-500/20" : color === "red" ? "bg-red-500/20" : color === "green" ? "bg-green-500/20" : "bg-surface-hover";
    const activeText = color === "orange" ? "text-orange-400" : color === "red" ? "text-red-400" : color === "green" ? "text-brand-green" : active ? "text-brand-blue" : "text-text-muted";

    return (
        <button onClick={onClick} className={`flex items-center gap-3 p-2 rounded-lg whitespace-nowrap transition-all duration-200 ${active ? activeBg : "hover:bg-surface-hover"} ${activeText} hover:text-text-main`}>
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Icon size={20} className={spin ? "animate-spin" : ""} />
            </div>
            <span className="opacity-0 group-hover/toolbar:opacity-100 transition-opacity duration-300 text-sm font-medium delay-75">{label}</span>
            {active && <div className={`ml-auto w-1.5 h-1.5 rounded-full ${color === "orange" ? "bg-orange-400" : color === "green" ? "bg-brand-green" : "bg-brand-blue"} opacity-0 group-hover/toolbar:opacity-100 transition-opacity duration-300`} />}
        </button>
    );
}