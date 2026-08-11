import { X, Building2, User, Layers, AlertTriangle, CheckCircle, Activity, Navigation, Siren } from "lucide-react";
import { motion } from "framer-motion";

export default function BuildingPanel({ building, sensors, onClose, onBuildRoute, onDispatch }) {
    if (!building) return null;

    // Группируем датчики по этажам
    const sensorsByFloor = sensors.reduce((acc, sensor) => {
        const floor = sensor.floor || 1;
        if (!acc[floor]) acc[floor] = [];
        acc[floor].push(sensor);
        return acc;
    }, {});

    const floors = Object.keys(sensorsByFloor).sort((a, b) => b - a);

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-0 right-0 h-full w-[450px] glass-panel border-l border-white/10 z-30 flex flex-col shadow-2xl"
        >
            {/* ШАПКА ЗДАНИЯ */}
            <div className="p-6 border-b border-border bg-surface/50 backdrop-blur-md">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-brand-blue/20 text-brand-blue border border-brand-blue/30 text-xs font-bold uppercase">
                        <Building2 size={14} /> Объект
                    </div>
                    <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-text-main leading-tight">{building.title}</h2>
                <p className="text-sm text-text-muted mt-1">{building.address}</p>
                
                {/* КНОПКИ ДЕЙСТВИЙ (НОВОЕ) */}
                <div className="grid grid-cols-2 gap-3 mt-5">
                    <button 
                        onClick={() => onBuildRoute(building)}
                        className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Navigation size={16} /> Маршрут
                    </button>
                    <button 
                        onClick={() => onDispatch(building)}
                        className="flex items-center justify-center gap-2 bg-brand-red hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-900/20"
                    >
                        <Siren size={16} /> Вызвать группу
                    </button>
                </div>
            </div>

            {/* СТАТИСТИКА */}
            <div className="px-6 py-3 border-b border-border bg-surface/30 flex justify-between text-xs text-text-muted">
                <div className="flex items-center gap-1"><Layers size={14} /> {building.floors} этажей</div>
                <div className="flex items-center gap-1"><User size={14} /> {building.operator}</div>
                <div className="flex items-center gap-1"><Activity size={14} /> {sensors.length} датчиков</div>
            </div>

            {/* СПИСОК ЭТАЖЕЙ */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {floors.map(floorNum => (
                    <div key={floorNum} className="glass-panel p-4 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
                            <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Этаж {floorNum}</span>
                            {sensorsByFloor[floorNum].some(s => (s.status || '').toUpperCase() === 'DANGER') ? (
                                <span className="text-xs font-bold text-brand-red animate-pulse flex items-center gap-1"><AlertTriangle size={12} /> ТРЕВОГА</span>
                            ) : (
                                <span className="text-xs font-bold text-brand-green flex items-center gap-1"><CheckCircle size={12} /> Норма</span>
                            )}
                        </div>

                        <div className="space-y-2">
                            {sensorsByFloor[floorNum].map(sensor => (
                                <div key={sensor.id} className="flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-hover transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <StatusDot status={sensor.status} />
                                        <div>
                                            <div className="text-sm font-medium text-text-main">{sensor.title}</div>
                                            <div className="text-xs text-text-muted uppercase">{sensor.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${getStatusColorText(sensor.status)}`}>{sensor.value}</div>
                                        <div className="text-[10px] text-text-muted">ID: {sensor.id}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

function StatusDot({ status }) {
    const normalized = (status || '').toUpperCase();
    const color = normalized === 'DANGER' ? 'bg-brand-red shadow-[0_0_8px_#ff4757]' : normalized === 'WARNING' ? 'bg-brand-yellow' : 'bg-brand-green';
    return <div className={`w-2.5 h-2.5 rounded-full ${color}`} />;
}
function getStatusColorText(status) {
    const normalized = (status || '').toUpperCase();
    return normalized === 'DANGER' ? 'text-brand-red' : normalized === 'WARNING' ? 'text-brand-yellow' : 'text-text-main';
}