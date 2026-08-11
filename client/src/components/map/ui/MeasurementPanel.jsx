import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MeasurementPanel({ measurement, onClear }) {
    if (!measurement) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="absolute top-20 left-1/2 -translate-x-1/2 z-20 glass-panel px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl border border-brand-blue/30 pointer-events-auto"
            >
                <div>
                    <div className="text-xs text-brand-blue font-bold uppercase tracking-wider">
                        {measurement.type}
                    </div>
                    <div className="text-xl font-mono font-bold text-text-main">
                        {measurement.value}
                    </div>
                    {measurement.subValue && (
                        <div className="text-xs text-text-muted">
                            {measurement.subValue}
                        </div>
                    )}
                </div>
                <button
                    onClick={onClear}
                    className="p-2 bg-surface-hover hover:bg-border rounded-full text-text-muted hover:text-text-main transition-colors"
                >
                    <Trash2 size={18} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}