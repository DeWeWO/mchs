import { AlertTriangle } from "lucide-react";

export default function EmergencyButton({ isActive, onToggle }) {
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <button
                onClick={onToggle}
                className={`glass-panel px-6 py-2 rounded-full flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(255,71,87,0.3)] hover:shadow-[0_0_30px_rgba(255,71,87,0.5)] ${
                    isActive
                        ? "bg-brand-red text-white border-brand-red"
                        : "text-text-muted hover:text-text-main border-border"
                }`}
            >
                <AlertTriangle
                    size={20}
                    className={isActive ? "animate-pulse" : ""}
                />
                <span className="font-bold tracking-wide">
                    {isActive ? "РЕЖИМ ЧС АКТИВЕН" : "Режим ЧС"}
                </span>
            </button>
        </div>
    );
}