import { useState } from "react";
import { AlertOctagon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function IncidentModal({ isOpen, onClose, onSave }) {
    const [type, setType] = useState("Пожар");
    const [desc, setDesc] = useState("");

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-panel p-6 rounded-2xl w-96 border border-border"
                >
                    <h3 className="text-xl font-bold text-text-main mb-4 flex items-center gap-2">
                        <AlertOctagon className="text-brand-red" /> Новый инцидент
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-text-muted mb-1">Тип</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"
                            >
                                <option value="Пожар">🔥 Пожар</option>
                                <option value="ДТП">🚗 ДТП</option>
                                <option value="Подтопление">💧 Подтопление</option>
                                <option value="Утечка газа">☁️ Утечка газа</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-text-muted mb-1">Описание</label>
                            <textarea
                                rows="3"
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg p-2 text-text-main outline-none focus:border-brand-blue"
                                placeholder="Детали происшествия..."
                            ></textarea>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 rounded-lg bg-surface hover:bg-surface-hover text-text-muted transition-colors"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={() => onSave(type, desc)}
                                className="flex-1 py-2 rounded-lg bg-brand-red text-white hover:bg-red-600 transition-colors font-bold shadow-lg shadow-red-900/50"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}