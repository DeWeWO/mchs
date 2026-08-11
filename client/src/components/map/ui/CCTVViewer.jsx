import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CCTVViewer({ url, onClose }) {
    if (!url) return null;

    return (
        <AnimatePresence>
            <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-panel p-1 rounded-2xl overflow-hidden max-w-2xl w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-black relative aspect-video flex items-center justify-center">
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-2 py-1 rounded text-red-500 text-xs font-bold animate-pulse">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div> REC
                        </div>
                        <img
                            src={url}
                            alt="CCTV"
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white/20"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}