import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
        // ДОБАВИЛИ Math.random(), чтобы ID был уникальным всегда
        const id = Date.now() + Math.random(); 
        
        setToasts((prev) => [...prev, { id, message, type }]);

        // Автоудаление через 5 секунд
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}

            {/* Контейнер для тостов */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle size={20} className="text-brand-green" />,
        error: <X size={20} className="text-brand-red" />,
        warning: <AlertTriangle size={20} className="text-brand-yellow" />,
        info: <Info size={20} className="text-brand-blue" />,
    };

    const borders = {
        success: 'border-brand-green',
        error: 'border-brand-red',
        warning: 'border-brand-yellow',
        info: 'border-brand-blue',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            layout
            className={`pointer-events-auto flex items-center gap-3 min-w-[300px] p-4 rounded-xl glass-panel border-l-4 ${borders[toast.type]} shadow-2xl bg-slate-900/90`}
        >
            {icons[toast.type]}
            <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
            <button onClick={() => onRemove(toast.id)} className="text-slate-500 hover:text-white">
                <X size={16} />
            </button>
        </motion.div>
    );
};