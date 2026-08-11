import { Navigation, X, Car, Footprints, CornerUpRight, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoutePanel({ 
    routeInfo, routeSteps, 
    travelMode, buildRoute, clearRoute 
}) {
    if (!routeInfo) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-6 left-6 z-20 glass-panel rounded-xl w-80 flex flex-col max-h-[60vh] shadow-2xl border border-border pointer-events-auto"
            >
                <div className="p-4 border-b border-border bg-surface-hover rounded-t-xl shrink-0">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-text-main flex items-center gap-2">
                            <Navigation size={18} className="text-brand-blue" /> Навигация
                        </h3>
                        <button onClick={clearRoute} className="hover:bg-surface p-1 rounded">
                            <X size={16} className="text-text-muted hover:text-text-main" />
                        </button>
                    </div>
                    <div className="flex bg-surface p-1 rounded-lg mb-3">
                        <button
                            onClick={() => buildRoute(routeInfo.sensor, "driving-car")}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-all ${
                                travelMode === "driving-car" ? "bg-brand-blue text-white shadow" : "text-text-muted hover:text-text-main"
                            }`}
                        >
                            <Car size={16} /> Авто
                        </button>
                        <button
                            onClick={() => buildRoute(routeInfo.sensor, "foot-walking")}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm transition-all ${
                                travelMode === "foot-walking" ? "bg-brand-green text-white shadow" : "text-text-muted hover:text-text-main"
                            }`}
                        >
                            <Footprints size={16} /> Пешком
                        </button>
                    </div>
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-xs text-text-muted">Цель</div>
                            <div className="text-sm font-medium text-text-main truncate w-40">
                                {routeInfo.target}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-mono font-bold text-text-main leading-none">
                                {routeInfo.duration}
                                <span className="text-sm font-sans font-normal text-text-muted ml-1">мин</span>
                            </div>
                            <div className="text-xs text-brand-blue font-bold">
                                {routeInfo.distance} км
                            </div>
                        </div>
                    </div>
                </div>
                <div className="overflow-y-auto p-2 space-y-1 bg-surface/50 backdrop-blur-sm flex-1 custom-scrollbar">
                    {routeSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors border-b border-border last:border-0">
                            <div className="mt-1 text-text-muted"><CornerUpRight size={20} /></div>
                            <div>
                                <div className="text-sm text-text-main leading-snug">{step.instruction}</div>
                                <div className="text-xs text-text-muted mt-1 font-mono">{step.distance} м</div>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-3 p-3 text-brand-green">
                        <MapPin size={20} />
                        <div className="text-sm font-bold">Вы прибыли в пункт назначения</div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}