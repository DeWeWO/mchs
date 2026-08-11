import { Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MapSearch({ 
    query, setQuery, 
    results, isSearching, 
    showResults, setShowResults, 
    flyToLocation 
}) {
    return (
        <div className="relative w-80 pointer-events-auto">
            <div className="glass-panel p-1 rounded-xl flex items-center w-full z-20 relative shadow-lg">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Поиск..."
                    className="bg-transparent border-none text-text-main text-sm px-3 py-2.5 w-full focus:outline-none placeholder:text-text-muted font-medium"
                />
                <div className="p-2 text-text-muted">
                    {isSearching ? (
                        <Loader2 size={18} className="animate-spin text-brand-blue" />
                    ) : (
                        <Search size={18} />
                    )}
                </div>
            </div>
            <AnimatePresence>
                {showResults && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 w-full mt-2 glass-panel rounded-xl overflow-hidden shadow-2xl z-10 flex flex-col"
                    >
                        {results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => flyToLocation(item)}
                                className="text-left px-4 py-3 hover:bg-surface-hover text-sm border-b border-border last:border-0 transition-colors"
                            >
                                <div className="text-text-main font-medium truncate">
                                    {item.text_ru || item.text}
                                </div>
                                <div className="text-xs text-text-muted truncate">
                                    {item.place_name_ru || item.place_name}
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}